import type { Metadata } from "next";

import { NotificationsPageBody } from "@/components/notifications/page-body";
import { requireRestaurant } from "@/server/auth-guards";

export const metadata: Metadata = { title: "Notifications" };

export default async function RestaurantNotificationsPage() {
  const { user } = await requireRestaurant();
  return <NotificationsPageBody userId={user.id} />;
}
