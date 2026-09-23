import { z } from "zod";
import { FOOD_CATEGORIES } from "./domain";

/**
 * Input schemas.
 *
 * Every Server Action validates its input through one of these before touching
 * the database. Server Functions are reachable by direct POST, so the action
 * body is untrusted input exactly like a request body would be.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters"); // bcrypt's effective limit

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Enter a valid phone number")
  .max(24, "Enter a valid phone number")
  .optional()
  .or(z.literal("").transform(() => undefined));

// ===========================================================================
// Auth
// ===========================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .discriminatedUnion("role", [
    z.object({
      role: z.literal("CUSTOMER"),
      name: z.string().trim().min(2, "Enter your name").max(80),
      email: emailSchema,
      password: passwordSchema,
      phone: phoneSchema,
    }),
    z.object({
      role: z.literal("RESTAURANT"),
      name: z.string().trim().min(2, "Enter your name").max(80),
      email: emailSchema,
      password: passwordSchema,
      phone: phoneSchema,
      // Business details, collected up front so the account is usable at once.
      businessName: z.string().trim().min(2, "Enter your restaurant name").max(120),
      address: z.string().trim().min(5, "Enter the street address").max(200),
      city: z.string().trim().min(2, "Enter the city").max(80),
      cuisine: z.string().trim().max(80).optional(),
    }),
    z.object({
      role: z.literal("SOCIAL_INSTITUTION"),
      name: z.string().trim().min(2, "Enter your name").max(80),
      email: emailSchema,
      password: passwordSchema,
      phone: phoneSchema,
      businessName: z.string().trim().min(2, "Enter the institution name").max(120),
      institutionType: z.enum([
        "ORPHANAGE",
        "NURSING_HOME",
        "FOOD_BANK",
        "SHELTER",
        "COMMUNITY_KITCHEN",
      ]),
      address: z.string().trim().min(5, "Enter the street address").max(200),
      city: z.string().trim().min(2, "Enter the city").max(80),
      supportedCount: z.coerce
        .number()
        .int("Enter a whole number")
        .min(0)
        .max(100000)
        .optional(),
    }),
  ])
  .refine((data) => !data.email.endsWith("@foodcycle.demo"), {
    message: "That email domain is reserved for demo accounts",
    path: ["email"],
  });

// ===========================================================================
// Food listings
// ===========================================================================

export const foodItemSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the food name").max(120),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    category: z.enum(FOOD_CATEGORIES, { message: "Choose a category" }),
    // Whole Rupiah. Bounds keep a typo like 50000000 out of the marketplace.
    originalPrice: z.coerce
      .number()
      .int("Use whole Rupiah")
      .min(1000, "Minimum Rp1.000")
      .max(5_000_000, "Maximum Rp5.000.000"),
    discountPrice: z.coerce
      .number()
      .int("Use whole Rupiah")
      .min(1000, "Minimum Rp1.000")
      .max(5_000_000, "Maximum Rp5.000.000"),
    stock: z.coerce
      .number()
      .int("Use a whole number")
      .min(0, "Stock cannot be negative")
      .max(999, "Maximum 999 portions"),
    grade: z.enum(["GRADE_A", "GRADE_B", "GRADE_C"], { message: "Choose a grade" }),
    qualityScore: z.coerce
      .number()
      .int("Use a whole number")
      .min(0)
      .max(100, "Quality is scored out of 100"),
    // `datetime-local` sends "2026-09-22T20:30"; coerce to a real Date.
    expirationTime: z.coerce.date({ message: "Choose an expiration time" }),
    pickupDeadline: z.coerce.date({ message: "Choose a pickup deadline" }),
  })
  .refine((data) => data.discountPrice < data.originalPrice, {
    message: "The FoodCycle price must be below the original price",
    path: ["discountPrice"],
  })
  .refine((data) => data.pickupDeadline > new Date(), {
    message: "The pickup deadline must be in the future",
    path: ["pickupDeadline"],
  })
  .refine((data) => data.expirationTime >= data.pickupDeadline, {
    message: "Food cannot expire before its pickup deadline",
    path: ["expirationTime"],
  });

export const updateStockSchema = z.object({
  foodItemId: z.string().min(1),
  stock: z.coerce.number().int().min(0).max(999),
});

export const updateFoodStatusSchema = z.object({
  foodItemId: z.string().min(1),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD_OUT"]),
});

// ===========================================================================
// Cart
// ===========================================================================

export const addToCartSchema = z.object({
  foodItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
});

export const setCartQuantitySchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(50),
});

// ===========================================================================
// Checkout
// ===========================================================================

export const checkoutSchema = z
  .object({
    purpose: z.enum(["SELF", "DONATION"]),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    institutionId: z.string().min(1).optional(),
    deliveryAddress: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.purpose !== "DONATION" || Boolean(data.institutionId), {
    message: "Choose an institution to receive the donation",
    path: ["institutionId"],
  })
  .refine(
    (data) => data.fulfillment !== "DELIVERY" || (data.deliveryAddress?.trim().length ?? 0) >= 5,
    { message: "Enter a delivery address", path: ["deliveryAddress"] },
  );

// ===========================================================================
// Order status
// ===========================================================================

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "ON_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export const donationStatusSchema = z.object({
  donationId: z.string().min(1),
  status: z.enum([
    "CREATED",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "DELIVERING",
    "DELIVERED",
    "CANCELLED",
  ]),
  /** Free-text name of who physically received the donation. */
  receivedBy: z.string().trim().max(120).optional().or(z.literal("")),
});

// ===========================================================================
// Reviews
// ===========================================================================

export const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

// ===========================================================================
// Profile
// ===========================================================================

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
});

export const restaurantProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter the restaurant name").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  cuisine: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(5, "Enter the street address").max(200),
  city: z.string().trim().min(2, "Enter the city").max(80),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  isOpen: z.coerce.boolean().optional(),
});

export const institutionProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter the institution name").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  address: z.string().trim().min(5, "Enter the street address").max(200),
  city: z.string().trim().min(2, "Enter the city").max(80),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  supportedCount: z.coerce
    .number()
    .int("Enter a whole number")
    .min(0)
    .max(100000)
    .optional(),
  /** Comma-separated in the form; normalised to an array of trimmed phrases. */
  needs: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
});

/**
 * Flatten a ZodError into the `{ field: message }` shape our forms render.
 * Only the first message per field is kept — a field shows one error at a time.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionState<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; errors?: Record<string, string> };

/** Wrap a thrown value into a safe, user-facing action failure. */
export function actionError(error: unknown, fallback = "Something went wrong"): ActionState<never> {
  if (error instanceof z.ZodError) {
    return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(error) };
  }
  if (error instanceof Error && error.message) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: fallback };
}
