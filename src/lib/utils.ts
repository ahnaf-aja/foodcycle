import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an integer Rupiah amount the way Indonesians write prices: `Rp25.000`.
 * Amounts are stored as whole Rupiah, so there is never a fractional part.
 */
export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

/**
 * Compact Rupiah for tight spaces (`Rp25rb`, `Rp1,2jt`). Only used where the
 * full figure would crowd the layout, never for a price the user is paying.
 */
export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `Rp${millions.toFixed(millions % 1 === 0 ? 0 : 1).replace(".", ",")}jt`;
  }
  if (amount >= 1_000) return `Rp${Math.round(amount / 1_000)}rb`;
  return formatRupiah(amount);
}

/** Percentage saved, rounded — e.g. 50 for half price. */
export function discountPercent(originalPrice: number, discountPrice: number): number {
  if (originalPrice <= 0 || discountPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

/** Save this much per unit. */
export function savingsPerUnit(originalPrice: number, discountPrice: number): number {
  return Math.max(0, originalPrice - discountPrice);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `20:30` — used for pickup deadlines. */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** `22 Sep 2026` */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `22 Sep 2026, 20:30` */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Human countdown to a deadline: "2h 15m left", "Ends in 12m".
 * Returns null once the deadline has passed so callers can render an
 * "ended" state instead of a negative countdown.
 */
export function timeRemaining(deadline: Date | string, now: Date = new Date()): string | null {
  const diff = new Date(deadline).getTime() - now.getTime();
  if (diff <= 0) return null;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m left`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `${hours}h ${remMinutes}m left` : `${hours}h left`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day left" : `${days} days left`;
}

/**
 * Urgency band for a deadline. Drives colour *and* an explicit text label, so
 * urgency is never communicated by colour alone.
 */
export type DeadlineUrgency = "ended" | "urgent" | "soon" | "comfortable";

export function deadlineUrgency(
  deadline: Date | string,
  now: Date = new Date(),
): DeadlineUrgency {
  const diff = new Date(deadline).getTime() - now.getTime();
  if (diff <= 0) return "ended";
  if (diff <= 2 * 60 * 60 * 1000) return "urgent"; // under 2 hours
  if (diff <= 6 * 60 * 60 * 1000) return "soon"; // under 6 hours
  return "comfortable";
}

/** "Just now", "12m ago", "3h ago", "2d ago", then an absolute date. */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(date).getTime();
  if (diff < 60_000) return "Just now";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
}

/**
 * Whole days until a timestamp, floored, never negative.
 * Used to expire listings.
 */
export function daysUntil(date: Date | string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / DAY_MS));
}

/** `#A1B2C3` in, `a1b2c3` out — for deterministic initials avatars. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Slugify a display name into a URL-safe identifier for restaurants and
 * institutions. Falls back to a random suffix for names with no Latin
 * characters, so a slug is always produced.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `item-${Math.random().toString(36).slice(2, 8)}`;
}

/** Human order number: FC-7K2M4A. Short, unambiguous, sortable by eye. */
export function generateOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FC-${code}`;
}
