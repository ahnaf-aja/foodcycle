import type { Metadata } from "next";

import { NotificationsPageBody } from "@/components/notifications/page-body";
import { requireInstitution } from "@/server/auth-guards";

export const metadata: Metadata = { title: "Notifications" };

export default async function InstitutionNotificationsPage() {
  const { user } = await requireInstitution();
  return <NotificationsPageBody userId={user.id} />;
}
