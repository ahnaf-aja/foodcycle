import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { OrderQueue, type QueueOrder } from "@/components/restaurant/order-queue";
import { requireRestaurant } from "@/server/auth-guards";
import { getRestaurantOrders, getRestaurantOrderCounts } from "@/server/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Orders" };

export const dynamic = "force-dynamic";

/**
 * The restaurant's order queue.
 *
 * Filtered by view rather than showing everything at once, because the operator
 * is always answering one of three questions: what is new, what is in progress,
 * or what happened recently. The counts on each tab come from a grouped query,
 * so they are real numbers rather than the length of the filtered list.
 */

const VIEWS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "new", label: "New", statuses: ["PENDING"] },
  {
    key: "active",
    label: "In progress",
    statuses: ["CONFIRMED", "PREPARING", "READY", "ON_DELIVERY"],
  },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
  {
    key: "all",
    label: "All",
    statuses: [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "ON_DELIVERY",
      "COMPLETED",
      "CANCELLED",
    ],
  },
];

export default async function RestaurantOrdersPage(
  props: PageProps<"/restaurant/orders">,
) {
  const { restaurant } = await requireRestaurant();
  const params = await props.searchParams;

  const rawView = typeof params.view === "string" ? params.view : "new";
  const view = VIEWS.find((candidate) => candidate.key === rawView) ?? VIEWS[0];

  const [orders, counts] = await Promise.all([
    getRestaurantOrders(restaurant.id, { status: view.statuses, limit: 60 }),
    getRestaurantOrderCounts(restaurant.id),
  ]);

  const queue = orders as unknown as QueueOrder[];

  const countFor = (statuses: OrderStatus[]) =>
    statuses.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every change you make here is visible to the customer straight away.
        </p>
      </div>

      <nav aria-label="Order views" className="-mx-1 flex overflow-x-auto pb-1">
        {VIEWS.map((candidate) => {
          const active = candidate.key === view.key;
          const count = countFor(candidate.statuses);

          return (
            <Link
              key={candidate.key}
              href={`/restaurant/orders?view=${candidate.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-brand-soft text-brand-ink"
                  : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {candidate.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular",
                  active ? "bg-brand text-white" : "bg-surface-sunken text-ink-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-16 text-center">
          <Inbox aria-hidden="true" className="size-6 text-ink-muted" />
          <h2 className="mt-4 text-base font-semibold text-ink">
            {view.key === "new"
              ? "No new orders right now"
              : view.key === "active"
                ? "Nothing in progress"
                : view.key === "completed"
                  ? "No completed orders yet"
                  : view.key === "cancelled"
                    ? "No cancelled orders"
                    : "No orders yet"}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
            {view.key === "new"
              ? "New orders and donations will appear here as soon as a customer checks out."
              : "Try another view to see your other orders."}
          </p>
        </div>
      ) : (
        <OrderQueue orders={queue} />
      )}
    </div>
  );
}
