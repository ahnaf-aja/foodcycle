import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UtensilsCrossed } from "lucide-react";

import { FoodRow } from "@/components/food/food-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRestaurant } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { FOOD_STATUS_META } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { expireStaleListings } from "@/server/jobs";

export const metadata: Metadata = { title: "Food" };

export const dynamic = "force-dynamic";

/**
 * The restaurant's listings.
 *
 * Grouped by what the operator can do about them — live listings first, then
 * withdrawn, then finished — rather than by date. A listing that has expired or
 * sold out needs no attention; one that is live might.
 */
export default async function RestaurantFoodPage() {
  const { restaurant } = await requireRestaurant();
  await expireStaleListings();

  const items = await prisma.foodItem.findMany({
    where: { restaurantId: restaurant.id },
    select: {
      id: true,
      name: true,
      category: true,
      image: true,
      originalPrice: true,
      discountPrice: true,
      stock: true,
      grade: true,
      qualityScore: true,
      status: true,
      pickupDeadline: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const live = items.filter((item) => item.status === "AVAILABLE");
  const paused = items.filter((item) => item.status === "UNAVAILABLE");
  const finished = items.filter(
    (item) => item.status === "SOLD_OUT" || item.status === "EXPIRED",
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Food</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {live.length} {live.length === 1 ? "listing is" : "listings are"} live on the
            marketplace right now.
          </p>
        </div>

        <Link
          href="/restaurant/food/new"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          <Plus aria-hidden="true" className="size-4" />
          New listing
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nothing listed yet"
          description="List what you have left at the end of service. It appears in the marketplace immediately, and the stock updates itself as orders come in."
          action={{ href: "/restaurant/food/new", label: "Create your first listing" }}
        />
      ) : (
        <div className="space-y-8">
          <FoodGroup
            title="Live"
            description="Visible in the marketplace and available to order."
            items={live}
          />
          {paused.length > 0 && (
            <FoodGroup
              title="Withdrawn"
              description="Hidden from customers. You can make these available again at any time."
              items={paused}
            />
          )}
          {finished.length > 0 && (
            <FoodGroup
              title="Finished"
              description="Sold out or past their pickup deadline. These cannot be ordered."
              items={finished}
              muted
            />
          )}
        </div>
      )}
    </div>
  );
}

type FoodSummary = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  grade: "GRADE_A" | "GRADE_B" | "GRADE_C";
  qualityScore: number;
  status: "AVAILABLE" | "SOLD_OUT" | "EXPIRED" | "UNAVAILABLE";
  pickupDeadline: Date;
};

function FoodGroup({
  title,
  description,
  items,
  muted = false,
}: {
  title: string;
  description: string;
  items: FoodSummary[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          {title}
          <span className="ml-2 font-normal text-ink-muted tabular">{items.length}</span>
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      </div>

      <ul
        className={cn(
          "divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface",
          muted && "opacity-75",
        )}
      >
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              {/* FoodRow renders the listing itself; the wrapper carries the
                  link through to the edit page. */}
              <Link href={`/restaurant/food/${item.id}`} className="block">
                <span className="sr-only">Edit {item.name}</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/restaurant/food/${item.id}`}
                    className="block truncate text-sm font-medium text-ink hover:text-brand-ink"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {item.category} · quality {item.qualityScore}%
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-ink tabular">
                    {item.stock} left
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      item.status === "AVAILABLE"
                        ? "text-available"
                        : "text-unavailable",
                    )}
                  >
                    {FOOD_STATUS_META[item.status].label}
                  </p>
                </div>

                <Link
                  href={`/restaurant/food/${item.id}`}
                  className="shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
                >
                  Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
