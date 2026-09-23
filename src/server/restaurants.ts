import "server-only";

import { FoodStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Restaurant reads.
 *
 * A restaurant page shows what that kitchen currently has that a customer can
 * actually buy — the same availability rule the marketplace applies, so a
 * listing can never appear here that could not be ordered.
 */

/** Only listings that are live, in stock, and still within their pickup window. */
function purchasable() {
  return {
    status: FoodStatus.AVAILABLE,
    stock: { gt: 0 },
    pickupDeadline: { gt: new Date() },
  } as const;
}

export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      cuisine: true,
      image: true,
      address: true,
      city: true,
      phone: true,
      isOpen: true,
      createdAt: true,
      foodItems: {
        where: purchasable(),
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          image: true,
          originalPrice: true,
          discountPrice: true,
          stock: true,
          grade: true,
          qualityScore: true,
          expirationTime: true,
          pickupDeadline: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              cuisine: true,
              address: true,
            },
          },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true, orderItems: true } },
        },
        orderBy: [{ qualityScore: "desc" }, { pickupDeadline: "asc" }],
      },
      reviews: {
        where: { comment: { not: null } },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 9,
      },
    },
  });
}

/** Published institutions, for the public institution page. */
export async function getInstitutionBySlug(slug: string) {
  return prisma.socialInstitution.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      address: true,
      city: true,
      phone: true,
      supportedCount: true,
      needs: true,
      verified: true,
      createdAt: true,
      _count: { select: { donations: true } },
    },
  });
}
