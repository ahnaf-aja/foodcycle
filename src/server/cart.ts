import "server-only";

import { FoodStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { discountPercent, savingsPerUnit } from "@/lib/utils";

/**
 * Cart operations.
 *
 * A cart stores only `(foodItemId, quantity)`. Prices, grades and stock are
 * always read live from the listing, never copied in — so a restaurant that
 * changes a price or sells out is reflected the moment the cart is rendered.
 *
 * Every mutation re-checks that the item is still purchasable, which is why
 * `addToCart` can fail for a food that was in stock a moment ago.
 */

const CART_ITEM_SELECT = {
  id: true,
  quantity: true,
  foodItem: {
    select: {
      id: true,
      name: true,
      image: true,
      category: true,
      originalPrice: true,
      discountPrice: true,
      stock: true,
      grade: true,
      qualityScore: true,
      pickupDeadline: true,
      expirationTime: true,
      status: true,
      restaurant: { select: { id: true, name: true, slug: true, city: true } },
    },
  },
} as const;

/**
 * A cart line with its live listing attached. Derived from the select itself
 * rather than from `getCart`'s return type, which would be circular.
 */
export type CartItemView = Prisma.CartItemGetPayload<{
  select: typeof CART_ITEM_SELECT;
}>;

/** One restaurant's worth of the cart — the unit checkout works in. */
export type CartGroup = {
  restaurant: { id: string; name: string; slug: string; city: string };
  items: CartItemView[];
  subtotal: number;
  savings: number;
  total: number;
};

export type CartView = {
  items: CartItemView[];
  groups: CartGroup[];
  itemCount: number;
  subtotal: number;
  savings: number;
  total: number;
  /** Items that can no longer be bought, with the reason. */
  problems: { cartItemId: string; name: string; reason: string }[];
};

/** An empty cart, for signed-out visitors and empty states. */
export const EMPTY_CART: CartView = {
  items: [],
  groups: [],
  itemCount: 0,
  subtotal: 0,
  savings: 0,
  total: 0,
  problems: [],
};

/**
 * Why a cart line cannot be bought, or null if it still can.
 *
 * Takes only the four fields it reads, so it can be used with both the full
 * cart select and the leaner one `pruneUnavailableItems` uses.
 */
function emptyReason(item: {
  status: FoodStatus;
  pickupDeadline: Date;
  stock: number;
}): string | null {
  if (item.status === FoodStatus.EXPIRED) return "Expired";
  if (item.status === FoodStatus.UNAVAILABLE) return "No longer available";
  if (item.pickupDeadline.getTime() <= Date.now()) return "Pickup window closed";
  if (item.stock <= 0) return "Sold out";
  return null;
}

/**
 * The cart, totalled and grouped by restaurant.
 *
 * Items that have gone stale since they were added are reported in `problems`
 * rather than silently dropped, so the customer is told why their total moved.
 */
export async function getCart(userId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      id: true,
      items: {
        select: CART_ITEM_SELECT,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart || cart.items.length === 0) return EMPTY_CART;

  const problems: CartView["problems"] = [];
  let subtotal = 0;
  let savings = 0;
  let itemCount = 0;

  const groupsById = new Map<string, CartGroup>();

  for (const item of cart.items) {
    const reason = emptyReason(item.foodItem);
    if (reason) {
      problems.push({ cartItemId: item.id, name: item.foodItem.name, reason });
      continue;
    }

    // Never let a stale quantity imply more stock than exists.
    const effectiveQuantity = Math.min(item.quantity, item.foodItem.stock);
    const lineTotal = item.foodItem.discountPrice * effectiveQuantity;
    const lineSavings = savingsPerUnit(
      item.foodItem.originalPrice,
      item.foodItem.discountPrice,
    ) * effectiveQuantity;

    subtotal += lineTotal;
    savings += lineSavings;
    itemCount += effectiveQuantity;

    const restaurant = item.foodItem.restaurant;
    let group = groupsById.get(restaurant.id);
    if (!group) {
      group = { restaurant, items: [], subtotal: 0, savings: 0, total: 0 };
      groupsById.set(restaurant.id, group);
    }

    group.items.push(item);
    group.subtotal += lineTotal;
    group.savings += lineSavings;
    group.total += lineTotal;
  }

  return {
    items: cart.items,
    groups: [...groupsById.values()],
    itemCount,
    subtotal,
    savings,
    total: subtotal, // No delivery fee is charged on pickup.
    problems,
  };
}

/** Just the badge count. Cheaper than building the whole cart view. */
export async function getCartCount(userId: string | undefined): Promise<number> {
  if (!userId) return 0;

  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

/** Idempotently fetch (or create) the customer's single cart. */
async function ensureCart(userId: string) {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.cart.create({ data: { userId }, select: { id: true } });
}

export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

/**
 * Add a listing to the cart, or increase its quantity if already present.
 *
 * The new total is validated against live stock before it is written, so the
 * cart can never hold more than the restaurant has left.
 */
export async function addToCart(userId: string, foodItemId: string, quantity: number) {
  const food = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
    select: { id: true, name: true, stock: true, status: true, pickupDeadline: true },
  });

  if (!food) throw new CartError("That food is no longer listed.");
  if (food.status !== FoodStatus.AVAILABLE) {
    throw new CartError(`${food.name} is not available right now.`);
  }
  if (food.pickupDeadline.getTime() <= Date.now()) {
    throw new CartError(`The pickup window for ${food.name} has closed.`);
  }
  if (food.stock <= 0) throw new CartError(`${food.name} is sold out.`);

  const cart = await ensureCart(userId);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_foodItemId: { cartId: cart.id, foodItemId } },
    select: { id: true, quantity: true },
  });

  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > food.stock) {
    throw new CartError(
      food.stock === 1
        ? `Only 1 portion of ${food.name} is left.`
        : `Only ${food.stock} portions of ${food.name} are left.`,
    );
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: desired },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, foodItemId, quantity },
    });
  }

  return { quantity: desired };
}

