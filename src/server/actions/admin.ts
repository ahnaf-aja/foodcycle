"use server";

import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/server/auth-guards";
import { createNotification } from "@/server/notifications";
import type { ActionState } from "@/lib/validation";

/**
 * Administrative actions.
 *
 * Verification is the one decision that genuinely belongs to an administrator:
 * an institution becomes a valid donation target only once a human has approved
 * it, because donors are trusting that the food reaches real people.
 */
export async function setInstitutionVerifiedAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string;
  try {
    const admin = await assertAdmin();
    adminId = admin.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const institutionId = String(formData.get("institutionId") ?? "");
  const verified = formData.get("verified") === "true";

  if (!institutionId) return { ok: false, message: "Missing institution." };

  const institution = await prisma.socialInstitution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, ownerId: true, verified: true },
  });

  if (!institution) return { ok: false, message: "That institution could not be found." };
  if (institution.verified === verified) {
    return { ok: true, message: "No change needed." };
  }

  await prisma.socialInstitution.update({
    where: { id: institutionId },
    data: { verified },
  });

  // Tell the institution, so they are not left wondering.
  await createNotification({
    userId: institution.ownerId,
    type: NotificationType.SYSTEM,
    title: verified ? "Your institution is verified" : "Your verification was withdrawn",
    body: verified
      ? "Donors can now send FoodCycle orders to your institution."
      : "Your institution can no longer receive donations. Please contact FoodCycle support.",
    link: "/institution/profile",
  });

  revalidatePath("/admin/institutions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/donate");
  revalidatePath("/checkout");

  return {
    ok: true,
    message: verified
      ? `${institution.name} is now verified and can receive donations.`
      : `${institution.name} is no longer verified.`,
  };
}

/** Suspend or restore a user account. */
export async function setUserRoleAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string;
  try {
    const admin = await assertAdmin();
    adminId = admin.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  const valid = ["CUSTOMER", "RESTAURANT", "SOCIAL_INSTITUTION", "ADMIN"];
  if (!userId || !valid.includes(role)) {
    return { ok: false, message: "Invalid role change." };
  }

  // An administrator changing their own role could lock the platform out of
  // its last admin account.
  if (userId === adminId) {
    return { ok: false, message: "You cannot change your own role." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as "CUSTOMER" | "RESTAURANT" | "SOCIAL_INSTITUTION" | "ADMIN" },
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "Role updated. The change applies at their next sign-in." };
}
