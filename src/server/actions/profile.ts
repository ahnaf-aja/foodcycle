"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertUser, assertRestaurant, assertCustomer } from "@/server/auth-guards";
import {
  profileSchema,
  restaurantProfileSchema,
  fieldErrors,
  type ActionState,
} from "@/lib/validation";

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

export async function updateProfileAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let userId: string;
  try {
    const user = await assertUser();
    userId = user.id;
  } catch (error) {
    return fail(error);
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return fail(parsed.error);

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return { ok: true, message: "Your details were saved." };
}

export async function updateRestaurantProfileAction(
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

  const parsed = restaurantProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    cuisine: formData.get("cuisine") || "",
    address: formData.get("address"),
    city: formData.get("city"),
    phone: formData.get("phone") || "",
    isOpen: formData.get("isOpen") === "on" || formData.get("isOpen") === "true",
  });
  if (!parsed.success) return fail(parsed.error);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      cuisine: parsed.data.cuisine?.trim() || null,
      address: parsed.data.address,
      city: parsed.data.city,
      phone: parsed.data.phone?.trim() || null,
      isOpen: parsed.data.isOpen ?? true,
    },
  });

  revalidatePath("/restaurant/profile");
  revalidatePath("/restaurant/dashboard");
  revalidatePath("/restaurants");
  revalidatePath("/foods");
  revalidatePath("/");

  return { ok: true, message: "Restaurant profile saved." };
}

/** Save or unsave a restaurant from the customer's perspective. */
export async function toggleSavedRestaurantAction(
  restaurantId: string,
): Promise<ActionState<{ saved: boolean }>> {
  try {
    const user = await assertCustomer();

    const existing = await prisma.savedRestaurant.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.savedRestaurant.delete({ where: { id: existing.id } });
      revalidatePath("/dashboard");
      revalidatePath("/restaurants");
      return { ok: true, data: { saved: false }, message: "Removed from saved" };
    }

    await prisma.savedRestaurant.create({ data: { userId: user.id, restaurantId } });
    revalidatePath("/dashboard");
    revalidatePath("/restaurants");
    return { ok: true, data: { saved: true }, message: "Saved" };
  } catch (error) {
    return fail(error);
  }
}
