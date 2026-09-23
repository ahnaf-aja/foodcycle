import type { Metadata } from "next";

import { Container, Section } from "@/components/layout/shell";
import { ImpactStats, TrendLine } from "@/components/impact/impact-stats";
import { getCommunityImpact, getPersonalImpact, getImpactTrend } from "@/server/impact";
import { getRecentDonations } from "@/server/donations";
import { getCurrentUser } from "@/server/auth-guards";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "How much food FoodCycle has kept in use, and where donations have gone.",
};

export const dynamic = "force-dynamic";

/**
 * Impact.
 *
 * Two things are shown: a total, and where the donations actually went. The
 * trend line earns its place because direction is genuinely informative; the
 * donation log earns its place because a total nobody can trace back to real
 * recipients is just a number.
 */
export default async function ImpactPage() {
  const user = await getCurrentUser();

  const [community, personal, trend, recentDonations] = await Promise.all([
    getCommunityImpact(),
    user ? getPersonalImpact(user.id) : null,
    getImpactTrend(30),
    getRecentDonations(8),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Impact
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Every order on FoodCycle keeps good food in use. Here is what that adds
          up to — counted from completed orders, not estimates.
        </p>
      </div>

      {/* Personal, when signed in — this should be the first thing they see. */}
      {personal && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Your impact
          </h2>
          <ImpactStats impact={personal} />
          <p className="mt-4 text-sm text-ink-muted">
            Across {personal.orders} completed{" "}
            {personal.orders === 1 ? "order" : "orders"}.{" "}
            <Link href="/orders" className="font-medium text-brand-ink hover:underline">
              See your orders
            </Link>
          </p>
        </section>
      )}

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
          FoodCycle community
        </h2>
        <ImpactStats impact={community} />
        <TrendLine data={trend} className="mt-6" />
      </section>

      {/* Where donations went */}
      {recentDonations.length > 0 && (
        <Section
          className="mt-12"
          title="Recent donations"
          description="Confirmed deliveries from FoodCycle restaurants to institutions."
        >
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {recentDonations.map((donation) => (
              <li key={donation.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                <span className="text-sm font-medium text-ink">
                  {donation.institution.name}
                </span>
                <span className="text-xs text-ink-muted">
                  {INSTITUTION_TYPE_LABEL[donation.institution.type]} ·{" "}
                  {donation.institution.city}
                </span>
                <span className="ml-auto text-xs text-ink-muted">
                  <span className="font-medium text-ink-soft tabular">
                    {donation.meals}
                  </span>{" "}
                  {donation.meals === 1 ? "meal" : "meals"} from {donation.restaurant.name}
                </span>
                {donation.deliveredAt && (
                  <time
                    dateTime={donation.deliveredAt.toISOString()}
                    className="text-xs text-ink-muted"
                  >
                    {formatDate(donation.deliveredAt)}
                  </time>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* The honest caveat about what these figures are. */}
      <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        Figures are summed from completed orders and donations that an institution
        has confirmed receiving. Meals are counted in portions; weight is
        estimated from portion counts. FoodCycle Grade and Quality Score are
        internal marketplace indicators of freshness, not food-safety
        certifications — restaurants remain responsible for ensuring listed food
        is suitable for consumption.
      </p>
    </Container>
  );
}
