import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Store } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getRestaurantDirectory } from "@/server/foods";

export const metadata: Metadata = {
  title: "Restaurants",
  description:
    "The kitchens listing surplus food on FoodCycle right now, and how many portions they have available.",
};

export const dynamic = "force-dynamic";

/**
 * The restaurant directory.
 *
 * Grouped by city, because that is how someone decides whether a restaurant is
 * reachable — a flat alphabetical list would be useless for the actual question
 * being asked ("who is near me?").
 */
export default async function RestaurantsPage() {
  const restaurants = await getRestaurantDirectory();

  const byCity = restaurants.reduce<Record<string, typeof restaurants>>(
    (accumulator, restaurant) => {
      (accumulator[restaurant.city] ??= []).push(restaurant);
      return accumulator;
    },
    {},
  );

  const cities = Object.keys(byCity).sort();

  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Restaurants
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {restaurants.length > 0
            ? `${restaurants.length} ${restaurants.length === 1 ? "kitchen is" : "kitchens are"} listing surplus food right now.`
            : "No kitchens are listing surplus food at the moment."}
        </p>
      </div>

      {restaurants.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No restaurants listing right now"
          description="Restaurants typically list their surplus in the late afternoon. Check back around then."
          action={{ href: "/foods", label: "Explore food" }}
        />
      ) : (
        <div className="space-y-12">
          {cities.map((city) => (
            <section key={city}>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink uppercase">
                {city}
              </h2>

              <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {byCity[city].map((restaurant) => {
                  const ratings = restaurant.reviews.map((r) => r.rating);
                  const average =
                    ratings.length > 0
                      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                      : null;

                  return (
                    <li key={restaurant.id}>
                      <Link
                        href={`/restaurants/${restaurant.slug}`}
                        className="group block rounded-lg border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
                      >
                        <div className="flex items-start gap-3.5">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={56}
                              height={56}
                              className="size-14 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-brand-soft">
                              <Store aria-hidden="true" className="size-5 text-brand-ink" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-ink group-hover:text-brand-ink">
                              {restaurant.name}
                            </h3>
                            {restaurant.cuisine && (
                              <p className="mt-0.5 truncate text-xs text-ink-muted">
                                {restaurant.cuisine}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-ink-muted">
                              <span className="font-medium text-ink-soft tabular">
                                {restaurant._count.foodItems}
                              </span>{" "}
                              {restaurant._count.foodItems === 1 ? "listing" : "listings"}
                              {average !== null && (
                                <>
                                  {" · "}
                                  <span className="font-medium text-ink-soft tabular">
                                    {average.toFixed(1)}
                                  </span>{" "}
                                  ({restaurant._count.reviews})
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
                          <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                          <span className="line-clamp-1">{restaurant.address}</span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
