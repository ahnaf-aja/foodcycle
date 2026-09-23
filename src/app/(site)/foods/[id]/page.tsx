import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Star, Store, Utensils } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { FoodImage } from "@/components/food/food-image";
import { FoodRow } from "@/components/food/food-card";
import { AddToCart } from "@/components/cart/add-to-cart";
import { GradeQualityPanel } from "@/components/food/grade-quality-panel";
import { Badge, GradeBadge, StatusDot } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";

import { getFoodItem, getSimilarFoods } from "@/server/foods";
import { getCurrentUser } from "@/server/auth-guards";
import { GRADE_META, FOOD_STATUS_META, GRADE_DISCLAIMER } from "@/lib/domain";
import {
  formatRupiah,
  formatTime,
  formatDateTime,
  formatDate,
  discountPercent,
  savingsPerUnit,
  timeRemaining,
  deadlineUrgency,
  timeAgo,
} from "@/lib/utils";

/**
 * A single listing.
 *
 * Desktop puts the photograph on the left and everything a customer needs to
 * decide on the right, so the price and the add-to-cart button are visible
 * without scrolling. The detail that matters most — when pickup closes — sits
 * immediately under the price, not buried in a specification table.
 */

export async function generateMetadata(
  props: PageProps<"/foods/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const item = await getFoodItem(id);

  if (!item) return { title: "Food not found" };

  return {
    title: item.name,
    description:
      item.description ??
      `${item.name} from ${item.restaurant.name} — ${formatRupiah(item.discountPrice)}, down from ${formatRupiah(item.originalPrice)}.`,
  };
}

