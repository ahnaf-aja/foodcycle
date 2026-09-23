"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { updateRestaurantProfileAction } from "@/server/actions/profile";

/**
 * The restaurant's public details.
 *
 * "Accepting orders" is a visible switch rather than something buried in
 * settings, because a restaurant closing for the day is a routine, frequent
 * action — and while it is off, their listings stop being offered.
 */
export function RestaurantProfileForm({
  initial,
  publicUrl,
}: {
  initial: {
    name: string;
    description: string;
    cuisine: string;
    address: string;
    city: string;
    phone: string;
    isOpen: boolean;
  };
  publicUrl: string;
}) {
  const [state, formAction, pending] = useActionState(updateRestaurantProfileAction, undefined);
  const errors = state && !state.ok ? (state.errors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="space-y-5">
        <Field label="Restaurant name" htmlFor="name" error={errors.name} required>
          <Input id="name" name="name" required defaultValue={initial.name} invalid={Boolean(errors.name)} />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description}
          hint="What you cook, and how you handle surplus"
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={initial.description}
            maxLength={1000}
            placeholder="Masakan rumahan Jawa yang dimasak segar setiap pagi."
          />
        </Field>

        <Field
          label="Cuisine"
          htmlFor="cuisine"
          error={errors.cuisine}
          hint="Shown next to your name in search results"
        >
          <Input
            id="cuisine"
            name="cuisine"
            defaultValue={initial.cuisine}
            placeholder="Indonesian home cooking"
          />
        </Field>
      </div>

      <div className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">Where customers collect</h2>

        <Field label="Street address" htmlFor="address" error={errors.address} required>
          <Input
            id="address"
            name="address"
            required
            defaultValue={initial.address}
            invalid={Boolean(errors.address)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" htmlFor="city" error={errors.city} required>
            <Input
              id="city"
              name="city"
              required
              defaultValue={initial.city}
              invalid={Boolean(errors.city)}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} />
          </Field>
        </div>
      </div>

      {/* Availability */}
      <div className="border-t border-line pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="isOpen"
            defaultChecked={initial.isOpen}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors duration-150 peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"
          >
            <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-surface transition-transform duration-150 peer-checked:translate-x-4" />
          </span>
          <span>
            <span className="block text-sm font-medium text-ink">Accepting orders</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              While this is off, your listings stay visible but cannot be ordered.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={pending} size="lg">
          {pending ? "Saving…" : "Save profile"}
        </Button>

        <Link
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          View public page
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </form>
  );
}
