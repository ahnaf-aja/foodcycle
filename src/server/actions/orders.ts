"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus, DonationStatus } from "@prisma/client";

import { assertRestaurant, assertInstitution } from "@/server/auth-guards";
import {
  updateOrderStatus,
  confirmDonationReceipt,
  recordOrderImpact,
  CheckoutError,
} from "@/server/orders";
import {
  orderStatusSchema,
  donationStatusSchema,
  fieldErrors,
  type ActionState,
} from "@/lib/validation";

/**
 * Order and donation status actions.
 *
 * Both sides of the marketplace read the same `Order.status` column, so a
 * single update here is what the restaurant queue, the customer timeline and
 * the institution's donation view all render from. There is no second copy of
 * the status to fall out of step.
 */

function fail(error: unknown): ActionState {
  if (error && typeof error === "object" && "issues" in error) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(error as never),
    };
  }
  if (error instanceof CheckoutError) return { ok: false, message: error.message };
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Something went wrong.",
  };
}

function revalidateOrderSurfaces(orderId?: string) {
  revalidatePath("/restaurant/orders");
  revalidatePath("/restaurant/dashboard");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/institution/donations");
  revalidatePath("/institution/dashboard");
  revalidatePath("/impact");
  revalidatePath("/");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function updateOrderStatusAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return fail(error);
  }

  const parsed = orderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return fail(parsed.error);

  const targetStatus = parsed.data.status as OrderStatus;

  try {
    await updateOrderStatus({
      orderId: parsed.data.orderId,
      restaurantId,
      status: targetStatus,
    });
  } catch (error) {
    return fail(error);
  }

  // A completed self-purchase is the moment its impact becomes real.
  if (targetStatus === OrderStatus.COMPLETED) {
    await recordOrderImpact(parsed.data.orderId);
  }

  revalidateOrderSurfaces(parsed.data.orderId);

  return { ok: true, message: `Order marked ${targetStatus.toLowerCase()}.` };
}

export async function updateDonationStatusAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return fail(error);
  }

  const parsed = donationStatusSchema.safeParse({
    donationId: formData.get("donationId"),
    status: formData.get("status"),
    receivedBy: formData.get("receivedBy") || "",
  });
  if (!parsed.success) return fail(parsed.error);

  // The donation's status is driven by its order's, so map back to the order
  // status and let `updateOrderStatus` keep both in step.
  const orderStatusByDonation: Partial<Record<DonationStatus, OrderStatus>> = {
    CONFIRMED: OrderStatus.CONFIRMED,
    PREPARING: OrderStatus.PREPARING,
    READY: OrderStatus.READY,
    DELIVERING: OrderStatus.ON_DELIVERY,
    CANCELLED: OrderStatus.CANCELLED,
  };

  const targetOrderStatus = orderStatusByDonation[parsed.data.status as DonationStatus];
  if (!targetOrderStatus) {
    return { ok: false, message: "That is not a valid next step for a donation." };
  }

  const donation = await prismaDonationLookup(parsed.data.donationId, restaurantId);
  if (!donation) return { ok: false, message: "That donation does not belong to you." };

  try {
    await updateOrderStatus({
      orderId: donation.orderId,
      restaurantId,
      status: targetOrderStatus,
    });
  } catch (error) {
    return fail(error);
  }

  revalidateOrderSurfaces(donation.orderId);
  return { ok: true, message: `Donation marked ${parsed.data.status.toLowerCase()}.` };
}

/** Look up a donation, scoped to the restaurant that owns it. */
async function prismaDonationLookup(donationId: string, restaurantId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.donation.findFirst({
    where: { id: donationId, restaurantId },
    select: { id: true, orderId: true },
  });
}

/**
 * The institution confirms the food physically arrived. This is the terminal
 * step for a donation: it completes the order and writes the impact record.
 */
export async function confirmDonationReceiptAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let institutionId: string;
  try {
    const { institution } = await assertInstitution();
    institutionId = institution.id;
  } catch (error) {
    return fail(error);
  }

  const parsed = donationStatusSchema.safeParse({
    donationId: formData.get("donationId"),
    status: "DELIVERED",
    receivedBy: formData.get("receivedBy") || "",
  });
  if (!parsed.success) return fail(parsed.error);

  try {
    const result = await confirmDonationReceipt({
      donationId: parsed.data.donationId,
      institutionId,
      receivedBy: parsed.data.receivedBy || undefined,
    });

    revalidateOrderSurfaces();

    if (result.alreadyConfirmed) {
      return { ok: true, message: "This donation was already confirmed." };
    }
    return {
      ok: true,
      message: `Receipt confirmed for ${result.meals} portion${result.meals === 1 ? "" : "s"}. Thank you.`,
    };
  } catch (error) {
    return fail(error);
  }
}