export default async function FoodDetailPage(props: PageProps<"/foods/[id]">) {
  const { id } = await props.params;

  const item = await getFoodItem(id);
  if (!item) notFound();

  const [user, similar] = await Promise.all([
    getCurrentUser(),
    getSimilarFoods({
      id: item.id,
      category: item.category,
      restaurantId: item.restaurant.id,
    }),
  ]);

  const discount = discountPercent(item.originalPrice, item.discountPrice);
  const grade = GRADE_META[item.grade];
  const status = FOOD_STATUS_META[item.status];

  const now = new Date();
  const urgency = deadlineUrgency(item.pickupDeadline, now);
  const remaining = timeRemaining(item.pickupDeadline, now);
  const pickupPassed = item.pickupDeadline <= now;

  // A listing is only buyable if the restaurant still has it and the pickup
  // window is open.
  const soldOut = item.stock <= 0 || item.status !== "AVAILABLE" || pickupPassed;

  const restaurantRatings = item.restaurant.reviews.map((r) => r.rating);
  const restaurantAverage =
    restaurantRatings.length > 0
      ? restaurantRatings.reduce((a, b) => a + b, 0) / restaurantRatings.length
      : null;

  const itemRatings = item.reviews.map((r) => r.rating);
  const itemAverage =
    itemRatings.length > 0 ? itemRatings.reduce((a, b) => a + b, 0) / itemRatings.length : null;

  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/foods" className="hover:text-ink">
              Explore food
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/foods?category=${encodeURIComponent(item.category)}`}
              className="hover:text-ink"
            >
              {item.category}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate text-ink" aria-current="page">
            {item.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <FoodImage
            src={item.image}
            alt={item.name}
            category={item.category}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-[4/3] w-full rounded-lg"
          />

          {soldOut && (
            <p className="mt-3 rounded-md bg-unavailable-soft px-3 py-2 text-sm text-unavailable">
              {pickupPassed
                ? "This pickup window has closed."
                : item.stock <= 0
                  ? "Every portion of this listing has been claimed."
                  : status.description}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <GradeBadge grade={item.grade} label={grade.label} summary={grade.summary} />
            {!soldOut && urgency === "urgent" && (
              <Badge tone="urgent">
                <Clock aria-hidden="true" className="size-3" />
                Ending soon
              </Badge>
            )}
            {!soldOut && urgency !== "urgent" && (
              <StatusDot tone="available">Available</StatusDot>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {item.name}
          </h1>

          <Link
            href={`/restaurants/${item.restaurant.slug}`}
            className="mt-2 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors duration-150 hover:text-brand-ink"
          >
            <Store aria-hidden="true" className="size-4 text-ink-muted" />
            <span className="font-medium">{item.restaurant.name}</span>
            <span className="text-ink-muted">· {item.restaurant.city}</span>
            {restaurantAverage !== null && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                <span className="tabular">{restaurantAverage.toFixed(1)}</span>
                <span>({item.restaurant._count.reviews})</span>
              </span>
            )}
          </Link>

          {/* Price block — the most important information on the page. */}
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold text-ink tabular">
              {formatRupiah(item.discountPrice)}
            </span>
            {discount > 0 && (
              <>
                <span className="text-base text-ink-muted line-through tabular">
                  {formatRupiah(item.originalPrice)}
                </span>
                <span className="rounded-xs bg-brand-soft px-2 py-0.5 text-sm font-medium text-brand-ink tabular">
                  {discount}% off
                </span>
              </>
            )}
          </div>

          {discount > 0 && (
            <p className="mt-1 text-sm text-available">
              You save {formatRupiah(savingsPerUnit(item.originalPrice, item.discountPrice))} per
              portion
            </p>
          )}

          {/* Pickup deadline — the second most important fact. */}
          <div className="mt-5 space-y-2 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <Clock
                aria-hidden="true"
                className={
                  urgency === "urgent"
                    ? "mt-0.5 size-4 shrink-0 text-urgent"
                    : urgency === "soon"
                      ? "mt-0.5 size-4 shrink-0 text-soon"
                      : "mt-0.5 size-4 shrink-0 text-ink-muted"
                }
              />
              <div>
                <p className="text-sm font-medium text-ink">
                  {pickupPassed ? "Pickup closed" : `Pickup before ${formatTime(item.pickupDeadline)}`}
                  {remaining && !pickupPassed && (
                    <span
                      className={
                        urgency === "urgent"
                          ? "ml-1.5 text-urgent"
                          : urgency === "soon"
                            ? "ml-1.5 text-soon"
                            : "ml-1.5 text-ink-muted"
                      }
                    >
                      · {remaining}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Collect from {item.restaurant.name}, {item.restaurant.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 border-t border-line pt-2">
              <Utensils aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
              <p className="text-xs text-ink-muted">
                {item.stock > 0 ? (
                  <>
                    <span className="font-medium text-ink-soft tabular">{item.stock}</span>{" "}
                    {item.stock === 1 ? "portion" : "portions"} remaining · best before{" "}
                    {formatDateTime(item.expirationTime)}
                  </>
                ) : (
                  <>No portions remaining</>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <AddToCart
              foodItemId={item.id}
              stock={item.stock}
              price={item.discountPrice}
              isSignedIn={Boolean(user)}
              isCustomer={!user || user.role === "CUSTOMER"}
              soldOut={soldOut}
            />
          </div>

          <div className="mt-5">
            <GradeQualityPanel grade={item.grade} qualityScore={item.qualityScore} />
          </div>
        </div>
      </div>

      {/* Detail below the fold. */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          {item.description && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">
                About this food
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                {item.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">
              What the grade means
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
              <p>
                <span className="font-medium text-ink">{grade.label}</span> — {grade.description}
              </p>
              <p className="text-xs text-ink-muted">{GRADE_DISCLAIMER}</p>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Reviews</h2>
              {itemAverage !== null && (
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <Star aria-hidden="true" className="size-4 fill-current text-soon" />
                  <span className="font-medium text-ink tabular">{itemAverage.toFixed(1)}</span>
                  <span>
                    · {itemRatings.length} {itemRatings.length === 1 ? "review" : "reviews"}
                  </span>
                </span>
              )}
            </div>

            {item.reviews.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No reviews for this listing yet. Reviews can only be left by
                customers who have collected an order.
              </p>
            ) : (
              <ul className="space-y-5">
                {item.reviews.map((review) => (
                  <li key={review.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-ink">
                        {(review.user.name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {review.user.name ?? "A customer"}
                      </span>
                      <span className="text-xs text-ink-muted">{timeAgo(review.createdAt)}</span>
                      <span
                        className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted"
                        aria-label={`${review.rating} out of 5`}
                      >
                        <Star aria-hidden="true" className="size-3.5 fill-current text-soon" />
                        <span className="tabular">{review.rating}</span>
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        {review.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink">The restaurant</h2>
            <div className="rounded-lg border border-line bg-surface p-4">
              <Link
                href={`/restaurants/${item.restaurant.slug}`}
                className="text-sm font-medium text-ink hover:text-brand-ink"
              >
                {item.restaurant.name}
              </Link>
              {item.restaurant.cuisine && (
                <p className="mt-0.5 text-xs text-ink-muted">{item.restaurant.cuisine}</p>
              )}
              {item.restaurant.description && (
                <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                  {item.restaurant.description}
                </p>
              )}
              <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
                <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {item.restaurant.address}, {item.restaurant.city}
              </p>
              <Link
                href={`/restaurants/${item.restaurant.slug}`}
                className="mt-3 inline-flex text-xs font-medium text-brand-ink hover:underline"
              >
                See everything from {item.restaurant.name}
              </Link>
            </div>
          </section>

          {similar.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-ink">
                Similar food
              </h2>
              <div className="-mx-2">
                {similar.map((listing) => (
                  <FoodRow key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
        Listed {formatDate(item.createdAt)} · Last updated{" "}
        <time dateTime={item.updatedAt.toISOString()}>{timeAgo(item.updatedAt)}</time>
        <InfoTip label="About listing freshness" className="ml-1">
          Quality Score reflects how recently this listing was updated, the
          remaining consumption window, storage conditions, and the restaurant's
          own assessment.
        </InfoTip>
      </p>
    </Container>
  );
}
