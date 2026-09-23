"use client";

import { useActionState } from "react";
import { AlertCircle, MapPin, Phone, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setInstitutionVerifiedAction } from "@/server/actions/admin";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import type { InstitutionType } from "@prisma/client";

/**
 * Verification rows.
 *
 * The reviewer gets everything needed to make the call: who registered, where
 * the institution is, how many people it supports, and what it says it needs —
 * alongside how many donations it has already handled, which is a useful signal
 * for an institution being re-reviewed.
 */
export type AdminInstitution = {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  address: string;
  description: string | null;
  supportedCount: number | null;
  needs: string[];
  verified: boolean;
  createdAt: string;
  owner: { name: string | null; email: string; phone: string | null };
  _count: { donations: number };
};

export function InstitutionVerificationList({
  institutions,
  verified = false,
}: {
  institutions: AdminInstitution[];
  verified?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {institutions.map((institution) => (
        <InstitutionRow
          key={institution.id}
          institution={institution}
          verified={verified}
        />
      ))}
    </ul>
  );
}

function InstitutionRow({
  institution,
  verified,
}: {
  institution: AdminInstitution;
  verified: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setInstitutionVerifiedAction,
    undefined,
  );

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{institution.name}</h3>
            <span
              className={
                institution.verified
                  ? "rounded-xs bg-available-soft px-2 py-0.5 text-xs font-medium text-available"
                  : "rounded-xs bg-soon-soft px-2 py-0.5 text-xs font-medium text-soon"
              }
            >
              {institution.verified ? "Verified" : "Awaiting review"}
            </span>
          </div>

          <p className="mt-1 text-xs text-ink-muted">
            {INSTITUTION_TYPE_LABEL[institution.type]} · registered{" "}
            {formatDate(institution.createdAt)}
          </p>

          {institution.description && (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {institution.description}
            </p>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <div className="inline-flex items-start gap-1.5">
              <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
              <div>
                <dt className="sr-only">Address</dt>
                <dd className="text-ink-soft">
                  {institution.address}, {institution.city}
                </dd>
              </div>
            </div>

            {institution.supportedCount !== null && (
              <div className="inline-flex items-start gap-1.5">
                <Users aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
                <div>
                  <dt className="sr-only">Supported</dt>
                  <dd className="text-ink-soft tabular">
                    {institution.supportedCount} people
                  </dd>
                </div>
              </div>
            )}

            <div className="inline-flex items-start gap-1.5">
              <Phone aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
              <div>
                <dt className="sr-only">Contact</dt>
                <dd className="text-ink-soft">
                  {institution.owner.name ?? "—"} · {institution.owner.email}
                  {institution.owner.phone && ` · ${institution.owner.phone}`}
                </dd>
              </div>
            </div>
          </dl>

          {institution.needs.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              <span className="font-medium text-ink-soft">Needs:</span>{" "}
              {institution.needs.join(", ")}
            </p>
          )}

          {institution._count.donations > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              {institution._count.donations} donation
              {institution._count.donations === 1 ? "" : "s"} received to date.
            </p>
          )}
        </div>

        <form action={formAction} className="shrink-0">
          <input type="hidden" name="institutionId" value={institution.id} />
          <input type="hidden" name="verified" value={verified ? "false" : "true"} />
          <Button
            type="submit"
            variant={verified ? "secondary" : "primary"}
            loading={pending}
            size="sm"
          >
            {verified ? "Withdraw verification" : "Verify institution"}
          </Button>
        </form>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2 text-xs text-urgent"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {state.message}
        </p>
      )}

      {state?.ok && state.message && (
        <p role="status" className="mt-3 text-xs text-available">
          {state.message}
        </p>
      )}
    </li>
  );
}
