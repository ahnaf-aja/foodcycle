import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { InstitutionProfileForm } from "@/components/institution/profile-form";
import { requireInstitution } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";

export const metadata: Metadata = { title: "Institution profile" };

export const dynamic = "force-dynamic";

/**
 * The institution's own details.
 *
 * `supportedCount` and `needs` matter more here than they might appear: they are
 * exactly what a donor reads when deciding where their order should go, so this
 * page is really about keeping that choice well informed.
 */
export default async function InstitutionProfilePage() {
  const { institution } = await requireInstitution();

  const full = await prisma.socialInstitution.findUniqueOrThrow({
    where: { id: institution.id },
    select: {
      name: true,
      description: true,
      type: true,
      address: true,
      city: true,
      phone: true,
      supportedCount: true,
      needs: true,
      verified: true,
      slug: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Institution profile
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Donors see these details when they choose where their donation goes.
        </p>
      </div>

      {!full.verified && (
        <p className="rounded-md bg-soon-soft px-3 py-2.5 text-sm text-soon">
          Your institution is awaiting verification. Donations cannot be sent to
          you until an administrator has reviewed your details.
        </p>
      )}

      <div className="rounded-lg border border-line bg-surface p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-ink-muted">Type</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {INSTITUTION_TYPE_LABEL[full.type]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Status</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {full.verified ? "Verified" : "Awaiting review"}
            </dd>
          </div>
        </dl>

        <Link
          href={`/institutions/${full.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink hover:underline"
        >
          View public page
          <ExternalLink aria-hidden="true" className="size-3" />
        </Link>
      </div>

      <InstitutionProfileForm
        initial={{
          name: full.name,
          description: full.description ?? "",
          address: full.address,
          city: full.city,
          phone: full.phone ?? "",
          supportedCount: full.supportedCount,
          needs: full.needs,
        }}
        institutionType={INSTITUTION_TYPE_LABEL[full.type]}
      />
    </div>
  );
}
