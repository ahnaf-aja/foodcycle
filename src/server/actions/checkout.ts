"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderPurpose, FulfillmentType } from "@prisma/client";

import { assertCustomer } from "@/server/auth-guards";
import { placeOrder, CheckoutError } from "@/server/orders";
import { clearCart, getCart } from "@/server/cart";
import { checkoutSchema, fieldErrors, type ActionState } from "@/lib/validation";

/**
 * Checkout.
 *
 * The whole order — stock claim, order rows, donation, notifications — is
 * performed by `placeOrder` inside one database transaction. This action's job
 * is only to validate input, translate failures into something a customer can
 * act on, and redirect on success.
 */

export async function checkoutAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let userId: string;
  try {
    const user = await assertCustomer();
    userId = user.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Please sign in to check out.",
    };
  }

  const parsed = checkoutSchema.safeParse({
    purpose: formData.get("purpose"),
    fulfillment: formData.get("fulfillment"),
    institutionId: formData.get("institutionId") || undefined,
    deliveryAddress: formData.get("deliveryAddress") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // A donation is handed over at the restaurant or delivered by the restaurant,
  // so delivery only applies to an order the customer keeps.
  const fulfillment =
    data.purpose === OrderPurpose.DONATION
      ? FulfillmentType.PICKUP
      : (data.fulfillment as FulfillmentType);

  let firstOrderId: string;
  let orderCount: number;

  try {
    const result = await placeOrder(userId, {
      purpose: data.purpose as OrderPurpose,
      fulfillment,
      institutionId: data.institutionId,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
    });

    firstOrderId = result.orders[0].id;
    orderCount = result.orders.length;
  } catch (error) {
    if (error instanceof CheckoutError) {
      // The cart has changed underneath them — show it as it now stands.
      await pruneAndRevalidate(userId);
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "We could not complete your order. Nothing was charged and your cart is unchanged.",
    };
  }

  revalidateCartSurfaces();

  // A cart spanning several restaurants becomes one order each; send the
  // customer to the first and let the orders list show the rest.
  const destination =
    orderCount > 1 ? "/orders?placed=multiple" : `/orders/${firstOrderId}?placed=1`;

  redirect(destination);
}

/** Drop anything that sold out while the customer was deciding. */
async function pruneAndRevalidate(userId: string) {
  const cart = await getCart(userId);
  if (cart.problems.length > 0) {
    await clearCart(userId);
  }
  revalidateCartSurfaces();
}

function revalidateCartSurfaces() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/foods");
  revalidatePath("/");
  revalidatePath("/restaurant/orders");
  revalidatePath("/restaurant/dashboard");
  revalidatePath("/restaurant/inventory");
  revalidatePath("/institution/donations");
  revalidatePath("/institution/dashboard");
  revalidatePath("/impact");
}
