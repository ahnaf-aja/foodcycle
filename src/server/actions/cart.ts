"use server";

import { revalidatePath } from "next/cache";

import { assertCustomer } from "@/server/auth-guards";
import {
  addToCart,
  setCartItemQuantity,
  removeCartItem,
  clearCart,
  CartError,
} from "@/server/cart";
import {
  addToCartSchema,
  setCartQuantitySchema,
  fieldErrors,
  type ActionState,
} from "@/lib/validation";

/**
 * Cart actions.
 *
 * These are called from client components for instant feedback, so they return
 * a plain result rather than redirecting. Every one re-validates against live
 * stock — a cart is a statement of intent, not a reservation.
 */

function fail(error: unknown): ActionState {
  if (error && typeof error === "object" && "issues" in error) {
    return {
      ok: false,
      message: "Please check the quantity.",
      errors: fieldErrors(error as never),
    };
  }
  if (error instanceof CartError) return { ok: false, message: error.message };
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Something went wrong.",
  };
}

/** Revalidate the surfaces that display cart state. */
function revalidateCart() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/foods");
}

export async function addToCartAction(input: {
  foodItemId: string;
  quantity: number;
}): Promise<ActionState<{ quantity: number }>> {
  try {
    const user = await assertCustomer();
    const parsed = addToCartSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error);

    const result = await addToCart(user.id, parsed.data.foodItemId, parsed.data.quantity);
    revalidateCart();
    revalidatePath(`/foods/${parsed.data.foodItemId}`);
    return { ok: true, data: result, message: "Added to cart" };
  } catch (error) {
    return fail(error);
  }
}

export async function setCartQuantityAction(input: {
  cartItemId: string;
  quantity: number;
}): Promise<ActionState<{ quantity: number; removed: boolean }>> {
  try {
    const user = await assertCustomer();
    const parsed = setCartQuantitySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error);

    const result = await setCartItemQuantity(
      user.id,
      parsed.data.cartItemId,
      parsed.data.quantity,
    );
    revalidateCart();
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function removeCartItemAction(
  cartItemId: string,
): Promise<ActionState<{ removed: true }>> {
  try {
    const user = await assertCustomer();
    await removeCartItem(user.id, cartItemId);
    revalidateCart();
    return { ok: true, data: { removed: true }, message: "Removed from cart" };
  } catch (error) {
    return fail(error);
  }
}

export async function clearCartAction(): Promise<ActionState> {
  try {
    const user = await assertCustomer();
    await clearCart(user.id);
    revalidateCart();
    return { ok: true, message: "Cart cleared" };
  } catch (error) {
    return fail(error);
  }
}
