"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * The sign-in form.
 *
 * Failures are shown once, in a single summary line above the fields, rather
 * than repeating a message under each input — for a login there is only ever
 * one thing wrong, and the user cannot tell which field caused it anyway.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2.5 text-sm text-urgent"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          invalid={Boolean(state && !state.ok && state.errors?.email)}
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          invalid={Boolean(state && !state.ok && state.errors?.password)}
        />
      </Field>

      <Button type="submit" loading={pending} fullWidth size="lg">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        New to FoodCycle?{" "}
        <Link href="/signup" className="font-medium text-brand-ink hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

/**
 * The demo accounts, listed so the app can be explored without registering.
 * Hidden on small screens to keep the sign-in page to one job.
 */
export function DemoAccounts() {
  const accounts = [
    { role: "Customer", email: "customer@foodcycle.demo" },
    { role: "Restaurant", email: "restaurant@foodcycle.demo" },
    { role: "Institution", email: "institution@foodcycle.demo" },
    { role: "Admin", email: "admin@foodcycle.demo" },
  ];

  return (
    <div className="hidden rounded-lg border border-line bg-surface p-5 lg:block">
      <h2 className="text-sm font-semibold text-ink">Demo accounts</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Every account uses the password <code className="font-mono">demo123</code>.
      </p>

      <dl className="mt-4 space-y-2.5">
        {accounts.map((account) => (
          <div key={account.email} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-ink-muted">{account.role}</dt>
            <dd className="truncate text-xs font-medium text-ink-soft">{account.email}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
        Sign in as the restaurant to accept and prepare an order; as the customer
        to watch the same order move; as the institution to confirm a donation
        arrived.
      </p>
    </div>
  );
}
