"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "./logo";
import { navIcon, type NavIconName } from "./nav-icons";
import { cn } from "@/lib/utils";

/**
 * The shared chrome for the three dashboard areas.
 *
 * A sidebar with the area's own navigation, and a compact top bar carrying the
 * page title and the account menu. Sidebars are the right shape here because
 * these are working surfaces with a fixed, small set of destinations that a
 * person moves between constantly.
 *
 * On mobile the sidebar collapses into a drawer, so the working area keeps the
 * full width of the screen.
 */

export type NavItem = {
  href: string;
  label: string;
  /**
   * Icon *name*, not a component. The layouts that build these items are Server
   * Components, and a component is a function — not serialisable, so passing
   * one across the boundary to this Client Component throws. The name is
   * resolved to a component on this side by `navIcon`.
   */
  icon: NavIconName;
  /** Optional count rendered as a small badge, e.g. new orders. */
  badge?: number;
};

export function DashboardShell({
  items,
  areaLabel,
  children,
  headerRight,
}: {
  items: NavItem[];
  areaLabel: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Sidebar — static on desktop */}
      <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Logo />
        </div>
        <SidebarNav items={items} pathname={pathname} areaLabel={areaLabel} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-64 max-w-[80vw] flex-col border-r border-line bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface-sunken"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <SidebarNav
              items={items}
              pathname={pathname}
              areaLabel={areaLabel}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-9 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <span className="text-sm font-medium text-ink">{areaLabel}</span>

          <div className="ml-auto flex items-center gap-2">{headerRight}</div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  areaLabel,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  areaLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={areaLabel} className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {items.map((item) => {
        const Icon = navIcon(item.icon);

        // Exact match for the dashboard root, prefix match for sub-pages, so
        // "Overview" does not stay highlighted on every nested route.
        const active =
          item.href.endsWith("/dashboard")
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              active
                ? "bg-brand-soft font-medium text-brand-ink"
                : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white tabular">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
