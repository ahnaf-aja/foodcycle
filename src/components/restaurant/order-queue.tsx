"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradeChip } from "@/components/orders/order-timeline";
import { updateOrderStatusAction } from "@/server/actions/orders";
import { ORDER_STATUS_META, ORDER_TRANSITIONS } from "@/lib/domain";
import { cn, formatRupiah, formatTime, timeAgo } from "@/lib/utils";
import type { OrderStatus, Grade } from "@prisma/client";

/**
 * The restaurant's order queue.
 *
 * One card per order, newest first, with only the transitions that are legal
 * from the current status offered as buttons. The next step is the primary
 * action — a single obvious button — and any alternative (usually cancelling)
 * is secondary, so the common case is one tap with no menu.
 *
 * Every button submits a Server Action that re-checks ownership and validates
 * the transition server-side; the buttons here are a convenience, not the rule.
 */

export type QueueOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  purpose: "SELF" | "DONATION";
  fulfillment: "PICKUP" | "DELIVERY";
  total: number;
  createdAt: Date;
  notes: string | null;
  deliveryAddress: string | null;
  customer: { id: string; name: string | null; phone: string | null };
  items: { id: string; name: string; quantity: number; grade: Grade }[];
  donation: {
    id: string;
    meals: number;
    institution: { name: string; city: string };
  } | null;
};

/** The label for the button that advances an order from its current status. */
const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "Accept order",
  CONFIRMED: "Start preparing",
  PREPARING: "Mark ready",
  READY: "Complete",
  ON_DELIVERY: "Mark delivered",
};

export function OrderQueue({ orders }: { orders: QueueOrder[] }) {
  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <OrderQueueCard key={order.id} order={order} />
      ))}
    </ul>
  );
}

function OrderQueueCard({ order }: { order: QueueOrder }) {
  const [state, formAction, pending] = useActionState(updateOrderStatusAction, undefined);
  const [showDetails, setShowDetails] = useState(false);

  const meta = ORDER_STATUS_META[order.status];
  const transitions = ORDER_TRANSITIONS[order.status];
  const nextStatus = transitions.find((status) => status !== "CANCELLED");
  const canCancel = transitions.includes("CANCELLED");

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{order.orderNumber}</span>
              <span
                className={cn(
                  "rounded-xs px-2 py-0.5 text-xs font-medium",
                  meta.tone === "soon"
                    ? "bg-soon-soft text-soon"
                    : meta.tone === "available"
                      ? "bg-available-soft text-available"
                      : "bg-surface-sunken text-ink-soft",
                )}
              >
                {meta.label}
              </span>
              {order.purpose === "DONATION" && (
                <span className="rounded-xs bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
                  Donation
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-ink-soft">
              {order.customer.name ?? "A customer"}
              {order.customer.phone && (
                <span className="text-ink-muted"> · {order.customer.phone}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {timeAgo(order.createdAt)} · {itemCount}{" "}
              {itemCount === 1 ? "portion" : "portions"} · {formatRupiah(order.total)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-ink-muted">{meta.restaurantHint}</p>
          </div>
        </div>

        {/* Items, always visible — the kitchen needs them without a click. */}
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 font-medium text-ink tabular">
                ×{item.quantity}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{item.name}</span>
              <GradeChip grade={item.grade} />
            </li>
          ))}
        </ul>

        {/* Donation destination matters to the kitchen — show it plainly. */}
        {order.donation && (
          <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand-ink">
            For {order.donation.institution.name}, {order.donation.institution.city} ·{" "}
            {order.donation.meals} {order.donation.meals === 1 ? "meal" : "meals"}
          </p>
        )}

        {order.notes && (
          <p className="mt-3 rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-soft">
            <span className="font-medium text-ink">Note:</span> {order.notes}
          </p>
        )}

        {order.deliveryAddress && (
          <p className="mt-2 text-xs text-ink-muted">
            <span className="font-medium text-ink-soft">Deliver to:</span>{" "}
            {order.deliveryAddress}
          </p>
        )}

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
          <p role="status" className="mt-3 text-sm text-available">
            {state.message}
          </p>
        )}

        {/* Actions. One obvious next step, everything else secondary. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {nextStatus && (
            <form action={formAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <Button type="submit" loading={pending} size="sm">
                {ADVANCE_LABEL[order.status] ?? `Mark ${nextStatus.toLowerCase()}`}
              </Button>
            </form>
          )}

          {canCancel && (
            <form action={formAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={pending}
                className="text-ink-muted hover:text-urgent"
              >
                Cancel order
              </Button>
            </form>
          )}

          {(order.status === "COMPLETED" || order.status === "CANCELLED") && (
            <p className="text-xs text-ink-muted">
              {order.status === "COMPLETED"
                ? "Completed."
                : "Cancelled — stock was returned to your listings."}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            Details
            <ChevronDown
              aria-hidden="true"
              className={cn("size-3.5 transition-transform duration-150", showDetails && "rotate-180")}
            />
          </button>
        </div>

        {showDetails && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs sm:grid-cols-4">
            <Detail label="Placed" value={formatTime(order.createdAt)} />
            <Detail
              label="Fulfillment"
              value={order.fulfillment === "PICKUP" ? "Pickup" : "Delivery"}
            />
            <Detail label="Total" value={formatRupiah(order.total)} />
            <Detail
              label="Purpose"
              value={order.purpose === "DONATION" ? "Donation" : "Customer keeps it"}
            />
          </dl>
        )}
      </div>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-soft">{value}</dd>
    </div>
  );
}
