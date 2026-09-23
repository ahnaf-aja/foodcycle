import "server-only";

import { Prisma, FoodStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  recommend,
  buildProfile,
  emptyProfile,
  type RecommendationProfile,
  type ScorableItem,
} from "@/lib/recommendation";
import { deadlineUrgency } from "@/lib/utils";

/**
 * Marketplace data access.
 *
 * Every read here reflects the database exactly as it is now. Listings are
 * never cached — a customer must never see stock that has already gone.
 */

/** A listing joined with the aggregate facts a card or the scorer needs. */
const listingSelect = {
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
  reviews: {
    select: { rating: true },
  },
  _count: {
    select: { reviews: true, orderItems: true },
  },
} satisfies Prisma.FoodItemSelect;

export type MarketplaceListing = Prisma.FoodItemGetPayload<{
  select: typeof listingSelect;
}>;

/**
 * Flatten a Prisma listing into the shape the recommendation engine scores.
 * `totalSold` sums the quantities of every order line ever placed against the
 * item — a truer popularity signal than review count alone.
 */
function toScorable(listing: MarketplaceListing): ScorableItem {
  const ratings = listing.reviews.map((r) => r.rating);
  const totalSold = listing._count.orderItems;

  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    restaurantId: listing.restaurant.id,
    restaurantName: listing.restaurant.name,
    originalPrice: listing.originalPrice,
    discountPrice: listing.discountPrice,
    qualityScore: listing.qualityScore,
    pickupDeadline: listing.pickupDeadline,
    stock: listing.stock,
    averageRating:
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    reviewCount: listing._count.reviews,
    totalSold,
  };
}

/**
 * Only listings a customer may actually buy: available, in stock, and not past
 * their pickup deadline. This is the filter that keeps expired food off the
 * marketplace even if a status update was missed.
 */
function purchasableWhere(): Prisma.FoodItemWhereInput {
  return {
    status: FoodStatus.AVAILABLE,
    stock: { gt: 0 },
    pickupDeadline: { gt: new Date() },
  };
}

// ===========================================================================
// Filtering & sorting
// ===========================================================================

export type SortOption =
  | "recommended"
  | "newest"
  | "price-asc"
  | "discount"
  | "quality"
  | "ending-soon";

export type MarketplaceFilters = {
  q?: string;
  category?: string[];
  restaurantId?: string[];
  grade?: string[];
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  minQuality?: number;
  maxPickupHours?: number;
};

