import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The FoodCycle mark.
 *
 * A closed circular arrow — a cycle — with a leaf inside it, drawn inline so it
 * inherits `currentColor` and needs no asset. Paired with the wordmark in the
 * brand green, it is the only logo in the app.
 */
export function Logo({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-brand", className)}
      aria-label="FoodCycle — home"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Cycle: an open ring, so it reads as a loop rather than a badge. */}
        <path d="M21 12a9 9 0 1 1-3.2-6.9" />
        <path d="M21 3.5V9h-5.5" />
        {/* Leaf: the "goodness" half of the name. */}
        <path d="M12 15.5c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5Z" fill="currentColor" stroke="none" />
        <path d="M12 15.5V12" />
      </svg>

      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-ink">
          Food<span className="text-brand">Cycle</span>
        </span>
      )}
    </Link>
  );
}
