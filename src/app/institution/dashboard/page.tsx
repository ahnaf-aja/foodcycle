import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Inbox } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { DonationCard, type DonationCardData } from "@/components/institution/donation-card";
import { ImpactStats } from "@/components/impact/impact-stats";
import { requireInstitution } from "@/server/auth-guards";
import {
  getInstitutionDonations,
  getInstitutionDonationCounts,
} from "@/server/donations";
import { getInstitutionImpact } from "@/server/impact";

export const metadata: Metadata = { title: "Overview" };

export const dynamic = "force-dynamic";

/**
 * The institution overview.
 *
 * Answers one question first: is anything on its way, or waiting to be
 * confirmed? Everything else — the running totals, past deliveries — comes
 * after, because it is history rather than work.
 */
export default async function InstitutionDashboardPage() {
  const { institution } = await requireInstitution();

  const [counts, incoming, impact] = await Promise.all([
    getInstitutionDonationCounts(institution.id),
    getInstitutionDonations(institution.id, {
      status: ["CREATED", "CONFIRMED", "PREPARING", "READY", "DELIVERING"],
      limit: 10,
    }),
    getInstitutionImpact(institution.id),
  ]);

  const queue = incoming as unknown as DonationCardData[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {institution.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {counts.incoming > 0
            ? `${counts.incoming} ${counts.incoming === 1 ? "donation is" : "donations are"} on the way to you.`
            : "Nothing is on its way at the moment."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="On the way"
          value={counts.incoming}
          tone={counts.incoming > 0 ? "soon" : "neutral"}
          hint={counts.incoming > 0 ? "Not yet received" : "Nothing pending"}
        />
        <Stat label="Received" value={counts.delivered} hint="Confirmed by you" />
        <Stat label="Meals received" value={impact.mealsReceived} hint="All time" />
        <Stat
          label="Food received"
          value={`${impact.weightKg.toFixed(1)} kg`}
          hint="Diverted from waste"
        />
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Incoming donations</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Confirm each one when the food arrives. That is what tells the donor
              it reached you.
            </p>
          </div>

          <Link
            href="/institution/donations"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
          >
            All donations
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-14 text-center">
            <Inbox aria-hidden="true" className="size-6 text-ink-muted" />
            <h3 className="mt-4 text-base font-semibold text-ink">No incoming donations</h3>
            <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
              When a FoodCycle customer chooses to donate their order to you, it
              will appear here with everything the restaurant is sending.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {queue.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Heart aria-hidden="true" className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-ink">What you have received</h2>
        </div>

        <ImpactStats
          impact={{ mealsSaved: 0, mealsDonated: impact.mealsReceived, weightKg: impact.weightKg }}
          className="mt-4"
        />

        <p className="mt-4 border-t border-line pt-4 text-xs text-ink-muted">
          Across {impact.deliveries} confirmed{" "}
          {impact.deliveries === 1 ? "delivery" : "deliveries"} from FoodCycle
          restaurants.
        </p>
      </section>
    </div>
  );
}
