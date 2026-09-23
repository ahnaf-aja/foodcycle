import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { requireAdmin } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Restaurants" };

export const dynamic = "force-dynamic";

/**
 * Restaurants on the platform.
 *
 * Read-only: a restaurant manages its own listings, and an administrator
 * intervening in someone's inventory is not a workflow this product needs. What
 * is useful here is the shape of the platform — who is listing, and how much is
 * actually moving.
 */
export default async function AdminRestaurantsPage() {
  await requireAdmin();

  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      cuisine: true,
      isOpen: true,
      createdAt: true,
      owner: { select: { name: true, email: true } },
      _count: { select: { foodItems: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Revenue per restaurant, so the table shows what is actually happening.
  const revenue = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: { status: "COMPLETED" },
    _sum: { total: true },
    _count: { _all: true },
  });

  const revenueById = new Map(
    revenue.map((row) => [
      row.restaurantId,
      { total: row._sum.total ?? 0, completed: row._count._all },
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Restaurants
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {restaurants.length} registered{" "}
          {restaurants.length === 1 ? "restaurant" : "restaurants"}.
        </p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {restaurants.map((restaurant) => {
          const stats = revenueById.get(restaurant.id);

          return (
            <li key={restaurant.id} className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-4">
              <div className="min-w-[14rem] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/restaurants/${restaurant.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand-ink"
                  >
                    {restaurant.name}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </Link>
                  {!restaurant.isOpen && (
                    <span className="rounded-xs bg-unavailable-soft px-2 py-0.5 text-xs font-medium text-unavailable">
                      Closed
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-ink-muted">
                  {restaurant.cuisine ?? "—"} · {restaurant.city}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {restaurant.owner.name ?? "—"} · {restaurant.owner.email}
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs text-ink-muted">Listings</p>
                <p className="mt-0.5 text-sm font-medium text-ink tabular">
                  {restaurant._count.foodItems}
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs text-ink-muted">Orders</p>
                <p className="mt-0.5 text-sm font-medium text-ink tabular">
                  {restaurant._count.orders}
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs text-ink-muted">Sold</p>
                <p className="mt-0.5 text-sm font-medium text-ink tabular">
                  {formatRupiah(stats?.total ?? 0)}
                </p>
                <p className="text-xs text-ink-muted tabular">
                  {stats?.completed ?? 0} completed
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs text-ink-muted">Joined</p>
                <p className="mt-0.5 text-sm text-ink-soft">{formatDate(restaurant.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
