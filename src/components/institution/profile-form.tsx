"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { updateInstitutionProfileAction } from "@/server/actions/institution";

/**
 * The institution's public details.
 *
 * "What you need" is entered as a comma-separated list rather than a tag widget
 * — it is a handful of short phrases typed once, and a tag editor would be more
 * interface than the job requires.
 */
export function InstitutionProfileForm({
  initial,
  institutionType,
}: {
  initial: {
    name: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    supportedCount: number | null;
    needs: string[];
  };
  institutionType: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateInstitutionProfileAction,
    undefined,
  );
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
        <Field label="Institution name" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial.name}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="About your institution"
          htmlFor="description"
          error={errors.description}
          hint={`Type: ${institutionType}. Describe who you look after.`}
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={initial.description}
            maxLength={1000}
            placeholder="Panti asuhan yang menampung anak-anak usia sekolah. Kami menyediakan makan tiga kali sehari."
          />
        </Field>
      </div>

      <div className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">Donors see this</h2>

        <Field
          label="People currently supported"
          htmlFor="supportedCount"
          error={errors.supportedCount}
          hint="Shown to donors when they choose where their donation goes"
        >
          <Input
            id="supportedCount"
            name="supportedCount"
            type="number"
            min={0}
            max={100000}
            defaultValue={initial.supportedCount ?? ""}
            placeholder="35"
            invalid={Boolean(errors.supportedCount)}
          />
        </Field>

        <Field
          label="What you need"
          htmlFor="needs"
          error={errors.needs}
          hint="Comma separated, e.g. Meals, Rice, Fresh vegetables"
        >
          <Input
            id="needs"
            name="needs"
            defaultValue={initial.needs.join(", ")}
            placeholder="Meals, Rice, Bread"
          />
        </Field>
      </div>

      <div className="space-y-5 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">Location and contact</h2>

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

      <div className="border-t border-line pt-6">
        <Button type="submit" loading={pending} size="lg">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
