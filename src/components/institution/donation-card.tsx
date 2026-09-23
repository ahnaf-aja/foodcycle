"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { GradeChip } from "@/components/orders/order-timeline";
import { confirmDonationReceiptAction } from "@/server/actions/orders";
import { DONATION_STATUS_META } from "@/lib/domain";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { DonationStatus, Grade } from "@prisma/client";

/**
 * A donation, from the institution's side.
 *
 * The one action that matters is confirming receipt — it is what closes the
 * loop for the donor, completes the order, and records the impact. It asks who
 * received the food, because that is a real accountability detail for an
 * institution, and it is a single deliberate step rather than an easy mis-tap.
 */
export type DonationCardData = {
  id: string;
  status: DonationStatus;
  meals: number;
  weightKg: number;
  notes: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  receivedAt: Date | null;
  receivedBy: string | null;
  restaurant: {
    name: string;
    city: string;
    address: string;
    phone: string | null;
  };
  donor: { name: string | null };
  order: {
    id: string;
    orderNumber: string;
    items: { id: string; name: string; quantity: number; grade: Grade }[];
  };
};

export function DonationCard({ donation }: { donation: DonationCardData }) {
  const [state, formAction, pending] = useActionState(confirmDonationReceiptAction, undefined);
  const [confirming, setConfirming] = useState(false);

  const meta = DONATION_STATUS_META[donation.status];
  const isReceived = donation.status === "DELIVERED";
  const isCancelled = donation.status === "CANCELLED";
  const inTransit = donation.status === "DELIVERING" || donation.status === "READY";

  return (
    <li
      className={cn(
        "rounded-lg border bg-surface",
        inTransit && !isReceived ? "border-brand/30" : "border-line",
      )}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">
                {donation.meals} {donation.meals === 1 ? "meal" : "meals"}
              </span>
              <span
                className={cn(
                  "rounded-xs px-2 py-0.5 text-xs font-medium",
                  isReceived
                    ? "bg-available-soft text-available"
                    : isCancelled
                      ? "bg-urgent-soft text-urgent"
                      : meta.tone === "soon"
                        ? "bg-soon-soft text-soon"
                        : "bg-brand-soft text-brand-ink",
                )}
              >
                {meta.label}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-ink-soft">
              From <span className="font-medium text-ink">{donation.restaurant.name}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Donated by {donation.donor.name ?? "a FoodCycle customer"} ·{" "}
              {donation.order.orderNumber} · {timeAgo(donation.createdAt)}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs text-ink-muted">Approx. weight</p>
            <p className="text-sm font-medium text-ink tabular">
              {donation.weightKg.toFixed(1)} kg
            </p>
          </div>
        </div>

        {/* What is actually coming — the packing list. */}
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {donation.order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 font-medium text-ink tabular">
                ×{item.quantity}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{item.name}</span>
              <GradeChip grade={item.grade} />
            </li>
          ))}
        </ul>

        {donation.notes && (
          <p className="mt-3 rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-soft">
            <span className="font-medium text-ink">Note from the donor:</span>{" "}
            {donation.notes}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5" />
            {donation.restaurant.address}, {donation.restaurant.city}
          </span>
          {donation.restaurant.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden="true" className="size-3.5" />
              {donation.restaurant.phone}
            </span>
          )}
        </div>

        {/* Status messages */}
        {state && !state.ok && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2 text-sm text-urgent"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        )}

        {state?.ok && state.message && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-md bg-available-soft px-3 py-2 text-sm text-available">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        )}

        {/* The action */}
        {isReceived ? (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
            <CheckCircle2 aria-hidden="true" className="mr-1 inline size-3.5 text-available" />
            Received {donation.receivedAt ? formatDateTime(donation.receivedAt) : ""}
            {donation.receivedBy && <> · confirmed by {donation.receivedBy}</>}
            . The donor and the restaurant have both been told.
          </p>
        ) : isCancelled ? (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
            This donation was cancelled by the restaurant.
          </p>
        ) : confirming ? (
          <form action={formAction} className="mt-3 space-y-3 border-t border-line pt-3">
            <input type="hidden" name="donationId" value={donation.id} />
            <input type="hidden" name="status" value="DELIVERED" />

            <Field
              label="Who received the food?"
              htmlFor={`receivedBy-${donation.id}`}
              hint="Recorded with the donation for your records"
            >
              <Input
                id={`receivedBy-${donation.id}`}
                name="receivedBy"
                placeholder="Your name"
                maxLength={120}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={pending}>
                {pending ? "Confirming…" : "Confirm receipt"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-ink-muted">
              This completes the order and adds {donation.meals}{" "}
              {donation.meals === 1 ? "meal" : "meals"} to the donor&rsquo;s impact.
            </p>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <Button onClick={() => setConfirming(true)}>Confirm receipt</Button>
            {!inTransit && (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <Clock aria-hidden="true" className="size-3.5" />
                {meta.hint}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
