import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { requireRestaurant } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

export const dynamic = "force-dynamic";

/**
 * Reviews, with the average and the distribution.
 *
 * The distribution is a plain list of five bars rather than a chart — it is
 * five numbers, and a chart would add a legend without adding meaning. The
 * average is stated as a number as well, so it never has to be read off the
 * bars.
 */
export default async function RestaurantReviewsPage() {
  const { restaurant } = await requireRestaurant();

  const reviews = await prisma.review.findMany({
    where: { restaurantId: restaurant.id },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
      foodItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : null;

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Only customers who have collected an order can leave a review, and each
          order can be reviewed once.
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Reviews appear here once customers have collected and rated their orders."
        />
      ) : (
        <>
          <div className="grid gap-8 rounded-lg border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
            <div className="text-center sm:text-left">
              <p className="text-4xl font-semibold text-ink tabular">
                {average!.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                from {total} {total === 1 ? "review" : "reviews"}
              </p>
            </div>

            <ul className="space-y-1.5">
              {distribution.map((band) => {
                const percent = total > 0 ? (band.count / total) * 100 : 0;
                return (
                  <li key={band.rating} className="flex items-center gap-3 text-xs">
                    <span className="w-3 shrink-0 text-ink-muted tabular">{band.rating}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span
                        className="block h-full rounded-full bg-soon"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-ink-muted tabular">
                      {band.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="space-y-5">
            {reviews.map((review) => (
              <li key={review.id} className="border-t border-line pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                    {initials(review.user.name)}
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {review.user.name ?? "A customer"}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatDate(review.createdAt)}
                  </span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted"
                    aria-label={`${review.rating} out of 5`}
                  >
                    <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                    <span className="tabular">{review.rating}</span>
                  </span>
                </div>

                {review.foodItem && (
                  <p className="mt-2 text-xs text-ink-muted">
                    On{" "}
                    <Link
                      href={`/foods/${review.foodItem.id}`}
                      className={cn("font-medium text-ink-soft hover:text-brand-ink")}
                    >
                      {review.foodItem.name}
                    </Link>
                  </p>
                )}

                {review.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