/**
 * Set an exact quantity. Zero removes the line.
 * The cart item is resolved through the owning user, so one customer can never
 * modify another's cart by guessing an id.
 */
export async function setCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number,
) {
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
    select: { id: true, foodItem: { select: { name: true, stock: true, status: true } } },
  });

  if (!item) throw new CartError("That item is not in your cart.");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return { removed: true, quantity: 0 };
  }

  if (item.foodItem.status !== FoodStatus.AVAILABLE) {
    throw new CartError(`${item.foodItem.name} is not available right now.`);
  }
  if (quantity > item.foodItem.stock) {
    throw new CartError(
      item.foodItem.stock === 1
        ? `Only 1 portion of ${item.foodItem.name} is left.`
        : `Only ${item.foodItem.stock} portions of ${item.foodItem.name} are left.`,
    );
  }

  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return { removed: false, quantity };
}

export async function removeCartItem(userId: string, cartItemId: string) {
  const result = await prisma.cartItem.deleteMany({
    where: { id: cartItemId, cart: { userId } },
  });
  if (result.count === 0) throw new CartError("That item is not in your cart.");
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
}

/**
 * Drop lines that can no longer be bought and return what was removed, so the
 * checkout flow can explain the change instead of quietly altering the total.
 */
export async function pruneUnavailableItems(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          id: true,
          quantity: true,
          foodItem: {
            select: { name: true, stock: true, status: true, pickupDeadline: true },
          },
        },
      },
    },
  });

  if (!cart) return [];

  const removed: { name: string; reason: string }[] = [];

  for (const item of cart.items) {
    const reason = emptyReason(item.foodItem);
    if (reason) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      removed.push({ name: item.foodItem.name, reason });
      continue;
    }
    // Clamp to what is actually left.
    if (item.quantity > item.foodItem.stock) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: item.foodItem.stock },
      });
      removed.push({
        name: item.foodItem.name,
        reason: `Quantity reduced to ${item.foodItem.stock}`,
      });
    }
  }

  return removed;
}

/** Discount percentage for a cart line, for display. */
export function itemDiscountPercent(originalPrice: number, discountPrice: number) {
  return discountPercent(originalPrice, discountPrice);
}
