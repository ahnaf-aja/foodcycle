import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Package, Sparkles, Store } from "lucide-react";

import { Container, Section } from "@/components/layout/shell";
import { FoodGrid } from "@/components/food/food-grid";
import { OrderStatusBadge, GradeChip } from "@/components/orders/order-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { requireCustomer } from "@/server/auth-guards";
import { getCustomerOrders } from "@/server/orders";
import { getPersonalImpact } from "@/server/impact";
import { getHomeShelves, getRecommendationProfile } from "@/server/foods";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My FoodCycle" };

export const dynamic = "force-dynamic";

/**
 * The customer dashboard — "My FoodCycle".
 *
 * Not a corporate dashboard: it answers "what have I got coming, what should I
 * eat next, and what have I done so far". Live orders first because they have a
 * deadline attached; recommendations second; the record of what has already
 * happened last.
 */
export default async function CustomerDashboardPage() {
  const user = await requireCustomer();
  const profile = await getRecommendationProfile(user.id);

  const [orders, impact, shelves, savedRestaurants] = await Promise.all([
    getCustomerOrders(user.id, { limit: 20 }),
    getPersonalImpact(user.id),
    getHomeShelves(profile),
    prisma.savedRestaurant.findMany({
      where: { userId: user.id },
      select: {
        restaurant: {
          select: { id: true, name: true, slug: true, city: true, cuisine: true },
        },
      },
      take: 4,
    }),
  ]);

  const active = orders.filter(
    (order) => order.status !== "COMPLETED" && order.status !== "CANCELLED",
  );
  const donations = orders.filter((order) => order.purpose === "DONATION");
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Hello, {firstName}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {active.length > 0
          ? `You have ${active.length} ${active.length === 1 ? "order" : "orders"} in progress.`
          : "Nothing on the way right now."}
      </p>

      {/* Current orders — with the deadline, because that is the actionable part. */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Current orders</h2>
          {orders.length > 0 && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
            >
              All orders
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          )}
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders in progress"
            description="When you order or donate surplus food, you will be able to follow it here from confirmation through to pickup."
            action={{ href: "/foods", label: "Explore food" }}
          />
        ) : (
          <ul className="space-y-3">
            {active.map((order) => {
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const deadline = order.items[0]?.foodItem;

              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="block rounded-lg border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {order.restaurant.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {order.orderNumber} · {itemCount}{" "}
                          {itemCount === 1 ? "portion" : "portions"} ·{" "}
                          {formatRupiah(order.total)}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} purpose={order.purpose} />
                    </div>

                    <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-1.5 text-xs text-ink-muted"
                        >
                          <GradeChip grade={item.grade} />
                          <span className="truncate">{item.name}</span>
                          <span className="tabular">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>

                    {deadline && (
                      <p className="mt-2 text-xs text-ink-muted">
                        Pickup before {formatTime(deadline.pickupDeadline)}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recommendations */}
      {shelves.recommended.length > 0 && (
        <Section
          className="mt-12"
          title="Recommended for you"
          description={
            profile.hasHistory
              ? "Based on what you have ordered before, and what is good today."
              : "Good quality, well rated, and available near you."
          }
          action={
            <Link
              href="/foods"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
            >
              Explore all
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        >
          <FoodGrid listings={shelves.recommended.slice(0, 4)} reasons={shelves.reasons} />
        </Section>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* Donation history */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Donation history
          </h2>

          {donations.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface px-5 py-8 text-center">
              <Heart aria-hidden="true" className="mx-auto size-5 text-ink-muted" />
              <p className="mt-3 text-sm font-medium text-ink">
                You have not donated an order yet
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                At checkout you can choose to send your order to a registered
                institution instead of collecting it.
              </p>
              <Link
                href="/donate"
                className="mt-4 inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
              >
                How donation works
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {donations.slice(0, 5).map((order) => (
                <li key={order.id} className="px-4 py-3">
                  <Link href={`/orders/${order.id}`} className="block">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {order.donation?.institution.name ?? "Donation"}
                      </p>
                      <span className="text-xs text-ink-muted">
                        {order.donation?.status === "DELIVERED" ? "Received" : "In progress"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {order.donation?.meals ?? 0}{" "}
                      {order.donation?.meals === 1 ? "meal" : "meals"} from{" "}
                      {order.restaurant.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Impact */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">Your impact</h2>
          <div className="rounded-lg border border-line bg-surface p-5">
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-ink-muted">Meals saved</dt>
                <dd className="mt-1 text-2xl font-semibold text-ink tabular">
                  {impact.mealsSaved}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Meals donated</dt>
                <dd className="mt-1 text-2xl font-semibold text-ink tabular">
                  {impact.mealsDonated}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Waste prevented</dt>
                <dd className="mt-1 text-2xl font-semibold text-ink tabular">
                  {impact.weightKg.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-ink-muted">kg</span>
                </dd>
              </div>
            </dl>

            <Link
              href="/impact"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
            >
              <Sparkles aria-hidden="true" className="size-3.5" />
              See your full impact
            </Link>
          </div>
        </section>
      </div>

      {/* Saved restaurants */}
      {savedRestaurants.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Saved restaurants
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {savedRestaurants.map(({ restaurant }) => (
              <li key={restaurant.id}>
                <Link
                  href={`/restaurants/${restaurant.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-line-strong"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft">
                    <Store aria-hidden="true" className="size-4 text-brand-ink" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {restaurant.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {restaurant.cuisine ?? restaurant.city}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
