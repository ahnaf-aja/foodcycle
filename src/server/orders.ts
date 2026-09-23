import "server-only";

import {
  FoodStatus,
  NotificationType,
  OrderPurpose,
  OrderStatus,
  Prisma,
  DonationStatus,
  type FulfillmentType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { ORDER_TRANSITIONS, estimateWeightKg } from "@/lib/domain";
import { createNotifications, type NotificationInput } from "./notifications";
import { nextPreferenceScores } from "@/lib/recommendation";

/**
 * Orders — the transactional heart of FoodCycle.
 *
 * The checkout is the one place where correctness matters more than anything
 * else, because it is the only operation that can lose money or oversell food.
 * It runs as a single interactive transaction that:
 *
 *   1. Re-reads every listing inside the transaction (never trusting the cart).
 *   2. Decrements stock with a conditional update — `WHERE stock >= qty` — so
 *      two customers racing for the last portion cannot both succeed. Postgres
 *      row locks serialise the two statements; the loser's WHERE matches
 *      nothing and its `count` comes back 0, which aborts the whole checkout.
 *   3. Creates the order, its lines, the donation if any, and the notifications
 *      for every party, all-or-nothing.
 *
 * Prices and grades are copied onto the order lines at purchase time, so a
 * restaurant editing a listing later never rewrites someone's history.
 */

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type CheckoutInput = {
  purpose: OrderPurpose;
  fulfillment: FulfillmentType;
  institutionId?: string;
  deliveryAddress?: string;
  notes?: string;
};

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  total: number;
  restaurantName: string;
};

/**
 * Turn the customer's cart into one or more orders.
 *
 * A cart may hold food from several restaurants, and an order belongs to
 * exactly one restaurant — so checkout produces one order per restaurant.
 * That is also the truthful model for donations: each restaurant donates the
 * food it actually prepared.
 */
