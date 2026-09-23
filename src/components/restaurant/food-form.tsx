"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { InfoTip } from "@/components/ui/info-tip";
import { createFoodAction, updateFoodAction } from "@/server/actions/food";
import { FOOD_CATEGORIES, GRADE_META, QUALITY_EXPLANATION, GRADE_DISCLAIMER } from "@/lib/domain";
import { cn, formatRupiah, discountPercent } from "@/lib/utils";
import type { Grade } from "@prisma/client";

/**
 * Creating or editing a listing.
 *
 * Two things this form has to make easy, because they are what makes the
 * marketplace trustworthy:
 *
 *  1. Choosing a grade and a quality score. Both carry an explainer, and the
 *     form is explicit that a grade is a freshness indicator rather than a
 *     safety certification — the restaurant is the one responsible for that.
 *  2. Seeing the discount. The percentage is computed and shown live as the
 *     prices are typed, so nobody lists a 3% "deal" by accident.
 *
 * The same component serves create and edit; `initial` decides which action it
 * submits to.
 */

export type FoodFormValues = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  grade: Grade;
  qualityScore: number;
  expirationTime: string; // datetime-local value
  pickupDeadline: string;
};

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not ISO/UTC. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const GRADE_OPTIONS: { value: Grade; label: string; hint: string }[] = (
  ["GRADE_A", "GRADE_B", "GRADE_C"] as Grade[]
).map((grade) => ({
  value: grade,
  label: `${GRADE_META[grade].label} — ${GRADE_META[grade].summary}`,
  hint: GRADE_META[grade].description,
}));

