import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { NotificationBell, ProfileMenu } from "@/components/layout/nav-actions";
import { requireAdmin } from "@/server/auth-guards";
import { getUnreadCount } from "@/server/notifications";
import { prisma } from "@/lib/prisma";

/**
 * The admin area.
 *
 * Deliberately minimal. Admin exists to verify institutions and see whether the
 * marketplace is healthy — not to become a second product with its own
 * analytics suite.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  const [unread, pendingInstitutions] = await Promise.all([
    getUnreadCount(user.id),
    prisma.socialInstitution.count({ where: { verified: false } }),
  ]);

  const items: NavItem[] = [
    { href: "/admin/dashboard", label: "Overview", icon: "dashboard" },
    {
      href: "/admin/institutions",
      label: "Institutions",
      icon: "building",
      badge: pendingInstitutions,
    },
    { href: "/admin/restaurants", label: "Restaurants", icon: "store" },
    { href: "/admin/users", label: "Users", icon: "users" },
  ];

  return (
    <DashboardShell
      items={items}
      areaLabel="Administration"
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
            homeHref="/admin/dashboard"
          />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
