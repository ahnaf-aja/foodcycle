"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Package, Sparkles, User as UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bottom navigation for phones.
 *
 * Five destinations, thumb-height targets, and it reveals itself only below
 * `md` — where the header's text links are hidden. Icons are paired with
 * labels: an icon-only bar is a guessing game the first time you use it.
 *
 * The bar is `fixed`, so the page reserves matching space at its foot and
 * honours the phone's safe-area inset.
 */

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/foods", label: "Explore", icon: Compass },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/impact", label: "Impact", icon: Sparkles },
  { href: "/dashboard", label: "Profile", icon: UserIcon },
];

export function MobileNav({
  isCustomer,
  isSignedIn,
}: {
  isCustomer: boolean;
  isSignedIn: boolean;
}) {
  const pathname = usePathname();

  // Restaurant, institution and admin areas have their own sidebars; a
  // customer bottom bar there would be noise.
  if (pathname.startsWith("/restaurant") || pathname.startsWith("/institution") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          // "/" would otherwise match every route.
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          // Order and impact history only exist for customers.
          const href =
            !isCustomer && (item.href === "/orders" || item.href === "/impact")
              ? "/dashboard"
              : !isSignedIn && (item.href === "/orders" || item.href === "/impact" || item.href === "/dashboard")
                ? "/login"
                : item.href;

          return (
            <li key={item.label} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150",
                  active ? "text-brand" : "text-ink-muted hover:text-ink-soft",
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className={cn("size-5", active && "stroke-[2.2]")}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
