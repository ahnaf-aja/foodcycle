"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { logoutAction } from "@/server/actions/auth";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

/**
 * Header account actions.
 *
 * Client components because they own small pieces of interaction state — an
 * open menu, a pending sign-out — but they hold no data of their own; the
 * counts arrive as props from the server-rendered navbar, so they are always
 * the real numbers from the database.
 */

/** Close a popover on Escape or an outside click. */
function useDismiss(open: boolean, setOpen: (value: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return ref;
}

const ICON_BUTTON =
  "relative inline-flex size-10 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink";

/** Unread badge, shared by the bell and the cart. */
function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white tabular"
      aria-label={label}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      className={ICON_BUTTON}
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <ShoppingBag aria-hidden="true" className="size-5" />
      <CountBadge count={count} label={`${count} items in cart`} />
    </Link>
  );
}

export function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/notifications"
      className={ICON_BUTTON}
      aria-label={
        count > 0 ? `Notifications, ${count} unread` : "Notifications"
      }
    >
      <Bell aria-hidden="true" className="size-5" />
      <CountBadge count={count} label={`${count} unread notifications`} />
    </Link>
  );
}

type MenuUser = {
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
};

export function ProfileMenu({
  user,
  homeHref,
}: {
  user: MenuUser | null;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useDismiss(open, setOpen);
  const pathname = usePathname();

  // Navigating away should close the menu.
  useEffect(() => setOpen(false), [pathname]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="ml-1 inline-flex h-9 items-center rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
      >
        Sign in
      </Link>
    );
  }

  const dashboardHref =
    user.role === "RESTAURANT"
      ? "/restaurant/dashboard"
      : user.role === "SOCIAL_INSTITUTION"
        ? "/institution/dashboard"
        : user.role === "ADMIN"
          ? "/admin/dashboard"
          : "/dashboard";

  const menuItems = [
    { href: dashboardHref, label: "Dashboard", icon: LayoutDashboard },
    ...(user.role === "CUSTOMER"
      ? [
          { href: "/orders", label: "My orders", icon: Package },
          { href: "/impact", label: "My impact", icon: Sparkles },
        ]
      : []),
    { href: "/profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={cn(ICON_BUTTON, "gap-1 pl-1")}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
          {initials(user.name ?? user.email)}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-lg shadow-ink/5"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{user.name ?? "Your account"}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-line py-1">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(() => void logoutAction())}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-4 shrink-0" />
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