export function FoodForm({ initial }: { initial?: FoodFormValues }) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateFoodAction : createFoodAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  // Default the pickup window to this evening and the expiry to later tonight —
  // the shape of a real surplus listing.
  const now = new Date();
  const defaultPickup = new Date(now.getTime() + 6 * 3_600_000);
  const defaultExpiry = new Date(now.getTime() + 10 * 3_600_000);

  const [originalPrice, setOriginalPrice] = useState(initial?.originalPrice ?? 50000);
  const [discountPrice, setDiscountPrice] = useState(initial?.discountPrice ?? 25000);
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? "GRADE_A");

  const discount = discountPercent(originalPrice, discountPrice);
  const errors = state && !state.ok ? (state.errors ?? {}) : {};

  // Warn rather than block: a shallow discount is unusual but not invalid.
  const shallowDiscount = discount > 0 && discount < 20;
  const noDiscount = discount <= 0;

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="foodItemId" value={initial!.id} />}

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2.5 text-sm text-urgent"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      {state?.ok && state.message && (
        <p role="status" className="rounded-md bg-available-soft px-3 py-2.5 text-sm text-available">
          {state.message}
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-ink">What are you listing?</legend>

        <Field label="Food name" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name}
            placeholder="Nasi Ayam Teriyaki"
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="Category"
          htmlFor="category"
          error={errors.category}
          hint="Used for filtering and for recommendations"
          required
        >
          <Select
            id="category"
            name="category"
            required
            defaultValue={initial?.category ?? ""}
            invalid={Boolean(errors.category)}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {FOOD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description}
          hint="What is in it, how it was cooked, anything a customer should know"
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description ?? ""}
            maxLength={1000}
            placeholder="Ayam paha atas dimasak dengan saus teriyaki, disajikan dengan nasi putih, tumis buncis, dan telur mata sapi."
          />
        </Field>
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="text-sm font-semibold text-ink">Price and stock</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Original price"
            htmlFor="originalPrice"
            error={errors.originalPrice}
            hint="What you normally charge"
            required
          >
            <Input
              id="originalPrice"
              name="originalPrice"
              type="number"
              inputMode="numeric"
              min={1000}
              max={5000000}
              step={500}
              required
              value={originalPrice}
              onChange={(event) => setOriginalPrice(Number(event.target.value))}
              invalid={Boolean(errors.originalPrice)}
            />
          </Field>

          <Field
            label="FoodCycle price"
            htmlFor="discountPrice"
            error={errors.discountPrice}
            hint="What customers pay"
            required
          >
            <Input
              id="discountPrice"
              name="discountPrice"
              type="number"
              inputMode="numeric"
              min={1000}
              max={5000000}
              step={500}
              required
              value={discountPrice}
              onChange={(event) => setDiscountPrice(Number(event.target.value))}
              invalid={Boolean(errors.discountPrice)}
            />
          </Field>
        </div>

        {/* Live discount feedback. */}
        <div
          aria-live="polite"
          className={cn(
            "rounded-md px-3 py-2.5 text-sm",
            noDiscount
              ? "bg-urgent-soft text-urgent"
              : shallowDiscount
                ? "bg-soon-soft text-soon"
                : "bg-available-soft text-available",
          )}
        >
          {noDiscount ? (
            <>The FoodCycle price must be below the original price.</>
          ) : (
            <>
              <span className="font-semibold tabular">{discount}% off</span> — customers pay{" "}
              <span className="tabular">{formatRupiah(discountPrice)}</span> instead of{" "}
              <span className="tabular">{formatRupiah(originalPrice)}</span>.
              {shallowDiscount && " A deeper discount tends to move surplus faster."}
            </>
          )}
        </div>

        <Field
          label="Portions available"
          htmlFor="stock"
          error={errors.stock}
          hint="The marketplace shows this and reduces it automatically as orders come in"
          required
        >
          <Input
            id="stock"
            name="stock"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            required
            defaultValue={initial?.stock ?? 10}
            invalid={Boolean(errors.stock)}
          />
        </Field>
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          Condition
          <InfoTip label="About grade and quality">
            <span className="block">{QUALITY_EXPLANATION}</span>
            <span className="mt-2 block border-t border-line pt-2 text-ink-muted">
              {GRADE_DISCLAIMER}
            </span>
          </InfoTip>
        </legend>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink">
            Grade
            <span className="ml-0.5 text-urgent" aria-hidden="true">
              *
            </span>
          </span>

          <div className="space-y-2">
            {GRADE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 transition-colors duration-150",
                  grade === option.value
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface hover:bg-surface-sunken",
                )}
              >
                <input
                  type="radio"
                  name="grade"
                  value={option.value}
                  checked={grade === option.value}
                  onChange={() => setGrade(option.value)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    grade === option.value ? "border-brand" : "border-line-strong",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30",
                  )}
                >
                  {grade === option.value && <span className="size-2 rounded-full bg-brand" />}
                </span>

                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      grade === option.value ? "text-brand-ink" : "text-ink",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {errors.grade && (
            <p role="alert" className="mt-2 text-xs text-urgent">
              {errors.grade}
            </p>
          )}
        </div>

        <Field
          label="Quality score"
          htmlFor="qualityScore"
          error={errors.qualityScore}
          hint="0–100. Reflects listing freshness, remaining consumption window, storage, and your own assessment."
          required
        >
          <Input
            id="qualityScore"
            name="qualityScore"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            required
            defaultValue={initial?.qualityScore ?? 90}
            invalid={Boolean(errors.qualityScore)}
          />
        </Field>
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="text-sm font-semibold text-ink">Timing</legend>

        <p className="flex items-start gap-2 rounded-md bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
          The pickup deadline is when a customer must have collected the food by.
          Once it passes, the listing is marked expired and can no longer be
          bought. Food must not expire before the pickup deadline.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Pickup deadline"
            htmlFor="pickupDeadline"
            error={errors.pickupDeadline}
            required
          >
            <Input
              id="pickupDeadline"
              name="pickupDeadline"
              type="datetime-local"
              required
              defaultValue={initial?.pickupDeadline ?? toLocalInput(defaultPickup)}
              invalid={Boolean(errors.pickupDeadline)}
            />
          </Field>

          <Field
            label="Best before"
            htmlFor="expirationTime"
            error={errors.expirationTime}
            hint="When the food is no longer at its best"
            required
          >
            <Input
              id="expirationTime"
              name="expirationTime"
              type="datetime-local"
              required
              defaultValue={initial?.expirationTime ?? toLocalInput(defaultExpiry)}
              invalid={Boolean(errors.expirationTime)}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={pending} size="lg">
          {pending
            ? isEdit
              ? "Saving…"
              : "Listing…"
            : isEdit
              ? "Save changes"
              : "List this food"}
        </Button>

        <Link
          href="/restaurant/inventory"
          className="inline-flex h-12 items-center rounded-md px-4 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
