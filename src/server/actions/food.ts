"use server";

import { revalidatePath } from "next/cache";
import { FoodStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertRestaurant } from "@/server/auth-guards";
import {
  foodItemSchema,
  updateStockSchema,
  updateFoodStatusSchema,
  fieldErrors,
  type ActionState,
} from "@/lib/validation";
import { reviveIfRestocked } from "@/server/jobs";

/**
 * Restaurant listing management.
 *
 * Every action resolves the restaurant from the signed-in user rather than
 * accepting an id from the client, so a restaurant can only ever edit its own
 * listings. The same rule is what makes `restaurantId` safe to omit from the
 * form payloads.
 */

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }): {
  ok: false;
  message: string;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, message: "Please check the highlighted fields.", errors };
}

/** Interpret a submitted status against the listing's stock and deadline. */
function resolveStatus(
  requested: FoodStatus,
  stock: number,
  pickupDeadline: Date,
): FoodStatus {
  if (pickupDeadline.getTime() <= Date.now()) return FoodStatus.EXPIRED;
  if (requested === FoodStatus.UNAVAILABLE) return FoodStatus.UNAVAILABLE;
  if (stock <= 0) return FoodStatus.SOLD_OUT;
  return FoodStatus.AVAILABLE;
}

export async function createFoodAction(
  _prev: ActionState<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const parsed = foodItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    category: formData.get("category"),
    originalPrice: formData.get("originalPrice"),
    discountPrice: formData.get("discountPrice"),
    stock: formData.get("stock"),
    grade: formData.get("grade"),
    qualityScore: formData.get("qualityScore"),
    expirationTime: formData.get("expirationTime"),
    pickupDeadline: formData.get("pickupDeadline"),
  });

  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  const created = await prisma.foodItem.create({
    data: {
      restaurantId,
      name: data.name,
      description: data.description?.trim() || null,
      category: data.category,
      originalPrice: data.originalPrice,
      discountPrice: data.discountPrice,
      stock: data.stock,
      grade: data.grade,
      qualityScore: data.qualityScore,
      expirationTime: data.expirationTime,
      pickupDeadline: data.pickupDeadline,
      status: resolveStatus(FoodStatus.AVAILABLE, data.stock, data.pickupDeadline),
    },
    select: { id: true },
  });

  // The marketplace and the dashboard both show this listing now.
  revalidatePath("/foods");
  revalidatePath("/");
  revalidatePath("/restaurant/inventory");
  revalidatePath("/restaurant/dashboard");

  return { ok: true, data: { id: created.id }, message: `${data.name} is now listed.` };
}

export async function updateFoodAction(
  _prev: ActionState<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const foodItemId = String(formData.get("foodItemId") ?? "");
  if (!foodItemId) return { ok: false, message: "Missing listing." };

  // Ownership check: the listing must belong to this restaurant.
  const existing = await prisma.foodItem.findFirst({
    where: { id: foodItemId, restaurantId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, message: "That listing does not belong to you." };

  const parsed = foodItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    category: formData.get("category"),
    originalPrice: formData.get("originalPrice"),
    discountPrice: formData.get("discountPrice"),
    stock: formData.get("stock"),
    grade: formData.get("grade"),
    qualityScore: formData.get("qualityScore"),
    expirationTime: formData.get("expirationTime"),
    pickupDeadline: formData.get("pickupDeadline"),
  });

  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;
  // An explicitly withdrawn listing stays withdrawn through an edit.
  const requested =
    existing.status === FoodStatus.UNAVAILABLE ? FoodStatus.UNAVAILABLE : FoodStatus.AVAILABLE;

  await prisma.foodItem.update({
    where: { id: foodItemId },
    data: {
      name: data.name,
      description: data.description?.trim() || null,
      category: data.category,
      originalPrice: data.originalPrice,
      discountPrice: data.discountPrice,
      stock: data.stock,
      grade: data.grade,
      qualityScore: data.qualityScore,
      expirationTime: data.expirationTime,
      pickupDeadline: data.pickupDeadline,
      status: resolveStatus(requested, data.stock, data.pickupDeadline),
    },
  });

  revalidatePath("/foods");
  revalidatePath(`/foods/${foodItemId}`);
  revalidatePath("/restaurant/inventory");
  revalidatePath("/restaurant/dashboard");

  return { ok: true, data: { id: foodItemId }, message: `${data.name} was updated.` };
}

