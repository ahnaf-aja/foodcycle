import type { Metadata } from "next";

import { NotificationsPageBody } from "@/components/notifications/page-body";
import { Container } from "@/components/layout/shell";
import { requireUser } from "@/server/auth-guards";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  return (
    <Container className="py-8 sm:py-10">
      <NotificationsPageBody userId={user.id} />
    </Container>
  );
}
