/**
 * FoodCycle recommendation engine.
 *
 * A transparent weighted score — no machine learning, no hidden model. Every
 * listing is scored on seven signals, each normalised to 0–1, then combined
 * with the weights below. The score is INTERNAL ONLY: users see the short
 * human explanation ("High-quality pick"), never a number.
 *
 * The weights change shape for a customer with no history. Rather than
 * pretending we know their taste, a new user gets a cold-start weighting that
 * leans on signals we can trust without any personal data: quality, ratings,
 * value, and popularity.
 */

import { discountPercent, deadlineUrgency } from "./utils";

export type RecommendationSignals = {
  /** How strongly this item's category matches what the customer usually buys. */
  categoryAffinity: number;
  /** Normalised quality score (0–100 → 0–1). */
  quality: number;
  /** Affinity for this restaurant, from past orders and saves. */
  restaurantAffinity: number;
  /** Customer rating (0–5 → 0–1). */
  rating: number;
  /** Discount depth, saturating at half price. */
  discount: number;
  /** How much of this item has actually sold, blended with review volume. */
  popularity: number;
  /** Enough stock and a workable pickup window. */
  freshness: number;
};

/** Weights for a customer we have order history for. Sums to 1. */
export const WEIGHTS_PERSONALISED: Record<keyof RecommendationSignals, number> = {
  categoryAffinity: 0.25,
  quality: 0.2,
  restaurantAffinity: 0.15,
  rating: 0.15,
  discount: 0.1,
  popularity: 0.1,
  freshness: 0.05,
};

/**
 * Weights for a new customer. Category and restaurant affinity carry no
 * information yet, so their weight is redistributed to the signals that do.
 * Sums to 1.
 */
export const WEIGHTS_COLD_START: Record<keyof RecommendationSignals, number> = {
  categoryAffinity: 0,
  quality: 0.3,
  restaurantAffinity: 0,
  rating: 0.25,
  discount: 0.2,
  popularity: 0.2,
  freshness: 0.05,
};

/** What we know about the person we are recommending to. */
export type RecommendationProfile = {
  hasHistory: boolean;
  /** Normalised 0–1 affinity per category. */
  categoryAffinity: Record<string, number>;
  /** Normalised 0–1 affinity per restaurant id. */
  restaurantAffinity: Record<string, number>;
};

type PreferenceInput = { category: string; score: number };
type OrderInput = {
  restaurantId: string;
  items: { category: string; quantity: number }[];
};
type ItemInput = {
  category: string;
  restaurantId: string;
};

/** An item plus the aggregate facts the scorer needs. */
export type ScorableItem = {
  id: string;
  name: string;
  category: string;
  restaurantId: string;
  restaurantName: string;
  originalPrice: number;
  discountPrice: number;
  qualityScore: number;
  pickupDeadline: Date;
  stock: number;
  /** Mean review rating 0–5, or null when the item has no reviews yet. */
  averageRating: number | null;
  reviewCount: number;
  /** Units sold historically — drives the popularity signal. */
  totalSold: number;
};

export type ScoredItem<T extends ScorableItem> = {
  item: T;
  score: number;
  reason: string;
  signals: RecommendationSignals;
};

/** Scale a value into 0–1 against a maximum, treating 0 as "no data". */
function normalise(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * Turn a customer's orders, stored preferences and saved restaurants into
 * normalised affinity maps.
 *
 * Recent behaviour is weighted by quantity, save actions count as a weaker
 * signal than an actual purchase, and preference rows written by earlier orders
 * are folded in so affinity persists across sessions.
 */
export function buildProfile(input: {
  preferences: PreferenceInput[];
  orders: OrderInput[];
  savedRestaurantIds: string[];
}): RecommendationProfile {
  const { preferences, orders, savedRestaurantIds } = input;

  const categoryCounts: Record<string, number> = {};
  const restaurantCounts: Record<string, number> = {};

  for (const preference of preferences) {
    if (preference.score <= 0) continue;
    categoryCounts[preference.category] =
      (categoryCounts[preference.category] ?? 0) + preference.score * 2;
  }

  for (const order of orders) {
    restaurantCounts[order.restaurantId] = (restaurantCounts[order.restaurantId] ?? 0) + 1;
    for (const item of order.items) {
      categoryCounts[item.category] =
        (categoryCounts[item.category] ?? 0) + item.quantity;
    }
  }

  // Saving a restaurant expresses interest without a purchase.
  for (const restaurantId of savedRestaurantIds) {
    restaurantCounts[restaurantId] = (restaurantCounts[restaurantId] ?? 0) + 1.5;
  }

  const hasHistory =
    preferences.length > 0 || orders.length > 0 || savedRestaurantIds.length > 0;

  return {
    hasHistory,
    categoryAffinity: normaliseMap(categoryCounts),
    restaurantAffinity: normaliseMap(restaurantCounts),
  };
}

/** Divide every entry by the largest value so the strongest affinity is 1.0. */
function normaliseMap(counts: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(counts));
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    out[key] = normalise(value, max);
  }
  return out;
}

/** An empty profile — a customer with no history at all. */
export function emptyProfile(): RecommendationProfile {
  return { hasHistory: false, categoryAffinity: {}, restaurantAffinity: {} };
}