export async function updateStockAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const parsed = updateStockSchema.safeParse({
    foodItemId: formData.get("foodItemId"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const item = await prisma.foodItem.findFirst({
    where: { id: parsed.data.foodItemId, restaurantId },
    select: { id: true, pickupDeadline: true, name: true },
  });
  if (!item) return { ok: false, message: "That listing does not belong to you." };

  await prisma.foodItem.update({
    where: { id: item.id },
    data: {
      stock: parsed.data.stock,
      status:
        item.pickupDeadline.getTime() <= Date.now()
          ? FoodStatus.EXPIRED
          : parsed.data.stock <= 0
            ? FoodStatus.SOLD_OUT
            : FoodStatus.AVAILABLE,
    },
  });

  revalidatePath("/foods");
  revalidatePath(`/foods/${item.id}`);
  revalidatePath("/restaurant/inventory");
  revalidatePath("/restaurant/dashboard");

  return { ok: true, message: `${item.name} stock updated.` };
}

export async function updateFoodStatusAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const parsed = updateFoodStatusSchema.safeParse({
    foodItemId: formData.get("foodItemId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const item = await prisma.foodItem.findFirst({
    where: { id: parsed.data.foodItemId, restaurantId },
    select: { id: true, stock: true, pickupDeadline: true, name: true },
  });
  if (!item) return { ok: false, message: "That listing does not belong to you." };

  const status = resolveStatus(
    parsed.data.status as FoodStatus,
    item.stock,
    item.pickupDeadline,
  );

  await prisma.foodItem.update({ where: { id: item.id }, data: { status } });

  revalidatePath("/foods");
  revalidatePath(`/foods/${item.id}`);
  revalidatePath("/restaurant/inventory");
  revalidatePath("/restaurant/dashboard");

  const label =
    status === FoodStatus.UNAVAILABLE
      ? "marked unavailable"
      : status === FoodStatus.AVAILABLE
        ? "is available again"
        : status === FoodStatus.SOLD_OUT
          ? "is sold out"
          : "has expired";
  return { ok: true, message: `${item.name} ${label}.` };
}

export async function deleteFoodAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let restaurantId: string;
  try {
    const { restaurant } = await assertRestaurant();
    restaurantId = restaurant.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const foodItemId = String(formData.get("foodItemId") ?? "");
  if (!foodItemId) return { ok: false, message: "Missing listing." };

  const item = await prisma.foodItem.findFirst({
    where: { id: foodItemId, restaurantId },
    select: { id: true, name: true, _count: { select: { orderItems: true } } },
  });
  if (!item) return { ok: false, message: "That listing does not belong to you." };

  // A listing that has been ordered is part of someone's history. Withdraw it
  // instead of deleting, so past orders keep resolving to a real food item.
  if (item._count.orderItems > 0) {
    await prisma.foodItem.update({
      where: { id: item.id },
      data: { status: FoodStatus.UNAVAILABLE },
    });
    revalidatePath("/foods");
    revalidatePath("/restaurant/inventory");
    return {
      ok: true,
      message: `${item.name} has past orders, so it was marked unavailable instead of deleted.`,
    };
  }

  await prisma.foodItem.delete({ where: { id: item.id } });

  revalidatePath("/foods");
  revalidatePath("/restaurant/inventory");
  revalidatePath("/restaurant/dashboard");

  return { ok: true, message: `${item.name} was deleted.` };
}

/** Housekeeping hook used by the inventory page before it renders. */
export async function refreshListingStatuses() {
  const { restaurant } = await assertRestaurant();
  await expireOwnListings(restaurant.id);
  await reviveIfRestocked();
}

async function expireOwnListings(restaurantId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.foodItem.updateMany({
      where: {
        restaurantId,
        pickupDeadline: { lte: now },
        status: { in: [FoodStatus.AVAILABLE, FoodStatus.SOLD_OUT] },
      },
      data: { status: FoodStatus.EXPIRED },
    }),
    prisma.foodItem.updateMany({
      where: {
        restaurantId,
        stock: { lte: 0 },
        pickupDeadline: { gt: now },
        status: FoodStatus.AVAILABLE,
      },
      data: { status: FoodStatus.SOLD_OUT },
    }),
  ]);
}
