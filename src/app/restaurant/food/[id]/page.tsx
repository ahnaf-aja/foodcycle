import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { FoodForm, type FoodFormValues } from "@/components/restaurant/food-form";
import { requireRestaurant } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { FOOD_STATUS_META } from "@/lib/domain";

export async function generateMetadata(
  props: PageProps<"/restaurant/food/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const { restaurant } = await requireRestaurant();
  const item = await prisma.foodItem.findFirst({
    where: { id, restaurantId: restaurant.id },
    select: { name: true },
  });
  return { title: item ? `Edit ${item.name}` : "Listing not found" };
}

/** `datetime-local` wants a local `YYYY-MM-DDTHH:mm`, not an ISO/UTC string. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * Edit a listing.
 *
 * Fetched through `restaurantId` so that one restaurant cannot open another's
 * listing by guessing an id — the same scoping the update action enforces, which
 * means the page and the action agree about who owns what.
 */
export default async function EditFoodPage(props: PageProps<"/restaurant/food/[id]">) {
  const { id } = await props.params;
  const { restaurant } = await requireRestaurant();

  const item = await prisma.foodItem.findFirst({
    where: { id, restaurantId: restaurant.id },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      originalPrice: true,
      discountPrice: true,
      stock: true,
      grade: true,
      qualityScore: true,
      expirationTime: true,
      pickupDeadline: true,
      status: true,
      updatedAt: true,
      _count: { select: { orderItems: true } },
    },
  });

  if (!item) notFound();

  const initial: FoodFormValues = {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    originalPrice: item.originalPrice,
    discountPrice: item.discountPrice,
    stock: item.stock,
    grade: item.grade,
    qualityScore: item.qualityScore,
    expirationTime: toLocalInput(item.expirationTime),
    pickupDeadline: toLocalInput(item.pickupDeadline),
  };

  const status = FOOD_STATUS_META[item.status];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/restaurant/food"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to food
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {item.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {status.label} · {item._count.orderItems} ordered · updated{" "}
            {formatDateTime(item.updatedAt)}
          </p>
        </div>

        {/* Let the restaurant see exactly what the customer sees. */}
        {item.status === "AVAILABLE" && (
          <a
            href={`/foods/${item.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
          >
            View live listing
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </div>

      <div className="mt-8">
        <FoodForm initial={initial} />
      </div>
    </div>
  );
}
