import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Impact reporting.
 *
 * Figures are always summed from `ImpactRecord` rows — one row per completed
 * order — rather than kept as a running counter. A counter can drift or be
 * double-incremented; a sum cannot, and it stays correct if a row is corrected
 * after the fact.
 *
 * The personal and community views use the same source, so "your impact" is
 * genuinely a subset of the community total.
 */

export type ImpactSummary = {
  mealsSaved: number;
  mealsDonated: number;
  weightKg: number;
  /** Completed orders that contributed. */
  orders: number;
};

const EMPTY: ImpactSummary = {
  mealsSaved: 0,
  mealsDonated: 0,
  weightKg: 0,
  orders: 0,
};

/** One customer's totals. */
export async function getPersonalImpact(userId: string): Promise<ImpactSummary> {
  const result = await prisma.impactRecord.aggregate({
    where: { userId },
    _sum: { mealsSaved: true, mealsDonated: true, weightKg: true },
    _count: { _all: true },
  });

  return {
    mealsSaved: result._sum.mealsSaved ?? 0,
    mealsDonated: result._sum.mealsDonated ?? 0,
    weightKg: Math.round((result._sum.weightKg ?? 0) * 10) / 10,
    orders: result._count._all,
  };
}

/**
 * Platform-wide totals — every impact record, including the seeded community
 * history, so the figure reflects the whole marketplace rather than one user.
 */
export async function getCommunityImpact(): Promise<ImpactSummary> {
  const result = await prisma.impactRecord.aggregate({
    _sum: { mealsSaved: true, mealsDonated: true, weightKg: true },
    _count: { _all: true },
  });

  return {
    mealsSaved: result._sum.mealsSaved ?? 0,
    mealsDonated: result._sum.mealsDonated ?? 0,
    weightKg: Math.round((result._sum.weightKg ?? 0) * 10) / 10,
    orders: result._count._all,
  };
}

/**
 * Daily totals for the last `days` days, for a simple trend line.
 * Returns a dense series (days with no activity are zeroes) so a chart never
 * implies activity that did not happen.
 */
export async function getImpactTrend(
  days = 30,
  userId?: string,
): Promise<{ date: string; mealsSaved: number; mealsDonated: number }[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.impactRecord.findMany({
    where: {
      createdAt: { gte: since },
      ...(userId ? { userId } : {}),
    },
    select: { createdAt: true, mealsSaved: true, mealsDonated: true },
  });

  // Bucket by local calendar day.
  const buckets = new Map<string, { mealsSaved: number; mealsDonated: number }>();
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    buckets.set(day.toISOString().slice(0, 10), { mealsSaved: 0, mealsDonated: 0 });
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.mealsSaved += row.mealsSaved;
    bucket.mealsDonated += row.mealsDonated;
  }

  return [...buckets.entries()].map(([date, value]) => ({ date, ...value }));
}

/** The institutions a customer can donate to, for the checkout step. */
export async function getDonationInstitutions(city?: string) {
  const institutions = await prisma.socialInstitution.findMany({
    where: { verified: true, ...(city ? { city } : {}) },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      city: true,
      description: true,
      image: true,
      supportedCount: true,
      needs: true,
      _count: { select: { donations: true } },
    },
    orderBy: [{ supportedCount: "desc" }, { name: "asc" }],
  });

  // Prefer institutions in the customer's city, but never hide the rest —
  // a donation is still useful even if it travels further.
  if (city) {
    institutions.sort((a, b) => {
      const aLocal = a.city === city ? 0 : 1;
      const bLocal = b.city === city ? 0 : 1;
      return aLocal - bLocal;
    });
  }

  return institutions;
}

/** Donation totals per institution, for the institution's own dashboard. */
export async function getInstitutionImpact(institutionId: string) {
  const result = await prisma.donation.aggregate({
    where: { institutionId, status: "DELIVERED" },
    _sum: { meals: true, weightKg: true },
    _count: { _all: true },
  });

  return {
    mealsReceived: result._sum.meals ?? 0,
    weightKg: Math.round((result._sum.weightKg ?? 0) * 10) / 10,
    deliveries: result._count._all,
  };
}

/** Restaurant-side totals: meals sold on and given away. */
export async function getRestaurantImpact(restaurantId: string) {
  const [orders, donations] = await Promise.all([
    prisma.order.aggregate({
      where: { restaurantId, status: "COMPLETED" },
      _sum: { total: true, savings: true },
      _count: { _all: true },
    }),
    prisma.donation.aggregate({
      where: { restaurantId, status: "DELIVERED" },
      _sum: { meals: true, weightKg: true },
      _count: { _all: true },
    }),
  ]);

  return {
    completedOrders: orders._count._all,
    revenue: orders._sum.total ?? 0,
    customerSavings: orders._sum.savings ?? 0,
    mealsDonated: donations._sum.meals ?? 0,
    weightDiverted: Math.round((donations._sum.weightKg ?? 0) * 10) / 10,
    donationsCompleted: donations._count._all,
  };
}

export { EMPTY as EMPTY_IMPACT };
