import Link from "next/link";
import { Clock } from "lucide-react";

import { FoodImage } from "./food-image";
import { GradeBadge } from "@/components/ui/badge";
import { GRADE_META } from "@/lib/domain";
import {
  cn,
  formatRupiah,
  formatTime,
  discountPercent,
  timeRemaining,
  deadlineUrgency,
} from "@/lib/utils";
import type { MarketplaceListing } from "@/server/foods";

/**
 * A listing as it appears in the marketplace, homepage shelves and search.
 *
 * The card carries only what a customer needs to decide whether to tap: the
 * photo, what it is, where it is from, the price, the grade, and when pickup
 * closes. Everything else lives on the detail page.
 *
 * `reason` is the recommendation explanation, shown only when the ranking was
 * personalised — it is what makes "Recommended for you" honest rather than a
 * relabelled list.
 */
export function FoodCard({
  listing,
  reason,
  priority = false,
  className,
}: {
  listing: MarketplaceListing;
  reason?: string;
  priority?: boolean;
  className?: string;
}) {
  const discount = discountPercent(listing.originalPrice, listing.discountPrice);
  const urgency = deadlineUrgency(listing.pickupDeadline);
  const remaining = timeRemaining(listing.pickupDeadline);
  const grade = GRADE_META[listing.grade];

  // Low stock is worth surfacing — it is a real reason to decide now.
  const lowStock = listing.stock > 0 && listing.stock <= 3;

  return (
    <article className={cn("group", className)}>
      <Link href={`/foods/${listing.id}`} className="block focus:outline-none">
        <div className="relative overflow-hidden rounded-lg bg-surface-sunken">
          <FoodImage
            src={listing.image}
            alt={listing.name}
            category={listing.category}
            priority={priority}
            className="aspect-[4/3] w-full"
            imageClassName="transition-transform duration-200 ease-out group-hover:scale-[1.02]"
          />

          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 rounded-xs bg-brand px-2 py-0.5 text-xs font-semibold text-white tabular">
              {discount}% off
            </span>
          )}

          {listing.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/55">
              <span className="rounded-xs bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-ink">
            {listing.name}
          </h3>
          <p className="text-xs text-ink-muted">{listing.restaurant.name}</p>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-semibold text-ink tabular">
              {formatRupiah(listing.discountPrice)}
            </span>
            <span className="text-xs text-ink-muted line-through tabular">
              {formatRupiah(listing.originalPrice)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
            <GradeBadge
              grade={listing.grade}
              label={grade.label}
              summary={grade.summary}
              size="sm"
            />
            <span className="text-xs text-ink-muted tabular">
              Quality {listing.qualityScore}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0",
                urgency === "urgent"
                  ? "text-urgent"
                  : urgency === "soon"
                    ? "text-soon"
                    : "text-ink-muted",
              )}
            />
            <span
              className={cn(
                "text-xs",
                urgency === "urgent"
                  ? "font-medium text-urgent"
                  : urgency === "soon"
                    ? "font-medium text-soon"
                    : "text-ink-muted",
              )}
            >
              {/* The word carries the urgency; the colour only reinforces it. */}
              {urgency === "urgent" ? `Ending soon · ${remaining}` : `Pickup before ${formatTime(listing.pickupDeadline)}`}
            </span>
          </div>

          {lowStock && (
            <p className="pt-0.5 text-xs font-medium text-soon">
              Only {listing.stock} left
            </p>
          )}

          {reason && !lowStock && (
            <p className="pt-0.5 text-xs text-ink-muted">{reason}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

/**
 * The card's loading twin. Same dimensions, so the grid does not reflow when
 * the real data arrives.
 */
export function FoodCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3] w-full rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded-xs" />
        <div className="skeleton h-3 w-1/2 rounded-xs" />
        <div className="skeleton h-5 w-2/5 rounded-xs" />
        <div className="skeleton h-3 w-3/5 rounded-xs" />
      </div>
    </div>
  );
}

/**
 * A compact horizontal card, for lists where a grid would be too heavy —
 * similar foods on a detail page, or a restaurant's other listings.
 */
export function FoodRow({ listing }: { listing: MarketplaceListing }) {
  const discount = discountPercent(listing.originalPrice, listing.discountPrice);

  return (
    <Link
      href={`/foods/${listing.id}`}
      className="group flex items-center gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-surface-sunken"
    >
      <FoodImage
        src={listing.image}
        alt={listing.name}
        category={listing.category}
        sizes="80px"
        className="size-16 shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink group-hover:text-brand-ink">
          {listing.name}
        </p>
        <p className="truncate text-xs text-ink-muted">{listing.restaurant.name}</p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-ink tabular">
            {formatRupiah(listing.discountPrice)}
          </span>
          {discount > 0 && (
            <span className="text-xs font-medium text-available tabular">{discount}% off</span>
          )}
        </div>
      </div>
    </Link>
  );
}