/**
 * Score every item and return the best `limit`, most relevant first.
 *
 * Normalisation maxima are derived from the candidate set itself, so a
 * marketplace of cheap snacks and one of expensive meals both produce a
 * meaningful spread rather than one collapsing to zero.
 */
export function recommend<T extends ScorableItem>(
  items: T[],
  profile: RecommendationProfile,
  limit = 8,
  now: Date = new Date(),
): ScoredItem<T>[] {
  if (items.length === 0) return [];

  const maxSold = Math.max(0, ...items.map((i) => i.totalSold));
  const maxReviews = Math.max(0, ...items.map((i) => i.reviewCount));
  const weights = profile.hasHistory ? WEIGHTS_PERSONALISED : WEIGHTS_COLD_START;

  const scored = items.map((item) => {
    const signals = scoreSignals(item, profile, { maxSold, maxReviews, now });
    let score = 0;
    for (const key of Object.keys(weights) as (keyof RecommendationSignals)[]) {
      score += signals[key] * weights[key];
    }
    return {
      item,
      score,
      signals,
      reason: explain(signals, item, profile, now),
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tie-break: the sooner a pickup deadline, the more useful to show.
    return a.item.pickupDeadline.getTime() - b.item.pickupDeadline.getTime();
  });

  return scored.slice(0, limit);
}

function scoreSignals(
  item: ScorableItem,
  profile: RecommendationProfile,
  ctx: { maxSold: number; maxReviews: number; now: Date },
): RecommendationSignals {
  const urgency = deadlineUrgency(item.pickupDeadline, ctx.now);

  // Stock depth and a workable pickup window. An item with one portion left and
  // ten minutes on the clock is a poor recommendation, however good it looks.
  const stockFactor = normalise(item.stock, 6);
  const windowFactor =
    urgency === "comfortable" ? 1 : urgency === "soon" ? 0.7 : urgency === "urgent" ? 0.4 : 0;

  // Rating: items with no reviews sit at a neutral 0.6 rather than zero, so a
  // brand-new listing is not buried before it has a chance to be tried.
  const rating =
    item.averageRating === null
      ? 0.6
      : Math.min(1, Math.max(0, item.averageRating / 5)) *
        // Confidence grows with review volume, up to 10 reviews.
        (0.7 + 0.3 * Math.min(1, item.reviewCount / 10));

  return {
    categoryAffinity: profile.categoryAffinity[item.category] ?? 0,
    quality: normalise(item.qualityScore, 100),
    restaurantAffinity: profile.restaurantAffinity[item.restaurantId] ?? 0,
    rating,
    // Half price or better is a full score; shallower discounts scale down.
    discount: Math.min(1, discountPercent(item.originalPrice, item.discountPrice) / 50),
    popularity:
      normalise(item.totalSold, ctx.maxSold) * 0.7 +
      normalise(item.reviewCount, ctx.maxReviews) * 0.3,
    freshness: stockFactor * 0.5 + windowFactor * 0.5,
  };
}

/**
 * Choose the single most honest reason to show. We surface the signal that
 * actually drove the ranking — never a bare score — and fall back to a plain
 * factual line when nothing stands out.
 */
function explain(
  signals: RecommendationSignals,
  item: ScorableItem,
  profile: RecommendationProfile,
  now: Date,
): string {
  const urgency = deadlineUrgency(item.pickupDeadline, now);
  if (urgency === "urgent") return "Ending soon";

  const candidates: { value: number; reason: string }[] = [
    {
      value: profile.hasHistory ? signals.categoryAffinity : 0,
      reason: `You often order ${item.category.toLowerCase()}`,
    },
    {
      value: signals.rating,
      reason:
        item.reviewCount >= 10
          ? `Rated ${item.averageRating?.toFixed(1)} by ${item.reviewCount} customers`
          : "Highly rated",
    },
    { value: signals.quality, reason: "High-quality pick" },
    {
      value: signals.discount,
      reason: `${discountPercent(item.originalPrice, item.discountPrice)}% off`,
    },
    { value: signals.popularity, reason: "Popular right now" },
  ];

  candidates.sort((a, b) => b.value - a.value);

  // Only claim a reason when the signal is genuinely strong.
  const best = candidates[0];
  if (best && best.value >= 0.7) return best.reason;

  if (item.stock <= 3) return `Only ${item.stock} left`;
  return "Fresh listing";
}

/**
 * Merge this order's categories back into the customer's stored preferences.
 * Called after checkout so the next round of recommendations is better.
 */
export function nextPreferenceScores(
  existing: PreferenceInput[],
  purchased: { category: string; quantity: number }[],
): { category: string; score: number }[] {
  const merged = new Map<string, number>();
  for (const p of existing) merged.set(p.category, p.score);

  for (const line of purchased) {
    merged.set(line.category, (merged.get(line.category) ?? 0) + line.quantity);
  }

  // Decay keeps old habits from dominating forever.
  const DECAY = 0.97;
  const max = Math.max(1, ...merged.values());

  return [...merged.entries()].map(([category, score]) => ({
    category,
    score: Math.min(1, ((score * DECAY) / max) * 1),
  }));
}
