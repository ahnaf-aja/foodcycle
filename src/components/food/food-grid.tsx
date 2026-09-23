import { FoodCard, FoodCardSkeleton } from "./food-card";
import { Reveal } from "@/components/ui/reveal";
import type { MarketplaceListing } from "@/server/foods";
import { cn } from "@/lib/utils";

/**
 * The listing grid.
 *
 * Two columns on a phone rather than one: the cards are compact enough that a
 * single column would mean a lot of scrolling for very little information.
 * Gaps widen with the viewport so the layout breathes without new breakpoints.
 *
 * Cards rise into view as the reader scrolls, staggered so the grid arrives as
 * one sweep rather than N separate jumps. The stagger is capped inside `Reveal`
 * so a long list can never leave the last card waiting.
 */
export function FoodGrid({
  listings,
  reasons,
  className,
  priorityCount = 4,
}: {
  listings: MarketplaceListing[];
  reasons?: Record<string, string>;
  className?: string;
  /** How many images to load eagerly — the ones above the fold. */
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {listings.map((listing, index) => (
        <Reveal
          key={listing.id}
          // Stagger the sweep. Blocks already on screen animate immediately
          // (handled inside Reveal), so no `eager` flag is needed here.
          delay={index * 55}
        >
          <FoodCard
            listing={listing}
            reason={reasons?.[listing.id]}
            priority={index < priorityCount}
          />
        </Reveal>
      ))}
    </div>
  );
}

/** Grid-shaped loading placeholder, matching FoodGrid's dimensions exactly. */
export function FoodGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <FoodCardSkeleton key={index} />
      ))}
    </div>
  );
}
