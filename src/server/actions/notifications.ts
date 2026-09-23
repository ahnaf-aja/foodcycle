"use server";

import { revalidatePath } from "next/cache";

import { assertUser } from "@/server/auth-guards";
import { markAsRead, markAllAsRead } from "@/server/notifications";
import type { ActionState } from "@/lib/validation";

/** Marking notifications read refreshes the bell's unread count. */
function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionState> {
  try {
    const user = await assertUser();
    await markAsRead(user.id, notificationId);
    revalidateNotifications();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  try {
    const user = await assertUser();
    await markAllAsRead(user.id);
    revalidateNotifications();
    return { ok: true, message: "All caught up." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
