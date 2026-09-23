import "server-only";

import { FoodStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Listing lifecycle maintenance.
 *
 * Two rules keep the marketplace honest without a background worker:
 *
 *  - A listing past its pickup deadline is EXPIRED and cannot be bought.
 *  - A listing with no stock left is SOLD_OUT.
 *
 * `expireStaleListings` is safe to call from any request path: it is a pair of
 * set-based updates, and it is invoked opportunistically when the marketplace
 * or a restaurant inventory page is loaded, so statuses correct themselves
 * without needing a scheduler.
 */

export async function expireStaleListings(now: Date = new Date()) {
  const [expired, soldOut] = await prisma.$transaction([
    // Anything past its pickup deadline is no longer purchasable.
    prisma.foodItem.updateMany({
      where: {
        pickupDeadline: { lte: now },
        status: { in: [FoodStatus.AVAILABLE, FoodStatus.SOLD_OUT] },
      },
      data: { status: FoodStatus.EXPIRED },
    }),
    // Anything with no stock left reads as sold out, unless it has expired.
    prisma.foodItem.updateMany({
      where: {
        stock: { lte: 0 },
        pickupDeadline: { gt: now },
        status: FoodStatus.AVAILABLE,
      },
      data: { status: FoodStatus.SOLD_OUT },
    }),
  ]);

  return { expired: expired.count, soldOut: soldOut.count };
}

/**
 * Restore a listing to AVAILABLE when a restaurant adds stock back to something
 * that had sold out, provided it has not passed its pickup deadline.
 */
export async function reviveIfRestocked(now: Date = new Date()) {
  const result = await prisma.foodItem.updateMany({
    where: {
      status: FoodStatus.SOLD_OUT,
      stock: { gt: 0 },
      pickupDeadline: { gt: now },
    },
    data: { status: FoodStatus.AVAILABLE },
  });
  return result.count;
}

/**
 * How urgently a restaurant should look at a listing, for the "Low stock"
 * panel. Returns the listings that are close to running out but still sellable.
 */
export async function getLowStockItems(restaurantId: string, threshold = 3) {
  return prisma.foodItem.findMany({
    where: {
      restaurantId,
      status: FoodStatus.AVAILABLE,
      stock: { lte: threshold, gt: 0 },
      pickupDeadline: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      stock: true,
      grade: true,
      pickupDeadline: true,
      discountPrice: true,
    },
    orderBy: { stock: "asc" },
    take: 6,
  });
}