export function parseFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): MarketplaceFilters {
  const single = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const list = (key: string): string[] | undefined => {
    const value = searchParams[key];
    if (!value) return undefined;
    const parts = (Array.isArray(value) ? value : [value])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  };
  const num = (key: string): number | undefined => {
    const raw = single(key);
    if (raw === undefined || raw === "") return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    q: single("q")?.trim() || undefined,
    category: list("category"),
    restaurantId: list("restaurant"),
    grade: list("grade"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minDiscount: num("minDiscount"),
    minQuality: num("minQuality"),
    maxPickupHours: num("pickup"),
  };
}

export function parseSort(raw: string | undefined): SortOption {
  const valid: SortOption[] = [
    "recommended",
    "newest",
    "price-asc",
    "discount",
    "quality",
    "ending-soon",
  ];
  return valid.includes(raw as SortOption) ? (raw as SortOption) : "recommended";
}

/** True when the user has narrowed anything — drives the "Clear filters" state. */
export function hasActiveFilters(filters: MarketplaceFilters, sort: SortOption): boolean {
  return Boolean(
    filters.q ||
      filters.category?.length ||
      filters.restaurantId?.length ||
      filters.grade?.length ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.minDiscount !== undefined ||
      filters.minQuality !== undefined ||
      filters.maxPickupHours !== undefined ||
      sort !== "recommended",
  );
}

/**
 * Translate our filters into a Prisma `where`.
 *
 * Text search spans food name, description, category and restaurant name, so
 * "croissant" and "Roti Senja" both work from one box.
 */
function buildWhere(filters: MarketplaceFilters): Prisma.FoodItemWhereInput {
  const where: Prisma.FoodItemWhereInput = { ...purchasableWhere() };

  if (filters.q) {
    const term = filters.q;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { restaurant: { name: { contains: term, mode: "insensitive" } } },
      { restaurant: { cuisine: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (filters.category?.length) where.category = { in: filters.category };
  if (filters.restaurantId?.length) where.restaurantId = { in: filters.restaurantId };
  if (filters.grade?.length) {
    where.grade = { in: filters.grade as ("GRADE_A" | "GRADE_B" | "GRADE_C")[] };
  }

  const price: Prisma.IntFilter = {};
  if (filters.minPrice !== undefined) price.gte = filters.minPrice;
  if (filters.maxPrice !== undefined) price.lte = filters.maxPrice;
  if (Object.keys(price).length) where.discountPrice = price;

  if (filters.minQuality !== undefined) where.qualityScore = { gte: filters.minQuality };

  if (filters.maxPickupHours !== undefined) {
    where.pickupDeadline = {
      gt: new Date(),
      lte: new Date(Date.now() + filters.maxPickupHours * 3_600_000),
    };
  }

  // Discount has no column of its own — it is derived — so it is filtered in
  // memory below rather than in SQL.
  return where;
}

function applyDiscountFilter(
  listings: MarketplaceListing[],
  minDiscount: number | undefined,
): MarketplaceListing[] {
  if (minDiscount === undefined) return listings;
  return listings.filter((l) => {
    if (l.originalPrice <= 0) return false;
    const percent = ((l.originalPrice - l.discountPrice) / l.originalPrice) * 100;
    return percent >= minDiscount;
  });
}

function sortListings(
  listings: MarketplaceListing[],
  sort: SortOption,
): MarketplaceListing[] {
  const copy = [...listings];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "price-asc":
      return copy.sort((a, b) => a.discountPrice - b.discountPrice);
    case "discount":
      return copy.sort((a, b) => {
        const da = a.originalPrice ? (a.originalPrice - a.discountPrice) / a.originalPrice : 0;
        const db = b.originalPrice ? (b.originalPrice - b.discountPrice) / b.originalPrice : 0;
        return db - da;
      });
    case "quality":
      return copy.sort((a, b) => b.qualityScore - a.qualityScore);
    case "ending-soon":
      return copy.sort(
        (a, b) => a.pickupDeadline.getTime() - b.pickupDeadline.getTime(),
      );
    default:
      return copy;
  }
}

// ===========================================================================
// Public queries
// ===========================================================================

export type MarketplaceResult = {
  listings: MarketplaceListing[];
  total: number;
  /** Set when sorting by recommendation, so cards can show a subtle reason. */
  reasons: Record<string, string>;
};

/**
 * The main marketplace query. Filtering, search and sorting are applied in the
 * database where possible and in memory only where a column cannot express the
 * rule (discount percentage, recommendation order).
 */
export async function getMarketplace(options: {
  filters: MarketplaceFilters;
  sort: SortOption;
  profile?: RecommendationProfile;
  limit?: number;
  offset?: number;
  now?: Date;
}): Promise<MarketplaceResult> {
  const { filters, sort, profile = emptyProfile(), limit, offset = 0 } = options;
  const now = options.now ?? new Date();

  const rows = await prisma.foodItem.findMany({
    where: buildWhere(filters),
    select: listingSelect,
    orderBy: { createdAt: "desc" },
  });

  const filtered = applyDiscountFilter(rows, filters.minDiscount);

  if (sort === "recommended") {
    const scored = recommend(filtered.map(toScorable), profile, filtered.length, now);
    const byId = new Map(filtered.map((l) => [l.id, l]));
    const ordered = scored
      .map((s) => byId.get(s.item.id))
      .filter((l): l is MarketplaceListing => Boolean(l));

    const reasons: Record<string, string> = {};
    for (const s of scored) reasons[s.item.id] = s.reason;

    const page = typeof limit === "number" ? ordered.slice(offset, offset + limit) : ordered.slice(offset);
    return { listings: page, total: ordered.length, reasons };
  }

  const sorted = sortListings(filtered, sort);
  const page =
    typeof limit === "number" ? sorted.slice(offset, offset + limit) : sorted.slice(offset);
  return { listings: page, total: sorted.length, reasons: {} };
}

/** A single listing for the detail page. */
export async function getFoodItem(id: string) {
  return prisma.foodItem.findUnique({
    where: { id },
    select: {
      ...listingSelect,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          cuisine: true,
          address: true,
          description: true,
          phone: true,
          isOpen: true,
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true, foodItems: true } },
        },
      },
      reviews: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
}

/**
 * Foods similar to a given listing: same category or same restaurant, still
 * purchasable, never the item itself.
 */
export async function getSimilarFoods(
  item: { id: string; category: string; restaurantId: string },
  limit = 4,
) {
  return prisma.foodItem.findMany({
    where: {
      ...purchasableWhere(),
      id: { not: item.id },
      OR: [{ category: item.category }, { restaurantId: item.restaurantId }],
    },
    select: listingSelect,
    orderBy: [{ qualityScore: "desc" }, { pickupDeadline: "asc" }],
    take: limit,
  });
}

/**
 * The homepage's curated shelves, fetched together.
 *
 * Each shelf answers a different question a browsing customer might have, so
 * they are genuinely different lists rather than the same six items reordered.
 */
export async function getHomeShelves(profile: RecommendationProfile, now = new Date()) {
  const rows = await prisma.foodItem.findMany({
    where: purchasableWhere(),
    select: listingSelect,
  });

  const scorable = rows.map(toScorable);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const pick = (ids: string[], count: number): MarketplaceListing[] =>
    ids
      .map((id) => byId.get(id))
      .filter((l): l is MarketplaceListing => Boolean(l))
      .slice(0, count);

  // Recommended — the weighted score.
  const recommendedScored = recommend(scorable, profile, 8, now);
  const recommended = recommendedScored
    .map((s) => byId.get(s.item.id))
    .filter((l): l is MarketplaceListing => Boolean(l));
  const reasons: Record<string, string> = {};
  for (const s of recommendedScored) reasons[s.item.id] = s.reason;

  // Ending soon — nearest deadline, which is genuinely urgent information.
  const endingSoon = [...rows]
    .sort((a, b) => a.pickupDeadline.getTime() - b.pickupDeadline.getTime())
    .filter((l) => deadlineUrgency(l.pickupDeadline, now) !== "comfortable")
    .slice(0, 4);

  // Best deals — deepest discount.
  const bestDeals = [...rows]
    .sort((a, b) => {
      const da = a.originalPrice ? (a.originalPrice - a.discountPrice) / a.originalPrice : 0;
      const db = b.originalPrice ? (b.originalPrice - b.discountPrice) / b.originalPrice : 0;
      return db - da;
    })
    .slice(0, 4);

  // High quality picks — best condition, and graded A.
  const highQuality = [...rows]
    .filter((l) => l.qualityScore >= 85)
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 4);

  // Nearby restaurants — a city directory, not a product grid.
  const restaurants = await prisma.restaurant.findMany({
    where: { isOpen: true, foodItems: { some: purchasableWhere() } },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      cuisine: true,
      image: true,
      address: true,
      reviews: { select: { rating: true } },
      _count: { select: { foodItems: { where: purchasableWhere() }, reviews: true } },
    },
    orderBy: { name: "asc" },
    take: 6,
  });

  return { recommended, reasons, endingSoon, bestDeals, highQuality, restaurants, pick };
}

