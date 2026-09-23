import "server-only";

import { DonationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Donation reads for the institution and restaurant sides.
 *
 * The order's status remains the source of truth for progress; the donation row
 * carries the institution-specific facts (meals, weight, receipt). Where a
 * view needs both, they are selected together so the two can never be rendered
 * from different moments.
 */

export type InstitutionDonation = Awaited<
  ReturnType<typeof getInstitutionDonations>
>[number];

const DONATION_SELECT = {
  id: true,
  status: true,
  meals: true,
  weightKg: true,
  notes: true,
  createdAt: true,
  deliveredAt: true,
  receivedAt: true,
  receivedBy: true,
  restaurant: {
    select: { id: true, name: true, slug: true, city: true, address: true, phone: true },
  },
  donor: { select: { id: true, name: true } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          grade: true,
          foodItemId: true,
        },
      },
    },
  },
} as const;

/**
 * A donation still on its way needs the institution's attention; one already
 * received does not, so they are separated rather than mixed.
 */
export async function getInstitutionDonations(
  institutionId: string,
  options: { status?: DonationStatus[]; limit?: number } = {},
) {
  return prisma.donation.findMany({
    where: {
      institutionId,
      ...(options.status?.length ? { status: { in: options.status } } : {}),
    },
    select: DONATION_SELECT,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
}

export async function getInstitutionDonationCounts(institutionId: string) {
  const rows = await prisma.donation.groupBy({
    by: ["status"],
    where: { institutionId },
    _count: { _all: true },
  });

  const counts: Record<DonationStatus, number> = {
    CREATED: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    READY: 0,
    DELIVERING: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };

  for (const row of rows) counts[row.status] = row._count._all;

  // "Incoming" spans everything not yet received or cancelled.
  const incoming =
    counts.CREATED +
    counts.CONFIRMED +
    counts.PREPARING +
    counts.READY +
    counts.DELIVERING;

  return { counts, incoming, delivered: counts.DELIVERED, cancelled: counts.CANCELLED };
}

/** Donations the restaurant owes an institution — used on the restaurant side. */
export async function getRestaurantDonations(restaurantId: string, limit = 50) {
  return prisma.donation.findMany({
    where: { restaurantId },
    select: {
      id: true,
      status: true,
      meals: true,
      weightKg: true,
      createdAt: true,
      deliveredAt: true,
      receivedAt: true,
      institution: { select: { id: true, name: true, city: true, type: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          notes: true,
          items: {
            select: { id: true, name: true, quantity: true, grade: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Recent donations for the public impact page. */
export async function getRecentDonations(limit = 6) {
  return prisma.donation.findMany({
    where: { status: DonationStatus.DELIVERED },
    select: {
      id: true,
      meals: true,
      weightKg: true,
      deliveredAt: true,
      institution: { select: { name: true, city: true, type: true } },
      restaurant: { select: { name: true, city: true } },
    },
    orderBy: { deliveredAt: "desc" },
    take: limit,
  });
}
