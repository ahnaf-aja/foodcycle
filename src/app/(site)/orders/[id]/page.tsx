import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Star } from "lucide-react";

import { Container } from "@/components/layout/shell";
import {
  OrderTimeline,
  DonationTimeline,
  OrderStatusBadge,
  GradeChip,
} from "@/components/orders/order-timeline";
import { ReviewForm } from "@/components/orders/review-form";
import { GRADE_META } from "@/lib/domain";
import { requireCustomer } from "@/server/auth-guards";
import { getCustomerOrder } from "@/server/orders";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDateTime, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const user = await requireCustomer();
  const order = await getCustomerOrder(user.id, id);
  return { title: order ? `Order ${order.orderNumber}` : "Order not found" };
}

/**
 * A single order.
 *
 * The timeline is the spine of this page: it answers "where is my food?" before
 * anything else, using the order's real status and timestamps. For a donation,
 * the same page also shows the institution's side, ending in the confirmation
 * of receipt that closes the loop.
 */
export default async function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const user = await requireCustomer();

  const order = await getCustomerOrder(user.id, id);
  if (!order) notFound();

  // Whether this order has already been reviewed, so the prompt is not repeated.
  const existingReview =
    order.status === "COMPLETED"
      ? await prisma.review.findFirst({
          where: { userId: user.id, orderId: order.id },
          select: { id: true, rating: true, comment: true, createdAt: true },
        })
      : null;

  const isDonation = order.purpose === "DONATION";

  return (
    <Container className="py-8 sm:py-10" size="narrow">
      <Link
        href="/orders"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {order.restaurant.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {order.orderNumber} · placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} purpose={order.purpose} />
      </div>

      {/* The most useful line for an active order. */}
      {order.status === "READY" && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-available/30 bg-available-soft p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-available" />
          <div>
            <p className="text-sm font-semibold text-available">Ready for pickup</p>
            <p className="mt-0.5 text-sm text-available">
              Collect from {order.restaurant.name} — {order.restaurant.city}. Bring this
              order number: {order.orderNumber}.
            </p>
          </div>
        </div>
      )}

      {order.fulfillment === "DELIVERY" && order.status !== "COMPLETED" && (
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Delivering to your address.
        </p>
      )}

      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_auto] sm:gap-10">
        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink uppercase">
            Progress
          </h2>
          <OrderTimeline
            status={order.status}
            fulfillment={order.fulfillment}
            timestamps={{
              PENDING: order.createdAt,
              CONFIRMED: order.confirmedAt,
              PREPARING: order.preparingAt,
              READY: order.readyAt,
              ON_DELIVERY: order.onDeliveryAt,
              COMPLETED: order.completedAt,
              CANCELLED: order.cancelledAt,
            }}
          />
        </section>

        <section className="sm:w-64">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink uppercase">
            Items
          </h2>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <GradeChip grade={item.grade} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/foods/${item.foodItemId}`}
                    className="text-sm font-medium text-ink hover:text-brand-ink"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {item.quantity} × {formatRupiah(item.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-ink tabular">
                  {formatRupiah(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="text-ink tabular">{formatRupiah(order.subtotal)}</dd>
            </div>
            {order.savings > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">You saved</dt>
                <dd className="text-available tabular">{formatRupiah(order.savings)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="font-medium text-ink">Total</dt>
              <dd className="font-semibold text-ink tabular">{formatRupiah(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Donation tracking — the institution's side of the same order. */}
      {isDonation && order.donation && (
        <section className="mt-10 rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              Donation to {order.donation.institution.name}
            </h2>
            <span className="text-xs text-ink-muted">
              {order.donation.meals} {order.donation.meals === 1 ? "meal" : "meals"} ·{" "}
              {order.donation.weightKg.toFixed(1)} kg
            </span>
          </div>

          <p className="mt-1 text-xs text-ink-muted">
            {order.donation.institution.name}, {order.donation.institution.city}
          </p>

          <div className="mt-5">
            <DonationTimeline
              status={order.donation.status}
              institutionName={order.donation.institution.name}
              timestamps={{
                createdAt: order.createdAt,
                deliveredAt: order.donation.deliveredAt,
                receivedAt: order.donation.receivedAt,
              }}
            />
          </div>

          {order.donation.status === "DELIVERED" ? (
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
              The institution confirmed receiving this donation. These{" "}
              {order.donation.meals} meals are counted in your impact.
            </p>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">
              You will be notified as soon as {order.donation.institution.name} confirms
              the food arrived.
            </p>
          )}
        </section>
      )}

      {/* Review prompt, only once the order is complete. */}
      {order.status === "COMPLETED" && (
        <section className="mt-10">
          {existingReview ? (
            <div className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">Your review</h2>
                <span
                  className="inline-flex items-center gap-1 text-xs text-ink-muted"
                  aria-label={`You rated this ${existingReview.rating} out of 5`}
                >
                  <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                  <span className="tabular">{existingReview.rating}</span>
                </span>
              </div>
              {existingReview.comment && (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {existingReview.comment}
                </p>
              )}
              <p className="mt-2 text-xs text-ink-muted">
                {formatDateTime(existingReview.createdAt)}
              </p>
            </div>
          ) : (
            <ReviewForm
              orderId={order.id}
              restaurantName={order.restaurant.name}
              itemNames={order.items.map((item) => item.name)}
            />
          )}
        </section>
      )}

      {order.notes && (
        <p className="mt-8 border-t border-line pt-5 text-sm text-ink-muted">
          <span className="font-medium text-ink-soft">Your note:</span> {order.notes}
        </p>
      )}

      <p className="mt-8 flex items-center gap-1.5 border-t border-line pt-5 text-xs text-ink-muted">
        <Clock aria-hidden="true" className="size-3.5" />
        Pickup windows are set by the restaurant. If you miss one, the food is
        marked expired and returned to the marketplace as waste avoided — so
        please collect on time.
      </p>
    </Container>
  );
}