/** Load the recommendation profile for a user, from their real behaviour. */
export async function getRecommendationProfile(
  userId: string | undefined,
): Promise<RecommendationProfile> {
  if (!userId) return emptyProfile();

  const [preferences, orders, saved] = await Promise.all([
    prisma.userPreference.findMany({
      where: { userId },
      select: { category: true, score: true },
    }),
    prisma.order.findMany({
      where: { customerId: userId, status: { not: "CANCELLED" } },
      select: {
        restaurantId: true,
        items: { select: { quantity: true, foodItem: { select: { category: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.savedRestaurant.findMany({
      where: { userId },
      select: { restaurantId: true },
    }),
  ]);

  return buildProfile({
    preferences,
    orders: orders.map((o) => ({
      restaurantId: o.restaurantId,
      items: o.items.map((i) => ({
        category: i.foodItem.category,
        quantity: i.quantity,
      })),
    })),
    savedRestaurantIds: saved.map((s) => s.restaurantId),
  });
}

/** Restaurants for the /restaurants directory and the filter sidebar. */
export async function getRestaurantDirectory(city?: string) {
  return prisma.restaurant.findMany({
    where: {
      isOpen: true,
      ...(city ? { city } : {}),
      foodItems: { some: purchasableWhere() },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      cuisine: true,
      description: true,
      address: true,
      image: true,
      reviews: { select: { rating: true } },
      _count: { select: { foodItems: { where: purchasableWhere() }, reviews: true } },
    },
    orderBy: { name: "asc" },
  });
}

/** Distinct categories that actually have something purchasable right now. */
export async function getAvailableCategories() {
  const rows = await prisma.foodItem.findMany({
    where: purchasableWhere(),
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

/** Every restaurant name that has stock, for the filter sidebar. */
export async function getFilterRestaurants() {
  return prisma.restaurant.findMany({
    where: { foodItems: { some: purchasableWhere() } },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });
}
