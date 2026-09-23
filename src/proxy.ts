import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — Next.js 16's replacement for `middleware.ts`.
 *
 * IMPORTANT: this runs on the Node.js runtime and cannot be configured to edge.
 *
 * This is an *optimistic* check only: it reads the session cookie to decide
 * whether a visitor is plausibly signed in, and bounces them to the login page
 * if not. It does NOT verify the session, and it is NOT the authorisation
 * boundary — the cookie is attacker-controlled and a forged one would sail
 * through here.
 *
 * Real authorisation happens on the server, in one of two places:
 *   - pages, via `requireRole()` in `src/server/auth-guards.ts`
 *   - Server Actions, via `assertRole()` in the same file
 *
 * The value of this file is purely that an unauthorised visitor gets a clean
 * redirect instead of a flash of protected UI.
 */

/**
 * Area prefixes and the roles allowed to see them.
 * Order matters: the first matching prefix wins.
 */
const PROTECTED_AREAS: { prefix: string; roles: string[] }[] = [
  { prefix: "/restaurant", roles: ["RESTAURANT"] },
  { prefix: "/institution", roles: ["SOCIAL_INSTITUTION"] },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard", roles: ["CUSTOMER"] },
  { prefix: "/orders", roles: ["CUSTOMER"] },
  { prefix: "/cart", roles: ["CUSTOMER"] },
  { prefix: "/checkout", roles: ["CUSTOMER"] },
  { prefix: "/impact", roles: ["CUSTOMER"] },
  { prefix: "/profile", roles: ["CUSTOMER", "RESTAURANT", "SOCIAL_INSTITUTION", "ADMIN"] },
  { prefix: "/notifications", roles: ["CUSTOMER", "RESTAURANT", "SOCIAL_INSTITUTION", "ADMIN"] },
];

/** Auth.js v5 stores the session in one of these two cookies. */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const area = PROTECTED_AREAS.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`),
  );

  // Public route — nothing to do.
  if (!area) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // The visitor is signed in; whether they hold the right *role* is decided by
  // the page itself, which can read the verified session.
  return NextResponse.next();
}

export const config = {
  /**
   * Skip static assets, image optimisation, and the auth endpoints themselves —
   * running this on every file request would be pure overhead.
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
