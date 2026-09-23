import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge, GradeChip } from "@/components/orders/order-timeline";
import { requireCustomer } from "@/server/auth-guards";
import { getCustomerOrders } from "@/server/orders";
import { formatRupiah, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders" };

export const dynamic = "force-dynamic";

/**
 * The customer's orders.
 *
 * Active orders are separated from past ones, because "what do I need to collect
 * today?" and "what did I order last month?" are different questions and mixing
 * them makes the first one slow to answer.
 */
export default async function OrdersPage() {
  const user = await requireCustomer();
  const orders = await getCustomerOrders(user.id);

  const active = orders.filter(
    (order) => order.status !== "COMPLETED" && order.status !== "CANCELLED",
  );
  const past = orders.filter(
    (order) => order.status === "COMPLETED" || order.status === "CANCELLED",
  );

  if (orders.length === 0) {
    return (
      <Container className="py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">My orders</h1>
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you order or donate surplus food, it will appear here with its pickup window and progress."
          action={{ href: "/foods", label: "Explore food" }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">My orders</h1>

      {active.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink uppercase">
            In progress
          </h2>
          <ul className="space-y-3">
            {active.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink uppercase">
            Past orders
          </h2>
          <ul className="space-y-3">
            {past.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

export type OrderCardData = Awaited<ReturnType<typeof getCustomerOrders>>[number];

function OrderCard({ order }: { order: OrderCardData }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li>
      <Link
        href={`/orders/${order.id}`}
        className="block rounded-lg border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{order.restaurant.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {order.orderNumber} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} purpose={order.purpose} />
        </div>

        <ul className="mt-3 space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-ink-soft">
              <GradeChip grade={item.grade} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0 text-xs text-ink-muted tabular">×{item.quantity}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
          <div className="text-xs text-ink-muted">
            {itemCount} {itemCount === 1 ? "portion" : "portions"}
            {order.donation && (
              <span className="ml-1.5 text-brand-ink">
                · for {order.donation.institution.name}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink tabular">
              {formatRupiah(order.total)}
            </p>
            {order.savings > 0 && (
              <p className="text-xs text-available tabular">
                saved {formatRupiah(order.savings)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
