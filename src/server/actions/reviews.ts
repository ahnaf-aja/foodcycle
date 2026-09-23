"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertCustomer } from "@/server/auth-guards";
import { reviewSchema, fieldErrors, type ActionState } from "@/lib/validation";

/**
 * Reviews.
 *
 * A review is anchored to a completed order rather than to a listing directly.
 * That is what makes ratings trustworthy: only someone who actually collected
 * the food can rate it, and the unique `(userId, orderId)` constraint in the
 * schema means each order can be reviewed exactly once.
 */

function fail(error: unknown): ActionState {
  if (error && typeof error === "object" && "issues" in error) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(error as never),
    };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Something went wrong.",
  };
}

export async function createReviewAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let userId: string;
  try {
    const user = await assertCustomer();
    userId = user.id;
  } catch (error) {
    return fail(error);
  }

  const parsed = reviewSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || "",
  });
  if (!parsed.success) return fail(parsed.error);

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, customerId: userId },
    select: {
      id: true,
      status: true,
      restaurantId: true,
      reviews: { select: { id: true } },
      items: { select: { foodItemId: true }, take: 1 },
    },
  });

  if (!order) return { ok: false, message: "That order could not be found." };
  if (order.status !== "COMPLETED") {
    return { ok: false, message: "You can review an order once it is completed." };
  }
  if (order.reviews.length > 0) {
    return { ok: false, message: "You have already reviewed this order." };
  }

  await prisma.review.create({
    data: {
      userId,
      orderId: order.id,
      restaurantId: order.restaurantId,
      foodItemId: order.items[0]?.foodItemId ?? null,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/restaurant/reviews");
  revalidatePath("/foods");

  return { ok: true, message: "Thanks — your review is published." };
}
