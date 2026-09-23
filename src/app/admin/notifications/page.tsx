import type { Metadata } from "next";

import { NotificationsPageBody } from "@/components/notifications/page-body";
import { requireAdmin } from "@/server/auth-guards";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();
  return <NotificationsPageBody userId={user.id} />;
}
