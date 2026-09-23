"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  Heart,
  PackageCheck,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";

import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/server/actions/notifications";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationType } from "@prisma/client";

/**
 * The notification list.
 *
 * Marking read is optimistic: the unread dot clears instantly and the row stays
 * interactive, while the server call settles in the background. Nothing here is
 * consequential enough to make someone wait for a round trip.
 */

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

/** An icon per notification kind, so the list is scannable at a glance. */
const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
  ORDER_PLACED: ShoppingBag,
  ORDER_CONFIRMED: PackageCheck,
  ORDER_PREPARING: PackageCheck,
  ORDER_READY: PackageCheck,
  ORDER_ON_DELIVERY: PackageCheck,
  ORDER_COMPLETED: PackageCheck,
  ORDER_CANCELLED: TriangleAlert,
  DONATION_CREATED: Heart,
  DONATION_ON_DELIVERY: Heart,
  DONATION_DELIVERED: Heart,
  DONATION_RECEIVED: Heart,
  LOW_STOCK: TriangleAlert,
  SYSTEM: BellRing,
};

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Optimistically flip rows to read without waiting for the server.
  const [rows, markReadOptimistic] = useOptimistic(
    notifications,
    (current: NotificationRow[], id: string | "all") =>
      current.map((row) =>
        id === "all" || row.id === id ? { ...row, read: true } : row,
      ),
  );

  const unread = rows.filter((row) => !row.read).length;

  function markRead(id: string) {
    startTransition(async () => {
      markReadOptimistic(id);
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      markReadOptimistic("all");
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            {unread} unread {unread === 1 ? "notification" : "notifications"}
          </p>
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-brand-ink transition-colors duration-150 hover:bg-brand-soft disabled:opacity-60"
          >
            <CheckCheck aria-hidden="true" className="size-4" />
            Mark all as read
          </button>
        </div>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {rows.map((row) => {
          const Icon = ICONS[row.type] ?? Bell;

          const content = (
            <>
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  row.read ? "text-ink-muted" : "text-brand",
                )}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      "text-sm",
                      row.read ? "text-ink-soft" : "font-semibold text-ink",
                    )}
                  >
                    {row.title}
                  </p>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {timeAgo(row.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{row.body}</p>
              </div>

              {/* The unread marker pairs the dot with text for screen readers. */}
              {!row.read && (
                <span className="mt-1.5 shrink-0" aria-label="Unread">
                  <span aria-hidden="true" className="block size-2 rounded-full bg-brand" />
                </span>
              )}
            </>
          );

          return (
            <li key={row.id}>
              {row.link ? (
                <Link
                  href={row.link}
                  onClick={() => !row.read && markRead(row.id)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors duration-150",
                    row.read ? "hover:bg-surface-sunken" : "bg-brand-soft/40 hover:bg-brand-soft",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5",
                    !row.read && "bg-brand-soft/40",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
