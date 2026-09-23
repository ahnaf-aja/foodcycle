import Link from "next/link";
import type { OrderStatus, Grade } from "@prisma/client";
import { Check } from "lucide-react";

import { ORDER_STATUS_META, ORDER_TIMELINE, ORDER_TIMELINE_DELIVERY, DONATION_TIMELINE } from "@/lib/domain";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * Order progress.
 *
 * One component renders the timeline for both the customer and the restaurant,
 * reading the same `OrderStatus` value. A step is complete when the order has
 * reached it, and the timestamps come from the order's own columns — so the
 * customer is never shown a progress bar that disagrees with the record.
 *
 * Status is communicated by a filled marker, a label, and the timestamp
 * together; never by colour alone.
 */
export function OrderTimeline({
  status,
  fulfillment,
  timestamps,
  className,
}: {
  status: OrderStatus;
  fulfillment: "PICKUP" | "DELIVERY";
  timestamps: Partial<Record<OrderStatus, Date | null>>;
  className?: string;
}) {
  if (status === "CANCELLED") {
    return (
      <div className={cn("rounded-lg border border-line bg-surface p-4", className)}>
        <p className="text-sm font-medium text-urgent">This order was cancelled</p>
        <p className="mt-1 text-xs text-ink-muted">
          {timestamps.CANCELLED
            ? `Cancelled ${formatDateTime(timestamps.CANCELLED)}. Any stock was returned to the restaurant.`
            : "Any stock was returned to the restaurant."}
        </p>
      </div>
    );
  }

  const steps =
    fulfillment === "DELIVERY" ? ORDER_TIMELINE_DELIVERY : ORDER_TIMELINE;
  const currentIndex = steps.indexOf(status);

  return (
    <ol className={cn("space-y-0", className)}>
      {steps.map((step, index) => {
        const meta = ORDER_STATUS_META[step];
        const done = index < currentIndex || status === "COMPLETED";
        const current = index === currentIndex && status !== "COMPLETED";
        const stamp = timestamps[step];
        const isLast = index === steps.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-brand bg-brand text-white"
                    : current
                      ? "border-brand bg-surface"
                      : "border-line-strong bg-surface",
                )}
              >
                {done ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : current ? (
                  <span className="size-2 rounded-full bg-brand" />
                ) : null}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn("w-px flex-1", done ? "bg-brand" : "bg-line-strong")}
                />
              )}
            </div>

            <div className={cn("pb-5", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm",
                  current
                    ? "font-semibold text-ink"
                    : done
                      ? "font-medium text-ink-soft"
                      : "text-ink-muted",
                )}
              >
                {meta.label}
                {current && <span className="sr-only"> (current step)</span>}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {stamp ? formatDateTime(stamp) : current ? meta.customerHint : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The donation's own progress, which runs alongside the order and ends with the
 * institution confirming receipt.
 */
export function DonationTimeline({
  status,
  timestamps,
  institutionName,
  className,
}: {
  status: string;
  // `undefined` as well as `null` — `receivedAt` is genuinely unset until the
  // institution confirms.
  timestamps: {
    deliveredAt?: Date | null;
    receivedAt?: Date | null;
    createdAt: Date;
  };
  institutionName: string;
  className?: string;
}) {
  const index = DONATION_TIMELINE.indexOf(status as never);
  if (status === "CANCELLED") {
    return (
      <p className={cn("text-sm text-urgent", className)}>
        This donation was cancelled.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-0", className)}>
      {DONATION_TIMELINE.map((step, stepIndex) => {
        const done = stepIndex < index || status === "DELIVERED";
        const current = stepIndex === index && status !== "DELIVERED";
        const isLast = stepIndex === DONATION_TIMELINE.length - 1;

        const label =
          step === "DELIVERED" ? `Received by ${institutionName}` : labelForDonationStep(step);
        const stamp =
          step === "DELIVERED"
            ? timestamps.receivedAt
            : step === "CREATED"
              ? timestamps.createdAt
              : null;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-brand bg-brand text-white"
                    : current
                      ? "border-brand bg-surface"
                      : "border-line-strong bg-surface",
                )}
              >
                {done ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : current ? (
                  <span className="size-2 rounded-full bg-brand" />
                ) : null}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn("w-px flex-1", done ? "bg-brand" : "bg-line-strong")}
                />
              )}
            </div>

            <div className={cn("pb-5", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm",
                  current
                    ? "font-semibold text-ink"
                    : done
                      ? "font-medium text-ink-soft"
                      : "text-ink-muted",
                )}
              >
                {label}
              </p>
              {stamp && <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(stamp)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function labelForDonationStep(step: string): string {
  switch (step) {
    case "CREATED":
      return "Donation created";
    case "CONFIRMED":
      return "Restaurant confirmed";
    case "PREPARING":
      return "Being prepared";
    case "READY":
      return "Packed and ready";
    case "DELIVERING":
      return "On the way";
    default:
      return step;
  }
}

/** Status pill used on order lists. */
export function OrderStatusBadge({
  status,
  purpose,
}: {
  status: OrderStatus;
  purpose?: "SELF" | "DONATION";
}) {
  const meta = ORDER_STATUS_META[status];

  const toneClass =
    meta.tone === "available"
      ? "bg-available-soft text-available"
      : meta.tone === "soon"
        ? "bg-soon-soft text-soon"
        : meta.tone === "urgent"
          ? "bg-urgent-soft text-urgent"
          : "bg-surface-sunken text-ink-soft";

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-xs px-2 py-0.5 text-xs font-medium", toneClass)}>
        {meta.label}
      </span>
      {purpose === "DONATION" && (
        <span className="rounded-xs bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
          Donation
        </span>
      )}
    </span>
  );
}

/** Grade chip for order lines, using short labels to keep rows tight. */
export function GradeChip({ grade }: { grade: Grade }) {
  const short = grade === "GRADE_A" ? "A" : grade === "GRADE_B" ? "B" : "C";
  const tone =
    grade === "GRADE_A"
      ? "bg-available-soft text-available"
      : grade === "GRADE_B"
        ? "bg-soon-soft text-soon"
        : "bg-urgent-soft text-urgent";

  return (
    <span
      className={cn("rounded-xs px-1.5 py-0.5 text-[11px] font-semibold", tone)}
      title={`Grade ${short}`}
    >
      Grade {short}
    </span>
  );
}
