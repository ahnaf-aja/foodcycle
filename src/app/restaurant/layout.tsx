import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { NotificationBell } from "@/components/layout/nav-actions";
import { ProfileMenu } from "@/components/layout/nav-actions";
import { requireRestaurant } from "@/server/auth-guards";
import { getUnreadCount } from "@/server/notifications";
import { getRestaurantOrderCounts } from "@/server/orders";
import { getLowStockItems } from "@/server/jobs";

/**
 * The restaurant area.
 *
 * The sidebar carries a live count of orders awaiting action, so the operator
 * can see there is work waiting without opening the orders page. Nothing else
 * in the navigation is badged — a badge that is always there stops meaning
 * anything.
 */
export default async function RestaurantLayout({ children }: LayoutProps<"/restaurant">) {
  const { user, restaurant } = await requireRestaurant();

  const [counts, unread, lowStock] = await Promise.all([
    getRestaurantOrderCounts(restaurant.id),
    getUnreadCount(user.id),
    getLowStockItems(restaurant.id),
  ]);

  // An order needs attention at PENDING and at READY (waiting to be handed over).
  const needsAction = counts.PENDING + counts.READY;

  const items: NavItem[] = [
    { href: "/restaurant/dashboard", label: "Overview", icon: "dashboard" },
    { href: "/restaurant/orders", label: "Orders", icon: "package", badge: needsAction },
    { href: "/restaurant/food", label: "Food", icon: "utensils" },
    {
      href: "/restaurant/inventory",
      label: "Inventory",
      icon: "boxes",
      badge: lowStock.length,
    },
    { href: "/restaurant/reviews", label: "Reviews", icon: "star" },
    { href: "/restaurant/notifications", label: "Notifications", icon: "bell", badge: unread },
    { href: "/restaurant/profile", label: "Restaurant profile", icon: "store" },
  ];

  return (
    <DashboardShell
      items={items}
      areaLabel={restaurant.name}
      headerRight={
        <>
          <NotificationBell count={unread} />
          <ProfileMenu
            user={{
              name: user.name,
              email: user.email,
              role: user.role,
              image: user.image,
            }}
            homeHref="/restaurant/dashboard"
          />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
