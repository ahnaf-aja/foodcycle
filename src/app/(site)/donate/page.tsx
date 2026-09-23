import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, PackageCheck, Search, Store } from "lucide-react";

import { Container, Section } from "@/components/layout/shell";
import { getDonationInstitutions, getCommunityImpact } from "@/server/impact";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";

export const metadata: Metadata = {
  title: "How donation works",
  description:
    "Order surplus food from a restaurant and send it to a registered orphanage, nursing home, or community kitchen instead of collecting it yourself.",
};

export const dynamic = "force-dynamic";

/**
 * The donation explainer.
 *
 * Written to describe the mechanism plainly and then stop. There is no appeal
 * to guilt and no urgency framing: donating is presented as one of two equally
 * reasonable things to do with an order, which is the honest position and also
 * the one that respects the reader.
 */
export default async function DonatePage() {
  const [institutions, impact] = await Promise.all([
    getDonationInstitutions(),
    getCommunityImpact(),
  ]);

  const steps = [
    {
      icon: Search,
      title: "Order surplus food as usual",
      body: "Browse the marketplace and add what you want, exactly as you would for yourself.",
    },
    {
      icon: HeartHandshake,
      title: "Choose “Donate my order” at checkout",
      body: "Instead of pickup or delivery, pick a registered institution. You will see who they support and what they need.",
    },
    {
      icon: Store,
      title: "The restaurant prepares it",
      body: "The kitchen prepares your order the same way it would for any customer, and you can follow its progress.",
    },
    {
      icon: PackageCheck,
      title: "The institution confirms receipt",
      body: "When the food arrives, the institution confirms it. You are notified, and the meals are added to your impact.",
    },
  ];

  return (
    <Container className="py-8 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Save food. Share goodness.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          FoodCycle exists so that good food which a restaurant cannot sell today
          still gets eaten. You can buy it for yourself at a lower price — or buy
          it and send it to someone who needs it.
        </p>
      </div>

      <Section className="mt-12" title="How donating works">
        <ol className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink tabular">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        className="mt-12"
        title="Where your donation can go"
        description="These institutions are registered on FoodCycle and have been reviewed."
      >
        {institutions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No institutions are registered yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((institution) => (
              <li
                key={institution.id}
                className="rounded-lg border border-line bg-surface p-4"
              >
                <h3 className="text-sm font-semibold text-ink">{institution.name}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {INSTITUTION_TYPE_LABEL[institution.type]} · {institution.city}
                </p>

                {institution.description && (
                  <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                    {institution.description}
                  </p>
                )}

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  {institution.supportedCount !== null && (
                    <div>
                      <dt className="text-ink-muted">Supports</dt>
                      <dd className="font-medium text-ink-soft tabular">
                        {institution.supportedCount} people
                      </dd>
                    </div>
                  )}
                  {institution.needs.length > 0 && (
                    <div>
                      <dt className="text-ink-muted">Needs</dt>
                      <dd className="font-medium text-ink-soft">
                        {institution.needs.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/foods"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
          >
            Explore food
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="text-sm text-ink-muted">
            {impact.mealsDonated.toLocaleString("id-ID")} meals donated so far.
          </p>
        </div>
      </Section>

      <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        Donations are delivered by the restaurant that prepared the food, and are
        counted as impact only once the receiving institution confirms they
        arrived. FoodCycle does not take a fee on donations.
      </p>
    </Container>
  );
}