export async function placeOrder(
  userId: string,
  input: CheckoutInput,
): Promise<{ orders: PlacedOrder[]; donationIds: string[]; institutionName?: string }> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          foodItemId: true,
          quantity: true,
          foodItem: {
            select: {
              id: true,
              name: true,
              category: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new CheckoutError("Your cart is empty.");
  }

  // Validate the donation target before opening a transaction.
  let institution: { id: string; name: string; ownerId: string } | null = null;
  if (input.purpose === OrderPurpose.DONATION) {
    if (!input.institutionId) {
      throw new CheckoutError("Choose an institution to receive the donation.");
    }
    institution = await prisma.socialInstitution.findUnique({
      where: { id: input.institutionId },
      select: { id: true, name: true, ownerId: true },
    });
    if (!institution) throw new CheckoutError("That institution could not be found.");
  }

  if (input.fulfillment === "DELIVERY" && !input.deliveryAddress?.trim()) {
    throw new CheckoutError("Enter a delivery address.");
  }

  // Group the cart by restaurant — one order per restaurant.
  const byRestaurant = new Map<string, typeof cart.items>();
  for (const item of cart.items) {
    const id = item.foodItem.restaurant.id;
    const list = byRestaurant.get(id) ?? [];
    list.push(item);
    byRestaurant.set(id, list);
  }

  const placed = await prisma.$transaction(async (tx) => {
    const orders: PlacedOrder[] = [];
    const donationIds: string[] = [];
    const notifications: NotificationInput[] = [];
    const purchasedByCategory = new Map<string, number>();

    for (const [, items] of byRestaurant) {
      const restaurant = items[0].foodItem.restaurant;

      // ---------------------------------------------------------------------
      // 1. Claim stock. This is the guard that makes overselling impossible.
      // ---------------------------------------------------------------------
      const lines: {
        foodItemId: string;
        name: string;
        category: string;
        quantity: number;
        unitPrice: number;
        unitOriginalPrice: number;
        grade: Prisma.FoodItemGetPayload<object>["grade"];
      }[] = [];

      for (const item of items) {
        const claimed = await tx.foodItem.updateMany({
          where: {
            id: item.foodItemId,
            status: FoodStatus.AVAILABLE,
            stock: { gte: item.quantity },
            pickupDeadline: { gt: new Date() },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (claimed.count === 0) {
          // Another customer took the last portion between page load and now.
          const current = await tx.foodItem.findUnique({
            where: { id: item.foodItemId },
            select: { stock: true, status: true, pickupDeadline: true },
          });

          if (!current || current.pickupDeadline.getTime() <= Date.now()) {
            throw new CheckoutError(
              `The pickup window for ${item.foodItem.name} has closed. Please remove it from your cart.`,
            );
          }
          if (current.status !== FoodStatus.AVAILABLE || current.stock <= 0) {
            throw new CheckoutError(
              `${item.foodItem.name} just sold out. Please remove it from your cart.`,
            );
          }
          throw new CheckoutError(
            `Only ${current.stock} portion${current.stock === 1 ? "" : "s"} of ${item.foodItem.name} left. Please reduce the quantity.`,
          );
        }

        // Read the price AFTER claiming, inside the transaction, so the figure
        // we charge is the one the row actually holds.
        const fresh = await tx.foodItem.findUniqueOrThrow({
          where: { id: item.foodItemId },
          select: {
            id: true,
            name: true,
            category: true,
            originalPrice: true,
            discountPrice: true,
            grade: true,
            stock: true,
            restaurantId: true,
          },
        });

        lines.push({
          foodItemId: fresh.id,
          name: fresh.name,
          category: fresh.category,
          quantity: item.quantity,
          unitPrice: fresh.discountPrice,
          unitOriginalPrice: fresh.originalPrice,
          grade: fresh.grade,
        });

        purchasedByCategory.set(
          fresh.category,
          (purchasedByCategory.get(fresh.category) ?? 0) + item.quantity,
        );

        // A listing that just hit zero should read as sold out, not available.
        if (fresh.stock === 0) {
          await tx.foodItem.update({
            where: { id: fresh.id },
            data: { status: FoodStatus.SOLD_OUT },
          });
        }
      }

      // ---------------------------------------------------------------------
      // 2. Totals, computed from the claimed rows.
      // ---------------------------------------------------------------------
      const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      const originalTotal = lines.reduce(
        (sum, l) => sum + l.unitOriginalPrice * l.quantity,
        0,
      );
      const savings = originalTotal - subtotal;
      const isDonation = input.purpose === OrderPurpose.DONATION;

      // ---------------------------------------------------------------------
      // 3. The order itself.
      // ---------------------------------------------------------------------
      const order = await tx.order.create({
        data: {
          orderNumber: await uniqueOrderNumber(tx),
          customerId: userId,
          restaurantId: restaurant.id,
          status: OrderStatus.PENDING,
          purpose: input.purpose,
          fulfillment: input.fulfillment,
          subtotal,
          savings,
          deliveryFee: 0,
          total: subtotal,
          deliveryAddress:
            input.fulfillment === "DELIVERY" ? input.deliveryAddress?.trim() : null,
          notes: input.notes?.trim() || null,
          items: {
            create: lines.map((l) => ({
              foodItemId: l.foodItemId,
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitOriginalPrice: l.unitOriginalPrice,
              grade: l.grade,
            })),
          },
        },
        select: { id: true, orderNumber: true, total: true },
      });

      orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        restaurantName: restaurant.name,
      });

      // ---------------------------------------------------------------------
      // 4. The donation, when the customer chose to give it away.
      // ---------------------------------------------------------------------
      if (isDonation && institution) {
        const meals = lines.reduce((sum, l) => sum + l.quantity, 0);

        const donation = await tx.donation.create({
          data: {
            orderId: order.id,
            donorId: userId,
            restaurantId: restaurant.id,
            institutionId: institution.id,
            status: DonationStatus.CREATED,
            meals,
            weightKg: estimateWeightKg(meals),
            notes: input.notes?.trim() || null,
          },
          select: { id: true },
        });

        donationIds.push(donation.id);

        notifications.push({
          userId: institution.ownerId,
          type: NotificationType.DONATION_CREATED,
          title: "Incoming donation",
          body: `A donor is sending ${meals} portion${meals === 1 ? "" : "s"} from ${restaurant.name}.`,
          link: "/institution/donations",
        });
      }

      // ---------------------------------------------------------------------
      // 5. Tell the restaurant.
      // ---------------------------------------------------------------------
      const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);
      notifications.push({
        userId: restaurant.ownerId,
        type: isDonation ? NotificationType.DONATION_CREATED : NotificationType.ORDER_PLACED,
        title: isDonation ? "New donation order" : "New order received",
        body: isDonation
          ? `${totalItems} portion${totalItems === 1 ? "" : "s"} to donate — ${order.orderNumber}.`
          : `${totalItems} item${totalItems === 1 ? "" : "s"} ordered — ${order.orderNumber}.`,
        link: "/restaurant/orders",
      });
    }

    // -----------------------------------------------------------------------
    // 6. Update the customer's taste profile, so recommendations improve.
    // -----------------------------------------------------------------------
    const existingPreferences = await tx.userPreference.findMany({
      where: { userId },
      select: { category: true, score: true },
    });

    const merged = nextPreferenceScores(
      existingPreferences,
      [...purchasedByCategory.entries()].map(([category, quantity]) => ({
        category,
        quantity,
      })),
    );

    for (const preference of merged) {
      await tx.userPreference.upsert({
        where: {
          userId_category: { userId, category: preference.category },
        },
        create: { userId, category: preference.category, score: preference.score },
        update: { score: preference.score },
      });
    }

    // -----------------------------------------------------------------------
    // 7. Empty the cart, in the same transaction as the order.
    // -----------------------------------------------------------------------
    await tx.cartItem.deleteMany({ where: { cart: { userId } } });

    await createNotifications(notifications, tx);

    return { orders, donationIds };
  }, {
    // Give a busy checkout room to wait for a row lock rather than failing fast.
    timeout: 15_000,
    maxWait: 10_000,
  });

  return {
    orders: placed.orders,
    donationIds: placed.donationIds,
    institutionName: institution?.name,
  };
}

