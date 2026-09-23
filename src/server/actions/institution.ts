"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertInstitution } from "@/server/auth-guards";
import { institutionProfileSchema, fieldErrors, type ActionState } from "@/lib/validation";

/**
 * Institution profile.
 *
 * Scoped to the institution attached to the signed-in user, so an institution
 * can only ever edit its own record. Anything a donor reads when choosing where
 * their food goes lives here.
 */
export async function updateInstitutionProfileAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  let institutionId: string;
  try {
    const { institution } = await assertInstitution();
    institutionId = institution.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "You are not allowed to do this.",
    };
  }

  const parsed = institutionProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    address: formData.get("address"),
    city: formData.get("city"),
    phone: formData.get("phone") || "",
    supportedCount: formData.get("supportedCount") || undefined,
    needs: formData.get("needs") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.socialInstitution.update({
    where: { id: institutionId },
    data: {
      name: data.name,
      description: data.description?.trim() || null,
      address: data.address,
      city: data.city,
      phone: data.phone?.trim() || null,
      supportedCount: data.supportedCount ?? null,
      needs: data.needs,
    },
  });

  revalidatePath("/institution/profile");
  revalidatePath("/institution/dashboard");
  revalidatePath("/donate");
  revalidatePath("/impact");
  revalidatePath("/checkout");

  return { ok: true, message: "Institution profile saved." };
}
