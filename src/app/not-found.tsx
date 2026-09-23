import Link from "next/link";
import { Utensils } from "lucide-react";

/**
 * The 404 page.
 *
 * A single card in the middle of an otherwise empty page, offering the two
 * destinations that are useful from anywhere: browse food, or go home.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Utensils aria-hidden="true" className="size-6 text-ink-muted" />

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
        We could not find that page
      </h1>

      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The link may be out of date, or the listing may have been removed by the
        restaurant.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/foods"
          className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          Explore food
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
