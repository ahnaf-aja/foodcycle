import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/shell";
import { FoodGrid } from "@/components/food/food-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { FilterSheet } from "@/components/marketplace/filter-sheet";
import { SearchBar } from "@/components/marketplace/search-bar";
import { countActiveFilters } from "@/lib/filters";
import { SearchX } from "lucide-react";

import {
  getAvailableCategories,
  getFilterRestaurants,
  getMarketplace,
  getRecommendationProfile,
  parseFilters,
  parseSort,
} from "@/server/foods";
import { getCurrentUser } from "@/server/auth-guards";
import { expireStaleListings } from "@/server/jobs";

export const metadata: Metadata = {
  title: "Explore food",
  description:
    "Browse surplus food from nearby restaurants at lower prices, with clear grades and pickup windows.",
};

export const dynamic = "force-dynamic";

/**
 * The marketplace.
 *
 * Desktop puts filters in a sticky left rail so results stay in view while they
 * are adjusted; mobile moves the same controls into a bottom sheet. Both write
 * to the same URL, so the two are the same feature, not two implementations.
 */
export default async function FoodsPage(props: PageProps<"/foods">) {
  // Correct any listings whose deadline passed since the last visit, so the
  // grid cannot show food that is no longer collectable.
  await expireStaleListings();

  const searchParams = await props.searchParams;
  const filters = parseFilters(searchParams);
  const sort = parseSort(typeof searchParams.sort === "string" ? searchParams.sort : undefined);

  const user = await getCurrentUser();
  const profile = await getRecommendationProfile(user?.id);

  const [result, categories, restaurants] = await Promise.all([
    getMarketplace({ filters, sort, profile }),
    getAvailableCategories(),
    getFilterRestaurants(),
  ]);

  const activeCount = countActiveFilters({
    get: (key: string) => {
      const value = (searchParams as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value.join(",");
      return typeof value === "string" ? value : null;
    },
  });

  const categoryOptions = categories.map((category) => ({
    value: category,
    label: category,
  }));
  const restaurantOptions = restaurants.map((restaurant) => ({
    value: restaurant.id,
    label: `${restaurant.name} · ${restaurant.city}`,
  }));

  const hasQuery = Boolean(filters.q);

  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {hasQuery ? `Results for “${filters.q}”` : "Explore food"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {result.total === 0
            ? "Nothing matches right now."
            : `${result.total} ${result.total === 1 ? "listing" : "listings"} available${
                sort === "recommended" && user ? ", ranked for you" : ""
              }.`}
        </p>
      </div>

      {/* Search sits above the results on every breakpoint — it is the fastest
          way to narrow anything. */}
      <div className="mb-6 max-w-xl">
        <SearchBar />
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 pb-8">
            <FilterPanel categories={categoryOptions} restaurants={restaurantOptions} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center gap-3 md:hidden">
            <FilterSheet
              categories={categoryOptions}
              restaurants={restaurantOptions}
              activeCount={activeCount}
            />
            <span className="text-sm text-ink-muted tabular">
              {result.total} {result.total === 1 ? "result" : "results"}
            </span>
          </div>

          {result.listings.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={hasQuery ? `No food matches “${filters.q}”` : "No food matches your filters"}
              description={
                hasQuery
                  ? "Try a different word, or clear your filters to see everything available."
                  : "Try widening the price range, or clear the filters to see everything available."
              }
              action={{ href: "/foods", label: "Clear filters" }}
            />
          ) : (
            <FoodGrid listings={result.listings} reasons={result.reasons} />
          )}

          {result.listings.length > 0 && (
            <p className="mt-10 text-center text-sm text-ink-muted">
              Showing all {result.total} {result.total === 1 ? "listing" : "listings"}.
            </p>
          )}
        </div>
      </div>

      {!user && result.listings.length > 0 && (
        <div className="mt-12 rounded-lg border border-line bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Sign in for recommendations based on what you order
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              You will also be able to save restaurants and track your impact.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-4 inline-flex h-10 shrink-0 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong sm:mt-0"
          >
            Sign in
          </Link>
        </div>
      )}
    </Container>
  );
}
