import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PackageCheck, Search, Store, HeartHandshake } from "lucide-react";

import { Container, Section } from "@/components/layout/shell";
import { FoodGrid } from "@/components/food/food-grid";
import { getHomeShelves, getRecommendationProfile } from "@/server/foods";
import { getCommunityImpact } from "@/server/impact";
import { getCurrentUser } from "@/server/auth-guards";
import { formatRupiahCompact } from "@/lib/utils";

/**
 * The homepage.
 *
 * The order answers the questions a first-time visitor actually has:
 *   What is this? → hero
 *   What can I eat? → Recommended / Ending soon / Best deals / High quality
 *   Who is cooking? → Nearby restaurants
 *   How does it work, and is it real? → How it works + Community impact
 *
 * The hero is deliberately short so food is visible well before the fold.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = await getRecommendationProfile(user?.id);

  const [shelves, impact] = await Promise.all([
    getHomeShelves(profile),
    getCommunityImpact(),
  ]);

  const hasAnyListings =
    shelves.recommended.length > 0 || shelves.endingSoon.length > 0;

  return (
    <div className="pb-16">
      <Hero isReturning={Boolean(user)} />

      <Container className="mt-10 space-y-12 sm:mt-12 sm:space-y-16">
        {!hasAnyListings ? (
          <EmptyMarketplace />
        ) : (
          <>
            {shelves.recommended.length > 0 && (
              <Section
                title={user ? "Recommended for you" : "Popular right now"}
                description={
                  user
                    ? "Based on what you have ordered before, and what is good today."
                    : "Good quality, well rated, and available near you."
                }
                action={<SeeAll href="/foods" />}
              >
                <FoodGrid listings={shelves.recommended.slice(0, 8)} reasons={shelves.reasons} />
              </Section>
            )}

            {shelves.endingSoon.length > 0 && (
              <Section
                title="Ending soon"
                description="Pickup windows closing shortly. These are the listings most at risk of going to waste."
                action={<SeeAll href="/foods?sort=ending-soon" />}
              >
                <FoodGrid listings={shelves.endingSoon.slice(0, 4)} />
              </Section>
            )}

            {shelves.bestDeals.length > 0 && (
              <Section
                title="Best deals"
                description="The deepest discounts available today."
                action={<SeeAll href="/foods?sort=discount" />}
              >
                <FoodGrid listings={shelves.bestDeals.slice(0, 4)} />
              </Section>
            )}

            {shelves.highQuality.length > 0 && (
              <Section
                title="High quality picks"
                description="Grade A food with the strongest remaining condition."
                action={<SeeAll href="/foods?sort=quality" />}
              >
                <FoodGrid listings={shelves.highQuality.slice(0, 4)} />
              </Section>
            )}
          </>
        )}

        {shelves.restaurants.length > 0 && (
          <Section
            title="Nearby restaurants"
            description="The kitchens listing surplus food right now."
            action={<SeeAll href="/restaurants" />}
          >
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {shelves.restaurants.slice(0, 3).map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </Section>
        )}

        <HowItWorks />
        <ImpactStrip impact={impact} />
      </Container>
    </div>
  );
}

/**
 * The hero. Short on purpose — the headline, one sentence of context, two
 * actions, and food appears immediately below.
 */
function Hero({ isReturning }: { isReturning: boolean }) {
  return (
    <section className="border-b border-line bg-surface">
      <Container className="py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl leading-[1.15] font-semibold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
            Save food. Share goodness.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            Discover quality surplus food from nearby restaurants at lower prices
            — enjoy it yourself or donate it to someone who needs it.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/foods"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              Explore food
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>

            <Link
              href="/donate"
              className="inline-flex h-11 items-center rounded-md border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
            >
              How donation works
            </Link>
          </div>

          {isReturning && (
            <p className="mt-5 text-sm text-ink-muted">
              Your recommendations below are based on what you have ordered before.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink transition-colors duration-150 hover:text-brand"
    >
      See all
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

function RestaurantCard({
  restaurant,
}: {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    cuisine: string | null;
    address: string;
    image: string | null;
    reviews: { rating: number }[];
    _count: { foodItems: number; reviews: number };
  };
}) {
  const ratings = restaurant.reviews.map((r) => r.rating);
  const average =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group flex gap-3.5 rounded-lg border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-line-strong"
    >
      {restaurant.image ? (
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-brand-soft">
          <Store aria-hidden="true" className="size-5 text-brand-ink" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink group-hover:text-brand-ink">
          {restaurant.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {restaurant.cuisine ?? restaurant.city}
        </p>
        <p className="mt-1.5 text-xs text-ink-muted">
          <span className="font-medium text-ink-soft tabular">
            {restaurant._count.foodItems}
          </span>{" "}
          {restaurant._count.foodItems === 1 ? "listing" : "listings"}
          {average !== null && (
            <>
              {" · "}
              <span className="font-medium text-ink-soft tabular">{average.toFixed(1)}</span> (
              {restaurant._count.reviews})
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

/**
 * Three steps. No numbered badges or oversized icons — the sequence is carried
 * by the words, and the icons only mark which step is which.
 */
function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Find surplus food nearby",
      body: "Restaurants list what they have left at the end of service, at around half price, with a clear pickup window and a condition grade.",
    },
    {
      icon: PackageCheck,
      title: "Order and collect",
      body: "Reserve what you want, then collect it from the restaurant before the deadline. You will see the kitchen's progress at every step.",
    },
    {
      icon: HeartHandshake,
      title: "Or pass it on",
      body: "At checkout, send your order to a registered orphanage, nursing home or community kitchen instead. You will be told when it arrives.",
    },
  ];

  return (
    <Section
      title="How FoodCycle works"
      description="Three steps, whether you are eating it or giving it away."
    >
      <ol className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.title}>
            <step.icon aria-hidden="true" className="size-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * Community impact. Three real totals summed from the impact records — no
 * counters that animate to a number nobody can verify.
 */
function ImpactStrip({
  impact,
}: {
  impact: { mealsSaved: number; mealsDonated: number; weightKg: number };
}) {
  const stats = [
    { label: "Meals saved", value: impact.mealsSaved },
    { label: "Meals donated", value: impact.mealsDonated },
    { label: "Food waste prevented", value: `${impact.weightKg.toFixed(0)} kg` },
  ];

  return (
    <Section
      title="FoodCycle community"
      description="Every order on FoodCycle keeps good food in use instead of in a bin."
      action={<SeeAll href="/impact" />}
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border-t border-line pt-4">
            <p className="text-2xl font-semibold text-ink tabular sm:text-3xl">
              {typeof stat.value === "number"
                ? stat.value.toLocaleString("id-ID")
                : stat.value}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EmptyMarketplace() {
  return (
    <div className="rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <Store aria-hidden="true" className="mx-auto size-6 text-ink-muted" />
      <h2 className="mt-4 text-base font-semibold text-ink">No food listed right now</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
        Restaurants typically list their surplus in the late afternoon. Check back
        around then, or have a look at who is cooking nearby.
      </p>
      <Link
        href="/restaurants"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
      >
        Browse restaurants
      </Link>
    </div>
  );
}
