import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { requireAdmin } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { getCommunityImpact } from "@/server/impact";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export const dynamic = "force-dynamic";

/**
 * The admin overview.
 *
 * Only the figures that would prompt someone to act: unverified institutions
 * waiting on a decision, listings that are live, and whether orders are moving.
 * Everything else is a query someone can run when they actually need it.
 */
export default async function AdminDashboardPage() {
  await requireAdmin();

  const [
    users,
    restaurants,
    institutions,
    unverified,
    listings,
    liveListings,
    orders,
    pendingOrders,
    completedOrders,
    revenue,
    impact,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count(),
    prisma.socialInstitution.count(),
    prisma.socialInstitution.count({ where: { verified: false } }),
    prisma.foodItem.count(),
    prisma.foodItem.count({
      where: { status: "AVAILABLE", stock: { gt: 0 }, pickupDeadline: { gt: new Date() } },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { total: true },
    }),
    getCommunityImpact(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {unverified > 0
            ? `${unverified} ${unverified === 1 ? "institution is" : "institutions are"} waiting for verification.`
            : "No institutions are waiting for verification."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Awaiting verification"
          value={unverified}
          tone={unverified > 0 ? "soon" : "neutral"}
          hint={unverified > 0 ? "Needs a decision" : "All reviewed"}
          href="/admin/institutions"
        />
        <Stat label="Orders awaiting confirmation" value={pendingOrders} hint="Across all restaurants" />
        <Stat label="Live listings" value={liveListings} hint={`${listings} total ever created`} />
        <Stat
          label="Completed orders"
          value={completedOrders}
          hint={`${formatRupiah(revenue._sum.total ?? 0)} in surplus sold`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            The marketplace
          </h2>
          <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
            <Row label="Customers" value={users} />
            <Row label="Restaurants" value={restaurants} />
            <Row label="Social institutions" value={institutions} />
            <Row label="Orders placed" value={orders} />
          </dl>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Community impact
          </h2>
          <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
            <Row label="Meals saved" value={impact.mealsSaved} />
            <Row label="Meals donated" value={impact.mealsDonated} />
            <Row label="Food waste prevented" value={`${impact.weightKg.toFixed(0)} kg`} />
          </dl>

          <Link
            href="/impact"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
          >
            See the public impact page
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-sm font-medium text-ink tabular">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </dd>
    </div>
  );
}
