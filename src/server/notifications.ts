import "server-only";

import { NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Database-backed notifications.
 *
 * In-app only: no email or push. The bell shows an unread count, and every
 * notification links to the page where the user can act on it.
 *
 * Notification writes accept a transaction client so they can be created in the
 * same transaction as the change they describe — a notification can never
 * survive a rolled-back order.
 */

type Tx = Prisma.TransactionClient | typeof prisma;

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
};

export async function createNotification(input: NotificationInput, tx: Tx = prisma) {
  return tx.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

/** Create several at once — used when one event concerns multiple parties. */
export async function createNotifications(inputs: NotificationInput[], tx: Tx = prisma) {
  if (inputs.length === 0) return;
  await tx.notification.createMany({ data: inputs });
}

export async function getNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });
}

export async function getUnreadCount(userId: string | undefined): Promise<number> {
  if (!userId) return 0;
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAsRead(userId: string, notificationId: string) {
  // Scoped by userId so one user cannot mark another's notification read.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

/**
 * The unread badge, capped for display: "9+" beyond nine, so the bell never
 * grows wide enough to distort the header.
 */
export function formatUnreadCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
