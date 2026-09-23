import {
  Bell,
  Boxes,
  Building2,
  Heart,
  LayoutDashboard,
  Package,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Nav icons, addressed by name.
 *
 * Why names instead of components: the three dashboard layouts are Server
 * Components, and `DashboardShell` is a Client Component. Anything crossing
 * that boundary must be serialisable, and a React component (`LayoutDashboard`,
 * i.e. a function) is not — passing one throws
 * "Functions cannot be passed directly to Client Components" and takes the
 * whole page down to client rendering. A string crosses the boundary fine, and
 * the lookup happens here, on the client side.
 *
 * The map is explicit rather than `import * as Lucide` on purpose: a namespace
 * import would pull the entire icon set into the client bundle.
 */

const NAV_ICONS = {
  bell: Bell,
  boxes: Boxes,
  building: Building2,
  dashboard: LayoutDashboard,
  heart: Heart,
  package: Package,
  star: Star,
  store: Store,
  users: Users,
  utensils: UtensilsCrossed,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;

/** Resolve a nav icon name, falling back to a neutral square if it is unknown. */
export function navIcon(name: NavIconName): LucideIcon {
  return NAV_ICONS[name] ?? LayoutDashboard;
}
