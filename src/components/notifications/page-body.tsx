import { Bell } from "lucide-react";

import { NotificationList } from "./notification-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getNotifications } from "@/server/notifications";

/**
 * The notifications page body, shared by all four roles.
 *
 * Each area supplies its own layout, so this renders only the heading and the
 * list — the same notifications, read from the same table, for whichever user
 * is signed in.
 */
export async function NotificationsPageBody({ userId }: { userId: string }) {
  const notifications = await getNotifications(userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Updates about your orders, donations, and listings.
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing to catch up on"
          description="Order updates and donation confirmations will appear here as they happen."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
