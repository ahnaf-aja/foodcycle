import type { Metadata } from "next";

import { InstitutionVerificationList } from "@/components/admin/institution-list";
import { requireAdmin } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Institutions" };

export const dynamic = "force-dynamic";

/**
 * Institution verification.
 *
 * Unverified institutions are listed first, because that is the queue. The
 * decision needs the facts in front of the reviewer — who they are, where, how
 * many people they support — rather than a bare approve button.
 */
export default async function AdminInstitutionsPage() {
  await requireAdmin();

  const institutions = await prisma.socialInstitution.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      city: true,
      address: true,
      description: true,
      supportedCount: true,
      needs: true,
      verified: true,
      createdAt: true,
      owner: { select: { name: true, email: true, phone: true } },
      _count: { select: { donations: true } },
    },
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
  });

  const pending = institutions.filter((institution) => !institution.verified);
  const verified = institutions.filter((institution) => institution.verified);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Institutions
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Only verified institutions can receive donations. Donors are trusting
          that the food reaches real people, so this is the one review that
          matters most.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink uppercase">
          Awaiting verification
          <span className="ml-2 font-normal text-ink-muted tabular">{pending.length}</span>
        </h2>

        {pending.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-ink-muted">
            Nothing is waiting for review. New institution registrations will
            appear here.
          </p>
        ) : (
          <InstitutionVerificationList
            institutions={pending.map((institution) => ({
              ...institution,
              createdAt: institution.createdAt.toISOString(),
            }))}
          />
        )}
      </section>

      {verified.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink uppercase">
            Verified
            <span className="ml-2 font-normal text-ink-muted tabular">{verified.length}</span>
          </h2>

          <InstitutionVerificationList
            institutions={verified.map((institution) => ({
              ...institution,
              createdAt: institution.createdAt.toISOString(),
            }))}
            verified
          />
        </section>
      )}
    </div>
  );
}
