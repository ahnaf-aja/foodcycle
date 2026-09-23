import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, MapPin, Phone } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { getInstitutionBySlug } from "@/server/restaurants";
import { getInstitutionImpact } from "@/server/impact";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/institutions/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const institution = await getInstitutionBySlug(slug);
  if (!institution) return { title: "Institution not found" };

  return {
    title: institution.name,
    description:
      institution.description ??
      `${INSTITUTION_TYPE_LABEL[institution.type]} in ${institution.city}, receiving food donations through FoodCycle.`,
  };
}

/**
 * A public institution page.
 *
 * Exists for one honest reason: so a donor can check that the institution they
 * are sending food to is real, and see what has actually arrived. Unverified
 * institutions are not shown, because their donations would not be live yet.
 */
export default async function InstitutionDetailPage(
  props: PageProps<"/institutions/[slug]">,
) {
  const { slug } = await props.params;
  const institution = await getInstitutionBySlug(slug);

  if (!institution || !institution.verified) notFound();

  const impact = await getInstitutionImpact(institution.id);

  return (
    <Container className="py-8 sm:py-10" size="narrow">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/donate" className="hover:text-ink">
              Donate
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink" aria-current="page">
            {institution.name}
          </li>
        </ol>
      </nav>

      <div className="flex items-start gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
          <Building2 aria-hidden="true" className="size-5 text-brand-ink" />
        </span>

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {institution.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {INSTITUTION_TYPE_LABEL[institution.type]} · Verified on FoodCycle
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" />
              {institution.address}, {institution.city}
            </span>
            {institution.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone aria-hidden="true" className="size-3.5" />
                {institution.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {institution.description && (
        <p className="mt-6 text-base leading-relaxed text-ink-soft">
          {institution.description}
        </p>
      )}

      {(institution.supportedCount !== null || institution.needs.length > 0) && (
        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-6">
          {institution.supportedCount !== null && (
            <div>
              <dt className="text-xs text-ink-muted">Currently supporting</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink tabular">
                {institution.supportedCount}
                <span className="ml-1.5 text-sm font-normal text-ink-muted">people</span>
              </dd>
            </div>
          )}
          {institution.needs.length > 0 && (
            <div>
              <dt className="text-xs text-ink-muted">What they need</dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {institution.needs.join(", ")}
              </dd>
            </div>
          )}
        </dl>
      )}

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Received through FoodCycle
        </h2>

        {impact.deliveries === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No donations have been delivered here yet.
          </p>
        ) : (
          <dl className="mt-4 grid grid-cols-3 gap-6">
            <div>
              <dt className="text-xs text-ink-muted">Deliveries</dt>
              <dd className="mt-1 text-xl font-semibold text-ink tabular">
                {impact.deliveries}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Meals received</dt>
              <dd className="mt-1 text-xl font-semibold text-ink tabular">
                {impact.mealsReceived}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Food received</dt>
              <dd className="mt-1 text-xl font-semibold text-ink tabular">
                {impact.weightKg.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-ink-muted">kg</span>
              </dd>
            </div>
          </dl>
        )}
      </section>

      <div className="mt-10 border-t border-line pt-6">
        <Link
          href="/foods"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          Order food to donate
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <p className="mt-3 text-xs text-ink-muted">
          Choose this institution at checkout when you place your order.
        </p>
      </div>
    </Container>
  );
}
