import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Star, Store } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { FoodGrid } from "@/components/food/food-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getRestaurantBySlug } from "@/server/restaurants";
import { getCurrentUser } from "@/server/auth-guards";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/restaurants/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return { title: "Restaurant not found" };

  return {
    title: restaurant.name,
    description:
      restaurant.description ??
      `Surplus food from ${restaurant.name} in ${restaurant.city}, available at lower prices on FoodCycle.`,
  };
}

/**
 * A restaurant's page.
 *
 * Their listing first — that is what a visitor came for — with the practical
 * details (where it is, how to call) alongside. Reviews are summarised rather
 * than listed in full, so the page stays about the food.
 */
export default async function RestaurantDetailPage(
  props: PageProps<"/restaurants/[slug]">,
) {
  const { slug } = await props.params;

  const [restaurant, user] = await Promise.all([
    getRestaurantBySlug(slug),
    getCurrentUser(),
  ]);

  if (!restaurant) notFound();

  const ratings = restaurant.reviews.map((r) => r.rating);
  const average =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const available = restaurant.foodItems;

  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/restaurants" className="hover:text-ink">
              Restaurants
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink" aria-current="page">
            {restaurant.name}
          </li>
        </ol>
      </nav>

      <div className="border-b border-line pb-8">
        <div className="flex flex-wrap items-start gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
            <Store aria-hidden="true" className="size-6 text-brand-ink" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {restaurant.name}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
              {restaurant.cuisine && <span>{restaurant.cuisine}</span>}
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-3.5" />
                {restaurant.address}, {restaurant.city}
              </span>
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 hover:text-ink"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  {restaurant.phone}
                </a>
              )}
              {average !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                  <span className="font-medium text-ink tabular">{average.toFixed(1)}</span>
                  <span>({ratings.length})</span>
                </span>
              )}
            </div>

            {restaurant.description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {restaurant.description}
              </p>
            )}

            {!restaurant.isOpen && (
              <p className="mt-4 rounded-md bg-unavailable-soft px-3 py-2 text-sm text-unavailable">
                This restaurant is not accepting orders at the moment. Their
                listings stay visible for reference.
              </p>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">
          Available now
          {available.length > 0 && (
            <span className="ml-2 text-base font-normal text-ink-muted tabular">
              {available.length}
            </span>
          )}
        </h2>

        {available.length === 0 ? (
          <EmptyState
            icon={Store}
            title="Nothing available from this restaurant right now"
            description="They have no surplus listed at the moment. Their listings usually appear at the end of service."
            action={{ href: "/foods", label: "Explore other food" }}
          />
        ) : (
          <FoodGrid listings={available} />
        )}
      </section>

      {/* Reviews in brief — the full list lives on the restaurant's own page. */}
      {restaurant.reviews.length > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">
            What customers say
          </h2>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {restaurant.reviews.slice(0, 6).map((review) => (
              <li key={review.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {review.user.name ?? "A customer"}
                  </span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted"
                    aria-label={`${review.rating} out of 5`}
                  >
                    <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                    <span className="tabular">{review.rating}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatDate(review.createdAt)}
                </p>
                {review.comment && (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!user && available.length > 0 && (
        <div className="mt-12 rounded-lg border border-line bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Sign in to order from {restaurant.name}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Your cart and order history are saved to your account.
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
