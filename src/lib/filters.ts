/**
 * Filter helpers shared by the Server Component page and the Client Component
 * panel.
 *
 * These live outside `filter-panel.tsx` on purpose. A module marked
 * `"use client"` exports *client references*, and a Server Component cannot
 * call one — doing so throws at render time and silently collapses the page to
 * its loading skeleton. Keeping the pure predicates here means both sides can
 * import the same implementation.
 */

/** How many filters are set, for the results header and the mobile button badge. */
export function countActiveFilters(
  searchParams: URLSearchParams | { get(k: string): string | null },
): number {
  const keys = [
    "category",
    "grade",
    "restaurant",
    "minDiscount",
    "minQuality",
    "pickup",
    "minPrice",
  ];
  let count = 0;
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) count += value.split(",").filter(Boolean).length;
  }
  return count;
}
