import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { DonationCard, type DonationCardData } from "@/components/institution/donation-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireInstitution } from "@/server/auth-guards";
import { getInstitutionDonations, getInstitutionDonationCounts } from "@/server/donations";
import { cn } from "@/lib/utils";
import type { DonationStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Donations" };

export const dynamic = "force-dynamic";

const VIEWS: { key: string; label: string; statuses: DonationStatus[] }[] = [
  {
    key: "incoming",
    label: "Incoming",
    statuses: ["CREATED", "CONFIRMED", "PREPARING", "READY", "DELIVERING"],
  },
  { key: "received", label: "Received", statuses: ["DELIVERED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
  {
    key: "all",
    label: "All",
    statuses: [
      "CREATED",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "DELIVERING",
      "DELIVERED",
      "CANCELLED",
    ],
  },
];

export default async function InstitutionDonationsPage(
  props: PageProps<"/institution/donations">,
) {
  const { institution } = await requireInstitution();
  const params = await props.searchParams;

  const rawView = typeof params.view === "string" ? params.view : "incoming";
  const view = VIEWS.find((candidate) => candidate.key === rawView) ?? VIEWS[0];

  const [donations, counts] = await Promise.all([
    getInstitutionDonations(institution.id, { status: view.statuses, limit: 60 }),
    getInstitutionDonationCounts(institution.id),
  ]);

  const countFor = (statuses: DonationStatus[]) =>
    statuses.reduce((sum, status) => sum + counts.counts[status], 0);

  const rows = donations as unknown as DonationCardData[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Donations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every donation sent to {institution.name}, newest first.
        </p>
      </div>

      <nav aria-label="Donation views" className="-mx-1 flex overflow-x-auto pb-1">
        {VIEWS.map((candidate) => {
          const active = candidate.key === view.key;
          const count = countFor(candidate.statuses);

          return (
            <Link
              key={candidate.key}
              href={`/institution/donations?view=${candidate.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-brand-soft text-brand-ink"
                  : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {candidate.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular",
                  active ? "bg-brand text-white" : "bg-surface-sunken text-ink-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={
            view.key === "incoming"
              ? "Nothing on the way"
              : view.key === "received"
                ? "No donations received yet"
                : view.key === "cancelled"
                  ? "No cancelled donations"
                  : "No donations yet"
          }
          description={
            view.key === "incoming"
              ? "When a customer donates an order to you, it will appear here so you can confirm it when the food arrives."
              : "Try another view to see your other donations."
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((donation) => (
            <DonationCard key={donation.id} donation={donation} />
          ))}
        </ul>
      )}
    </div>
  );
}
