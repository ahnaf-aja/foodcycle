import Link from "next/link";
import { Search } from "lucide-react";

import { Logo } from "./logo";
import { CartButton, NotificationBell, ProfileMenu } from "./nav-actions";
import { MobileNav } from "./mobile-nav";
import { getCurrentUser } from "@/server/auth-guards";
import { getCartCount } from "@/server/cart";
import { getUnreadCount } from "@/server/notifications";
import { ROLE_HOME } from "@/lib/auth";

/**
 * The site header.
 *
 * One row: identity on the left, the four things a customer can browse in the
 * middle, and their own account actions on the right. It stays out of the way —
 * no mega-menu, no announcement bar, no second row of links.
 *
 * Below `md` the text links move into the bottom navigation and the header
 * keeps only the logo, search and account actions.
 */

const NAV_LINKS = [
  { href: "/foods", label: "Explore Food" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/donate", label: "Donate" },
  { href: "/impact", label: "Impact" },
];

export async function Navbar() {
  const user = await getCurrentUser();

  // Fetch the two badge counts together; both are cheap aggregates.
  const [cartCount, unreadCount] = user
    ? await Promise.all([getCartCount(user.id), getUnreadCount(user.id)])
    : [0, 0];

  const homeHref = user ? ROLE_HOME[user.role] : "/login";
  const isCustomer = !user || user.role === "CUSTOMER";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {/* Search collapses to an icon on small screens to protect the row. */}
            <Link
              href="/foods"
              aria-label="Search food or restaurant"
              className="inline-flex size-10 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink lg:hidden"
            >
              <Search aria-hidden="true" className="size-5" />
            </Link>

            {user && <NotificationBell count={unreadCount} />}
            {isCustomer && <CartButton count={cartCount} />}
            <ProfileMenu
              user={
                user
                  ? { name: user.name, email: user.email, role: user.role, image: user.image }
                  : null
              }
              homeHref={homeHref}
            />
          </div>
        </div>
      </header>

      {/* Mobile: the same destinations, thumb-reachable at the bottom. */}
      <MobileNav isCustomer={isCustomer} isSignedIn={Boolean(user)} />
    </>
  );
}
