"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

import { signIn, signOut, ROLE_HOME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signUpSchema, loginSchema, fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

/**
 * Authentication actions.
 *
 * Sign-up creates the person and the business they own in one transaction, so
 * a restaurant account can never exist without its restaurant — otherwise the
 * dashboard would land in an unrepresentable state.
 */

type SignUpState = ActionState<{ redirectTo: string }>;
type LoginState = ActionState<{ redirectTo: string }>;

/** Turn a Zod error into the shape our forms render. */
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

export async function signUpAction(
  _prev: SignUpState | undefined,
  formData: FormData,
): Promise<SignUpState> {
  const raw = {
    role: formData.get("role"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    businessName: formData.get("businessName") || undefined,
    institutionType: formData.get("institutionType") || undefined,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    cuisine: formData.get("cuisine") || undefined,
    supportedCount: formData.get("supportedCount") || undefined,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: { email: "An account with this email already exists" },
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          role:
            data.role === "RESTAURANT"
              ? UserRole.RESTAURANT
              : data.role === "SOCIAL_INSTITUTION"
                ? UserRole.SOCIAL_INSTITUTION
                : UserRole.CUSTOMER,
        },
        select: { id: true },
      });

      if (data.role === "RESTAURANT") {
        await tx.restaurant.create({
          data: {
            ownerId: user.id,
            name: data.businessName,
            slug: await uniqueSlug(tx, data.businessName, "restaurant"),
            address: data.address,
            city: data.city,
            cuisine: data.cuisine || null,
            phone: data.phone || null,
          },
        });
      }

      if (data.role === "SOCIAL_INSTITUTION") {
        await tx.socialInstitution.create({
          data: {
            ownerId: user.id,
            name: data.businessName,
            slug: await uniqueSlug(tx, data.businessName, "institution"),
            type: data.institutionType,
            address: data.address,
            city: data.city,
            phone: data.phone || null,
            supportedCount: data.supportedCount ?? null,
            // New institutions are reviewed before their donations go live.
            verified: false,
          },
        });
      }
    });
  } catch {
    return { ok: false, message: "We could not create your account. Please try again." };
  }

  // Sign the new user in. `signIn` throws a redirect on success, so the
  // redirect below is only reached if authentication failed.
  const redirectTo = ROLE_HOME[roleToEnum(data.role)];

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo,
    });
  } catch (error) {
    // The account exists but the automatic sign-in failed. Send the person to
    // the login page rather than presenting them with an error they cannot act
    // on — they can sign in immediately with the password they just chose.
    if (error instanceof AuthError) redirect("/login?created=1");
    throw error; // Next.js redirect
  }

  return { ok: true, data: { redirectTo } };
}

function roleToEnum(role: "CUSTOMER" | "RESTAURANT" | "SOCIAL_INSTITUTION"): UserRole {
  if (role === "RESTAURANT") return UserRole.RESTAURANT;
  if (role === "SOCIAL_INSTITUTION") return UserRole.SOCIAL_INSTITUTION;
  return UserRole.CUSTOMER;
}

/** Append a counter until the slug is free. */
async function uniqueSlug(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  name: string,
  kind: "restaurant" | "institution",
): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const clash =
      kind === "restaurant"
        ? await tx.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await tx.socialInstitution.findUnique({
            where: { slug: candidate },
            select: { id: true },
          });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return invalid(parsed.error);

  const next = (formData.get("next") as string | null) || null;

  try {
    // Without an explicit redirectTo, Auth.js returns to the current URL and
    // would bounce a dashboard-bound user back to /login. Resolve the role's
    // home up front instead, honouring a same-site `next` when present.
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { role: true },
    });
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    const redirectTo = safeNext ?? (user ? ROLE_HOME[user.role] : "/dashboard");

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        message:
          error.type === "CredentialsSignin"
            ? "That email and password combination is not recognised."
            : "We could not sign you in. Please try again.",
      };
    }
    throw error; // Next.js redirect
  }

  return { ok: true, data: { redirectTo: "/dashboard" } };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

/** Sign-out from a form, without needing a client component. */
export async function logoutFormAction() {
  await signOut({ redirectTo: "/" });
}

export async function redirectAfterLogin(role: UserRole) {
  redirect(ROLE_HOME[role]);
}

/** Re-exported so forms can render inline field errors consistently. */
export { fieldErrors };
