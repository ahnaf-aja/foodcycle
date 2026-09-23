import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { NotificationBell, ProfileMenu } from "@/components/layout/nav-actions";
import { requireInstitution } from "@/server/auth-guards";
import { getUnreadCount } from "@/server/notifications";
import { prisma } from "@/lib/prisma";

/**
 * The institution area.
 *
 * A deliberately small navigation: an institution has two jobs here — see what
 * is coming, and confirm what arrived. The badge counts donations still in
 * transit, which is exactly the work waiting to be acknowledged.
 */
export default async function InstitutionLayout({ children }: LayoutProps<"/institution">) {
  const { user, institution } = await requireInstitution();

  const [unread, incoming] = await Promise.all([
    getUnreadCount(user.id),
    prisma.donation.count({
      where: {
        institutionId: institution.id,
        status: { in: ["CREATED", "CONFIRMED", "PREPARING", "READY", "DELIVERING"] },
      },
    }),
  ]);

  const items: NavItem[] = [
    { href: "/institution/dashboard", label: "Overview", icon: "dashboard" },
    {
      href: "/institution/donations",
      label: "Donations",
      icon: "heart",
      badge: incoming,
    },
    {
      href: "/institution/notifications",
      label: "Notifications",
      icon: "bell",
      badge: unread,
    },
    { href: "/institution/profile", label: "Institution profile", icon: "building" },
  ];

  return (
    <DashboardShell
      items={items}
      areaLabel={institution.name}
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
            homeHref="/institution/dashboard"
          />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
