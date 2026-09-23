import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { InventoryList, type InventoryRow } from "@/components/restaurant/inventory-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRestaurant } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { expireStaleListings } from "@/server/jobs";

export const metadata: Metadata = { title: "Inventory" };

export const dynamic = "force-dynamic";

/**
 * Inventory.
 *
 * Statuses are refreshed before the page reads them, so the operator never sees
 * a listing described as available that has in fact passed its deadline — the
 * same housekeeping the customer's view of the marketplace relies on.
 */
export default async function RestaurantInventoryPage() {
  const { restaurant } = await requireRestaurant();

  // Bring every listing's status up to date first.
  await expireStaleListings();

  const rows = await prisma.foodItem.findMany({
    where: { restaurantId: restaurant.id },
    select: {
      id: true,
      name: true,
      category: true,
      originalPrice: true,
      discountPrice: true,
      stock: true,
      grade: true,
      qualityScore: true,
      status: true,
      pickupDeadline: true,
      expirationTime: true,
      _count: { select: { orderItems: true } },
    },
    orderBy: [{ status: "asc" }, { pickupDeadline: "asc" }],
  });

  const needsAttention = rows.filter(
    (row) =>
      row.status === "AVAILABLE" && (row.stock <= 3 || row.pickupDeadline <= new Date(Date.now() + 2 * 3_600_000)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Inventory</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Stock updates itself as orders come in. Adjust it here when you cook
          more, or withdraw a listing you no longer have.
        </p>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-lg border border-soon/30 bg-soon-soft px-4 py-3">
          <p className="text-sm font-medium text-soon">Worth a look</p>
          <ul className="mt-1.5 space-y-0.5 text-sm text-soon">
            {needsAttention.slice(0, 4).map((row) => (
              <li key={row.id}>
                {row.name} —{" "}
                {row.stock <= 3
                  ? `${row.stock} ${row.stock === 1 ? "portion" : "portions"} left`
                  : "pickup window closing soon"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory yet"
          description="Once you create a listing it will appear here, with its stock and pickup window, ready to adjust."
          action={{ href: "/restaurant/food/new", label: "Create a listing" }}
        />
      ) : (
        <InventoryList rows={rows as unknown as InventoryRow[]} />
      )}
    </div>
  );
}