/**
 * Order numbers are short and human-readable, so a collision is possible.
 * Retry a few times rather than surfacing a unique-constraint error to a
 * customer who has just paid.
 */
async function uniqueOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateOrderNumber();
    const clash = await tx.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  // Fall back to something guaranteed unique rather than looping forever.
  return `FC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ===========================================================================
// Reads
// ===========================================================================

const ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  purpose: true,
  fulfillment: true,
  subtotal: true,
  savings: true,
  total: true,
  notes: true,
  createdAt: true,
  confirmedAt: true,
  preparingAt: true,
  readyAt: true,
  onDeliveryAt: true,
  completedAt: true,
  cancelledAt: true,
  restaurant: { select: { id: true, name: true, slug: true, city: true } },
  items: {
    select: {
      id: true,
      name: true,
      quantity: true,
      unitPrice: true,
      unitOriginalPrice: true,
      grade: true,
      foodItemId: true,
      foodItem: { select: { image: true, category: true, pickupDeadline: true } },
    },
  },
  donation: {
    select: {
      id: true,
      status: true,
      meals: true,
      weightKg: true,
      deliveredAt: true,
      receivedAt: true,
      receivedBy: true,
      institution: { select: { id: true, name: true, slug: true, city: true } },
    },
  },
  _count: { select: { reviews: true } },
} as const;

export async function getCustomerOrders(
  userId: string,
  options: { status?: OrderStatus[]; limit?: number } = {},
) {
  return prisma.order.findMany({
    where: {
      customerId: userId,
      ...(options.status?.length ? { status: { in: options.status } } : {}),
    },
    select: ORDER_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
}

/**
 * A single order, scoped to its owner.
 *
 * Reading through `customerId` rather than fetching by id and checking after
 * means another customer's order is indistinguishable from a missing one.
 */
export async function getCustomerOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    select: ORDER_LIST_SELECT,
  });
}

/** Orders for the restaurant dashboard, newest first. */
export async function getRestaurantOrders(
  restaurantId: string,
  options: { status?: OrderStatus[]; limit?: number } = {},
) {
  return prisma.order.findMany({
    where: {
      restaurantId,
      ...(options.status?.length ? { status: { in: options.status } } : {}),
    },
    select: {
      ...ORDER_LIST_SELECT,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
}

/** Counts per status, for the restaurant's at-a-glance queue. */
export async function getRestaurantOrderCounts(restaurantId: string) {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { restaurantId },
    _count: { _all: true },
  });

  const counts: Record<OrderStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    READY: 0,
    ON_DELIVERY: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

// ===========================================================================
// Status transitions
// ===========================================================================

/** The timestamp column to stamp for a given status. */
const STATUS_STAMP: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateInput>> = {
  CONFIRMED: "confirmedAt",
  PREPARING: "preparingAt",
  READY: "readyAt",
  ON_DELIVERY: "onDeliveryAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

/** Customer-facing copy for each status change. */
function customerNotificationFor(
  status: OrderStatus,
  orderNumber: string,
  isDonation: boolean,
): { type: NotificationType; title: string; body: string } | null {
  switch (status) {
    case "CONFIRMED":
      return {
        type: NotificationType.ORDER_CONFIRMED,
        title: "Order confirmed",
        body: isDonation
          ? `Your donation ${orderNumber} was accepted by the restaurant.`
          : `Your order ${orderNumber} was accepted by the restaurant.`,
      };
    case "PREPARING":
      return {
        type: NotificationType.ORDER_PREPARING,
        title: isDonation ? "Your donation is being prepared" : "Your order is being prepared",
        body: isDonation
          ? "The restaurant is preparing the food for delivery to the institution."
          : "The restaurant has started preparing your food.",
      };
    case "READY":
      return {
        type: NotificationType.ORDER_READY,
        title: "Ready for pickup",
        body: `Order ${orderNumber} is ready. Please collect it before the pickup deadline.`,
      };
    case "ON_DELIVERY":
      return {
        type: NotificationType.ORDER_ON_DELIVERY,
        title: "On the way",
        body: `Order ${orderNumber} is on its way.`,
      };
    case "COMPLETED":
      return {
        type: NotificationType.ORDER_COMPLETED,
        title: "Order completed",
        body: `Order ${orderNumber} is complete. Thank you for keeping good food in use.`,
      };
    case "CANCELLED":
      return {
        type: NotificationType.ORDER_CANCELLED,
        title: "Order cancelled",
        body: `Order ${orderNumber} was cancelled and the stock returned to the restaurant.`,
      };
    default:
      return null;
  }
}

/**
 * Move an order to a new status.
 *
 * Guards, in order:
 *  - the order must belong to the calling restaurant,
 *  - the transition must be legal (see ORDER_TRANSITIONS),
 *  - cancelling returns the stock to the listings, and a donation is marked
 *    cancelled alongside its order so the two never disagree.
 *
 * The status change and every notification it triggers happen in one
 * transaction, so the customer can never be told about a change that did not
 * persist.
 */
export async function updateOrderStatus(options: {
  orderId: string;
  restaurantId: string;
  status: OrderStatus;
  actorName?: string;
}) {
  const { orderId, restaurantId, status } = options;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      purpose: true,
      customerId: true,
      items: { select: { foodItemId: true, quantity: true } },
      donation: { select: { id: true, institutionId: true } },
      restaurant: { select: { name: true } },
    },
  });

  if (!order) throw new CheckoutError("That order does not belong to your restaurant.");
  if (order.status === status) return { changed: false as const, status };
  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
    throw new CheckoutError(`This order is already ${order.status.toLowerCase()}.`);
  }

  const allowed = ORDER_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    throw new CheckoutError(
      `An order that is ${order.status.toLowerCase()} cannot be moved to ${status.toLowerCase()}.`,
    );
  }

  const isDonation = order.purpose === OrderPurpose.DONATION;

  await prisma.$transaction(async (tx) => {
    const stamp = STATUS_STAMP[status];

    await tx.order.update({
      where: { id: order.id },
      data: {
        status,
        ...(stamp ? { [stamp]: new Date() } : {}),
      },
    });

    // Cancelling gives the food back to the marketplace, unless an item has
    // already passed its pickup deadline — in which case it is expired, not
    // available.
    if (status === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await tx.foodItem.update({
          where: { id: item.foodItemId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.foodItem.updateMany({
          where: {
            id: item.foodItemId,
            status: FoodStatus.SOLD_OUT,
            stock: { gt: 0 },
            pickupDeadline: { gt: new Date() },
          },
          data: { status: FoodStatus.AVAILABLE },
        });
      }
    }

    // Keep the donation's own status in step with the order's.
    if (isDonation && order.donation) {
      const donationStatus: DonationStatus | null =
        status === OrderStatus.CONFIRMED
          ? DonationStatus.CONFIRMED
          : status === OrderStatus.PREPARING
            ? DonationStatus.PREPARING
            : status === OrderStatus.READY
              ? DonationStatus.READY
              : status === OrderStatus.ON_DELIVERY
                ? DonationStatus.DELIVERING
                : status === OrderStatus.CANCELLED
                  ? DonationStatus.CANCELLED
                  : null;

      if (donationStatus) {
        await tx.donation.update({
          where: { id: order.donation.id },
          data: { status: donationStatus },
        });
      }
    }

    const notifications: NotificationInput[] = [];

    const customerMessage = customerNotificationFor(status, order.orderNumber, isDonation);
    if (customerMessage) {
      notifications.push({
        userId: order.customerId,
        ...customerMessage,
        link: isDonation ? "/impact" : "/orders",
      });
    }

    // The institution wants to know the food is on its way.
    if (isDonation && order.donation && status === OrderStatus.ON_DELIVERY) {
      const institution = await tx.socialInstitution.findUnique({
        where: { id: order.donation.institutionId },
        select: { ownerId: true },
      });
      if (institution) {
        notifications.push({
          userId: institution.ownerId,
          type: NotificationType.DONATION_ON_DELIVERY,
          title: "Donation on the way",
          body: `${order.restaurant.name} is delivering your donation now.`,
          link: "/institution/donations",
        });
      }
    }

    await createNotifications(notifications, tx);
  });

  return { changed: true as const, status };
}

/**
 * Confirm that a donation physically arrived, from the institution's side.
 *
 * This is the step that closes the loop: it marks the donation delivered, the
 * order completed, and writes the impact record that both the donor's personal
 * figures and the community totals are summed from.
 */
export async function confirmDonationReceipt(options: {
  donationId: string;
  institutionId: string;
  receivedBy?: string;
}) {
  const { donationId, institutionId, receivedBy } = options;

  const donation = await prisma.donation.findFirst({
    where: { id: donationId, institutionId },
    select: {
      id: true,
      meals: true,
      weightKg: true,
      status: true,
      donorId: true,
      orderId: true,
      institution: { select: { name: true } },
      restaurant: { select: { name: true } },
      order: { select: { orderNumber: true, customerId: true, id: true } },
    },
  });

  if (!donation) throw new CheckoutError("That donation is not addressed to your institution.");
  if (donation.status === DonationStatus.DELIVERED) {
    return { alreadyConfirmed: true as const };
  }
  if (donation.status === DonationStatus.CANCELLED) {
    throw new CheckoutError("This donation was cancelled.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.donation.update({
      where: { id: donation.id },
      data: {
        status: DonationStatus.DELIVERED,
        deliveredAt: now,
        receivedAt: now,
        receivedBy: receivedBy?.trim() || null,
      },
    });

    await tx.order.update({
      where: { id: donation.orderId },
      data: { status: OrderStatus.COMPLETED, completedAt: now },
    });

    // Impact is recorded once, keyed to the order, so a double confirmation
    // cannot double-count. `upsert` on the unique orderId makes that safe.
    await tx.impactRecord.upsert({
      where: { orderId: donation.orderId },
      create: {
        userId: donation.donorId,
        orderId: donation.orderId,
        mealsSaved: 0,
        mealsDonated: donation.meals,
        weightKg: donation.weightKg,
      },
      update: {
        mealsDonated: donation.meals,
        weightKg: donation.weightKg,
      },
    });

    await createNotifications(
      [
        {
          userId: donation.donorId,
          type: NotificationType.DONATION_DELIVERED,
          title: "Your donation was received",
          body: `${donation.institution.name} confirmed receiving ${donation.meals} portion${donation.meals === 1 ? "" : "s"} from ${donation.restaurant.name}.`,
          link: "/impact",
        },
        {
          userId: donation.order.customerId,
          type: NotificationType.ORDER_COMPLETED,
          title: "Donation delivered",
          body: `Order ${donation.order.orderNumber} is complete.`,
          link: "/orders",
        },
      ],
      tx,
    );
  });

  return { alreadyConfirmed: false as const, meals: donation.meals };
}

/**
 * Record impact for an ordinary (non-donation) order once it completes.
 *
 * Kept separate from the donation path because a self-purchase "saves" food
 * from waste but donates nothing.
 */
export async function recordOrderImpact(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      purpose: true,
      items: { select: { quantity: true } },
    },
  });

  if (!order) return;
  // Donations record their impact when the institution confirms receipt.
  if (order.purpose === OrderPurpose.DONATION) return;

  const meals = order.items.reduce((sum, i) => sum + i.quantity, 0);
  if (meals === 0) return;

  await prisma.impactRecord.upsert({
    where: { orderId: order.id },
    create: {
      userId: order.customerId,
      orderId: order.id,
      mealsSaved: meals,
      mealsDonated: 0,
      weightKg: estimateWeightKg(meals),
    },
    update: { mealsSaved: meals },
  });
}
