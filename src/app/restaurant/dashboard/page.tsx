import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Inbox } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { OrderQueue, type QueueOrder } from "@/components/restaurant/order-queue";
import { requireRestaurant } from "@/server/auth-guards";
import { getRestaurantOrders, getRestaurantOrderCounts } from "@/server/orders";
import { getLowStockItems, expireStaleListings } from "@/server/jobs";
import { getRestaurantImpact } from "@/server/impact";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTime, timeRemaining } from "@/lib/utils";
import { GRADE_META } from "@/lib/domain";

export const metadata: Metadata = { title: "Overview" };

export const dynamic = "force-dynamic";

/**
 * The restaurant overview.
 *
 * Ordered by what needs doing, not by what is interesting to look at: orders
 * awaiting action come first, then today's listings and anything about to sell
 * out. There are no charts here — a kitchen does not need a trend line, it
 * needs to know what to cook next.
 */
export default async function RestaurantDashboardPage() {
  const { restaurant } = await requireRestaurant();

  // Bring listing statuses up to date before reporting on them.
  await expireStaleListings();

  const [counts, actionable, lowStock, impact, todaysListings] = await Promise.all([
    getRestaurantOrderCounts(restaurant.id),
    getRestaurantOrders(restaurant.id, {
      status: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
      limit: 8,
    }),
    getLowStockItems(restaurant.id),
    getRestaurantImpact(restaurant.id),
    prisma.foodItem.findMany({
      where: {
        restaurantId: restaurant.id,
        status: "AVAILABLE",
        pickupDeadline: { gt: new Date() },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        grade: true,
        discountPrice: true,
        pickupDeadline: true,
        qualityScore: true,
      },
      orderBy: { pickupDeadline: "asc" },
      take: 6,
    }),
  ]);

  const queue = actionable as unknown as QueueOrder[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Today at {restaurant.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {counts.PENDING > 0
            ? `${counts.PENDING} ${counts.PENDING === 1 ? "order needs" : "orders need"} your confirmation.`
            : "No orders are waiting for confirmation."}
        </p>
      </div>

      {/* The queue, in the order a kitchen works it. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="New orders"
          value={counts.PENDING}
          tone={counts.PENDING > 0 ? "soon" : "neutral"}
          hint={counts.PENDING > 0 ? "Awaiting confirmation" : "All confirmed"}
          href="/restaurant/orders?view=new"
        />
        <Stat
          label="Preparing"
          value={counts.PREPARING + counts.CONFIRMED}
          hint="In the kitchen"
          href="/restaurant/orders?view=active"
        />
        <Stat
          label="Ready for pickup"
          value={counts.READY}
          tone={counts.READY > 0 ? "available" : "neutral"}
          hint="Waiting to be collected"
          href="/restaurant/orders?view=active"
        />
        <Stat
          label="Low stock"
          value={lowStock.length}
          tone={lowStock.length > 0 ? "soon" : "neutral"}
          hint={lowStock.length > 0 ? "Listings nearly sold out" : "Everything is well stocked"}
          href="/restaurant/inventory"
        />
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Orders to action</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Accept, prepare, and hand over. The customer sees each change
              immediately.
            </p>
          </div>
          <Link
            href="/restaurant/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
          >
            All orders
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-12 text-center">
            <Inbox aria-hidden="true" className="size-6 text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink">No new orders right now</p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              When a customer orders or donates, it will appear here for you to
              confirm.
            </p>
          </div>
        ) : (
          <OrderQueue orders={queue} />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Today's listings */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Today&rsquo;s listings
            </h2>
            <Link
              href="/restaurant/food"
              className="text-sm font-medium text-brand-ink hover:underline"
            >
              Manage
            </Link>
          </div>

          {todaysListings.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface px-5 py-8 text-center">
              <p className="text-sm font-medium text-ink">Nothing listed right now</p>
              <p className="mt-1 text-sm text-ink-muted">
                List what you have left and it appears in the marketplace
                immediately.
              </p>
              <Link
                href="/restaurant/food/new"
                className="mt-4 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
              >
                Create a listing
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {todaysListings.map((item) => {
                const remaining = timeRemaining(item.pickupDeadline);
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/restaurant/food/${item.id}`}
                        className="truncate text-sm font-medium text-ink hover:text-brand-ink"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {GRADE_META[item.grade].label} · quality {item.qualityScore}%
                        {remaining && <> · {remaining}</>}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-ink tabular">
                        {formatRupiah(item.discountPrice)}
                      </p>
                      <p
                        className={
                          item.stock <= 3
                            ? "text-xs font-medium text-soon tabular"
                            : "text-xs text-ink-muted tabular"
                        }
                      >
                        {item.stock} left
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Low stock — only shown when there is something to say. */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Low stock
          </h2>

          {lowStock.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-5 py-8">
              <CheckCircle2 aria-hidden="true" className="size-5 text-available" />
              <p className="text-sm text-ink-muted">
                Nothing is close to selling out.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/restaurant/inventory`}
                      className="truncate text-sm font-medium text-ink hover:text-brand-ink"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Pickup before {formatTime(item.pickupDeadline)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-soon tabular">
                    {item.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* A short, factual record of what this restaurant has kept in use. */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Your record on FoodCycle</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-muted">Completed orders</dt>
            <dd className="mt-1 text-xl font-semibold text-ink tabular">
              {impact.completedOrders}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Revenue from surplus</dt>
            <dd className="mt-1 text-xl font-semibold text-ink tabular">
              {formatRupiah(impact.revenue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Meals donated</dt>
            <dd className="mt-1 text-xl font-semibold text-ink tabular">
              {impact.mealsDonated}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Food kept in use</dt>
            <dd className="mt-1 text-xl font-semibold text-ink tabular">
              {impact.weightDiverted.toFixed(1)} kg
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
