import "server-only";

import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_HOME } from "@/lib/auth";

/**
 * Authorisation helpers.
 *
 * Two families, because pages and Server Actions fail differently:
 *
 *  - `requireX()` redirects. Right for a page: an unauthorised visitor should
 *    land on the login screen, not an error.
 *  - `assertX()` throws. Right for a Server Action: the caller must not be able
 *    to perform the mutation at all, and silently redirecting would hide a
 *    genuine bug or an attack attempt.
 *
 * Every Server Action calls one of these. Actions are reachable by direct POST,
 * so the action body is untrusted regardless of what the UI allows.
 */

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  phone: string | null;
};

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  phone: true,
} as const;

/** The signed-in user, or null. Never throws. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });

  return user;
}

// ===========================================================================
// Page guards — redirect
// ===========================================================================

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}

/**
 * Require one of `roles`. A signed-in user in the wrong role is sent to their
 * own home rather than to the login page — they are authenticated, just not
 * authorised, and bouncing them to login would be confusing.
 */
export async function requireRole(
  roles: UserRole | UserRole[],
  next?: string,
): Promise<SessionUser> {
  const user = await requireUser(next);
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(user.role)) {
    redirect(ROLE_HOME[user.role]);
  }
  return user;
}

export const requireCustomer = () => requireRole("CUSTOMER");
export const requireAdmin = () => requireRole("ADMIN");

/** A restaurant user plus the restaurant they own. */
export async function requireRestaurant() {
  const user = await requireRole("RESTAURANT");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, city: true, isOpen: true, image: true },
  });

  // A restaurant account with no restaurant row is a broken state; send them
  // through onboarding rather than crashing the dashboard.
  if (!restaurant) redirect("/restaurant/onboarding");

  return { user, restaurant };
}

/** An institution user plus the institution they own. */
export async function requireInstitution() {
  const user = await requireRole("SOCIAL_INSTITUTION");

  const institution = await prisma.socialInstitution.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, city: true, type: true, image: true },
  });

  if (!institution) redirect("/institution/onboarding");

  return { user, institution };
}

// ===========================================================================
// Action guards — throw
// ===========================================================================

/** Thrown when the caller is not allowed to do what they asked. */
export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to do this.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Please sign in to continue.");
  return user;
}

export async function assertRole(roles: UserRole | UserRole[]): Promise<SessionUser> {
  const user = await assertUser();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) throw new AuthorizationError();
  return user;
}

export const assertCustomer = () => assertRole("CUSTOMER");
export const assertAdmin = () => assertRole("ADMIN");

export async function assertRestaurant() {
  const user = await assertRole("RESTAURANT");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!restaurant) throw new AuthorizationError("No restaurant is linked to this account.");
  return { user, restaurant };
}

export async function assertInstitution() {
  const user = await assertRole("SOCIAL_INSTITUTION");

  const institution = await prisma.socialInstitution.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!institution) throw new AuthorizationError("No institution is linked to this account.");
  return { user, institution };
}
