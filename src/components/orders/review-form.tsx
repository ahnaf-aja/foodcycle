"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { createReviewAction } from "@/server/actions/reviews";
import { cn } from "@/lib/utils";

/**
 * Leaving a review.
 *
 * The rating is a real radio group, visually rendered as stars. Using radios
 * rather than a row of buttons means it is keyboard-navigable with the arrow
 * keys and announced properly, without any extra ARIA to maintain.
 */
export function ReviewForm({
  orderId,
  restaurantName,
  itemNames,
}: {
  orderId: string;
  restaurantName: string;
  itemNames: string[];
}) {
  const [state, formAction, pending] = useActionState(createReviewAction, undefined);
  const [rating, setRating] = useState(0);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-available/30 bg-available-soft p-5">
        <p className="text-sm font-medium text-available">Thanks — your review is published.</p>
        <p className="mt-1 text-sm text-available">
          It will help other customers choose well.
        </p>
      </div>
    );
  }

  const summary =
    itemNames.length === 1
      ? itemNames[0]
      : `${itemNames.slice(0, 2).join(", ")}${itemNames.length > 2 ? ` and ${itemNames.length - 2} more` : ""}`;

  return (
    <form
      action={formAction}
      className="rounded-lg border border-line bg-surface p-5"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />

      <h2 className="text-sm font-semibold text-ink">
        How was your order from {restaurantName}?
      </h2>
      <p className="mt-1 text-xs text-ink-muted">{summary}</p>

      <fieldset className="mt-4">
        <legend className="sr-only">Your rating out of 5</legend>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-sm p-0.5 transition-transform duration-150 hover:scale-105"
            >
              <input
                type="radio"
                name="ratingChoice"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="peer sr-only"
              />
              <Star
                aria-hidden="true"
                className={cn(
                  "size-7 transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
                  value <= rating
                    ? "fill-current text-soon"
                    : "text-line-strong hover:text-soon/50",
                )}
              />
              <span className="sr-only">{value} out of 5</span>
            </label>
          ))}

          {rating > 0 && (
            <span className="ml-2 text-sm text-ink-muted">
              {rating === 5
                ? "Excellent"
                : rating === 4
                  ? "Good"
                  : rating === 3
                    ? "Fine"
                    : rating === 2
                      ? "Below expectations"
                      : "Poor"}
            </span>
          )}
        </div>

        {state && !state.ok && state.errors?.rating && (
          <p role="alert" className="mt-2 text-xs text-urgent">
            {state.errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <Field
          label="Comment"
          htmlFor="comment"
          hint="Optional — what was good, or what could be better?"
          error={state && !state.ok ? state.errors?.comment : undefined}
        >
          <Textarea
            id="comment"
            name="comment"
            maxLength={1000}
            placeholder="The food was still warm and the portion was generous."
          />
        </Field>
      </div>

      {state && !state.ok && !state.errors && (
        <p role="alert" className="mt-3 text-sm text-urgent">
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={rating === 0}
        className="mt-4"
      >
        {pending ? "Publishing…" : "Publish review"}
      </Button>

      {rating === 0 && (
        <p className="mt-2 text-xs text-ink-muted">Choose a rating to continue.</p>
      )}
    </form>
  );
}
