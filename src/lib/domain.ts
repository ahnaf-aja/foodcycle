import type {
  DonationStatus,
  FoodStatus,
  Grade,
  OrderStatus,
  InstitutionType,
} from "@prisma/client";

/**
 * Presentation metadata for the FoodCycle Grade system.
 *
 * Grade is an internal marketplace freshness indicator, NOT a health
 * certification — the copy below is deliberately careful about that, and the
 * restaurant remains responsible for the safety of what it lists.
 */
export const GRADE_META: Record<
  Grade,
  { label: string; short: string; summary: string; description: string; tone: Tone }
> = {
  GRADE_A: {
    label: "Grade A",
    short: "A",
    summary: "Excellent condition",
    description:
      "Food is in excellent condition with a comfortable remaining consumption window and very good visual quality.",
    tone: "available",
  },
  GRADE_B: {
    label: "Grade B",
    short: "B",
    summary: "Good condition",
    description:
      "Food is in good condition and still suitable for consumption, but is best eaten sooner rather than later.",
    tone: "soon",
  },
  GRADE_C: {
    label: "Grade C",
    short: "C",
    summary: "Consume soon",
    description:
      "The restaurant still considers this food suitable, but it is approaching the end of its recommended consumption window. Consume it soon after pickup.",
    tone: "urgent",
  },
};

/** The only colour meanings in the app. */
export type Tone = "available" | "soon" | "urgent" | "unavailable" | "neutral";

/** Standardised explainer shown wherever Grade is surfaced. */
export const GRADE_DISCLAIMER =
  "FoodCycle Grade is an internal marketplace indicator of freshness and remaining consumption window. It is not an official food-safety certification. The restaurant remains responsible for ensuring that listed food is suitable for consumption.";

export const QUALITY_EXPLANATION =
  "Quality Score helps you understand the estimated current condition of surplus food, based on listing freshness, remaining consumption window, storage condition, and information provided by the restaurant.";

/** A short, plain-language reading of a 0–100 quality score. */
export function qualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Consume soon";
}

export function qualityTone(score: number): Tone {
  if (score >= 85) return "available";
  if (score >= 70) return "soon";
  return "urgent";
}

export const FOOD_STATUS_META: Record<
  FoodStatus,
  { label: string; description: string; tone: Tone }
> = {
  AVAILABLE: {
    label: "Available",
    description: "In stock and within its pickup window.",
    tone: "available",
  },
  SOLD_OUT: {
    label: "Sold out",
    description: "All portions have been claimed.",
    tone: "unavailable",
  },
  EXPIRED: {
    label: "Expired",
    description: "Past its pickup deadline and no longer purchasable.",
    tone: "unavailable",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    description: "Temporarily withdrawn by the restaurant.",
    tone: "unavailable",
  },
};

/**
 * Order lifecycle. The customer dashboard and the restaurant queue both render
 * from this single table, so a status can never mean two different things.
 */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; customerHint: string; restaurantHint: string; tone: Tone; step: number }
> = {
  PENDING: {
    label: "Pending",
    customerHint: "Sent to the restaurant. Waiting for confirmation.",
    restaurantHint: "New order — needs your confirmation.",
    tone: "soon",
    step: 0,
  },
  CONFIRMED: {
    label: "Confirmed",
    customerHint: "The restaurant has confirmed your order.",
    restaurantHint: "Confirmed. Start preparing when ready.",
    tone: "available",
    step: 1,
  },
  PREPARING: {
    label: "Preparing",
    customerHint: "The restaurant is preparing your food.",
    restaurantHint: "Being prepared.",
    tone: "available",
    step: 2,
  },
  READY: {
    label: "Ready for pickup",
    customerHint: "Ready — collect it before the pickup deadline.",
    restaurantHint: "Ready and waiting for the customer.",
    tone: "available",
    step: 3,
  },
  ON_DELIVERY: {
    label: "On the way",
    customerHint: "Your order is on its way.",
    restaurantHint: "Out for delivery.",
    tone: "available",
    step: 4,
  },
  COMPLETED: {
    label: "Completed",
    customerHint: "Completed. Thanks for saving food from waste.",
    restaurantHint: "Completed.",
    tone: "neutral",
    step: 5,
  },
  CANCELLED: {
    label: "Cancelled",
    customerHint: "This order was cancelled and stock returned.",
    restaurantHint: "Cancelled.",
    tone: "urgent",
    step: -1,
  },
};

/** The progress steps shown in the customer's order timeline. */
export const ORDER_TIMELINE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

/** For delivery orders the timeline includes the ON_DELIVERY leg. */
export const ORDER_TIMELINE_DELIVERY: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "ON_DELIVERY",
  "COMPLETED",
];

/**
 * The statuses a restaurant may move an order to next. Encoding the legal
 * transitions here keeps the restaurant UI honest and stops a stray action from
 * jumping an order from PENDING straight to COMPLETED.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["ON_DELIVERY", "COMPLETED"],
  ON_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const DONATION_STATUS_META: Record<
  DonationStatus,
  { label: string; hint: string; tone: Tone; step: number }
> = {
  CREATED: {
    label: "Donation created",
    hint: "The restaurant has been notified.",
    tone: "soon",
    step: 0,
  },
  CONFIRMED: {
    label: "Confirmed",
    hint: "The restaurant accepted the donation.",
    tone: "available",
    step: 1,
  },
  PREPARING: {
    label: "Preparing",
    hint: "The restaurant is preparing the food.",
    tone: "available",
    step: 2,
  },
  READY: {
    label: "Ready",
    hint: "Packed and waiting to be delivered.",
    tone: "available",
    step: 3,
  },
  DELIVERING: {
    label: "Delivering",
    hint: "On the way to the institution.",
    tone: "available",
    step: 4,
  },
  DELIVERED: {
    label: "Delivered",
    hint: "Received and confirmed by the institution.",
    tone: "neutral",
    step: 5,
  },
  CANCELLED: {
    label: "Cancelled",
    hint: "This donation was cancelled.",
    tone: "urgent",
    step: -1,
  },
};

export const DONATION_TIMELINE: DonationStatus[] = [
  "CREATED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "DELIVERED",
];

export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  ORPHANAGE: "Orphanage",
  NURSING_HOME: "Nursing home",
  FOOD_BANK: "Food bank",
  SHELTER: "Shelter",
  COMMUNITY_KITCHEN: "Community kitchen",
};

/** Categories used across the marketplace, seed data and filter sidebar. */
export const FOOD_CATEGORIES = [
  "Rice & Bowls",
  "Noodles & Pasta",
  "Bakery & Pastry",
  "Sandwiches & Wraps",
  "Chicken",
  "Salads",
  "Snacks",
  "Desserts",
  "Beverages",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/**
 * Rough kilograms of food per meal, used to estimate diverted waste when a
 * listing does not carry an explicit weight. Deliberately conservative.
 */
export const KG_PER_MEAL = 0.35;

export function estimateWeightKg(meals: number): number {
  return Math.round(meals * KG_PER_MEAL * 10) / 10;
}
