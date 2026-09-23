"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateProfileAction } from "@/server/actions/profile";

/**
 * The signed-in person's own details.
 *
 * Email is shown but not editable: it is the account's identity, and changing
 * it is a security-sensitive operation that deserves its own verified flow
 * rather than a text field that silently rewrites a login.
 */
export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);
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

      <Field label="Name" htmlFor="name" error={errors.name} required>
        <Input
          id="name"
          name="name"
          required
          autoComplete="name"
          defaultValue={initial.name}
          invalid={Boolean(errors.name)}
        />
      </Field>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <p className="mt-0.5 mb-1.5 text-xs text-ink-muted">
          Your email is used to sign in and cannot be changed here.
        </p>
        <Input id="email" value={initial.email} disabled readOnly />
      </div>

      <Field
        label="Phone"
        htmlFor="phone"
        error={errors.phone}
        hint="Shared with the restaurant so they can reach you about a pickup"
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={initial.phone}
          placeholder="+62 812 3456 7890"
          invalid={Boolean(errors.phone)}
        />
      </Field>

      <div className="border-t border-line pt-6">
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
