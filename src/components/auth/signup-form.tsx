"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Registration.
 *
 * Three account types, each genuinely different: a customer needs almost
 * nothing, a restaurant needs an address we can send people to, and an
 * institution needs a type and a scale. Rather than one long form with most
 * fields irrelevant to most people, the business fields appear only for the
 * role that requires them.
 *
 * The role is chosen with a segmented control rather than a `<select>`, because
 * it changes the shape of the form and that change should be obvious before it
 * happens.
 */

type Role = "CUSTOMER" | "RESTAURANT" | "SOCIAL_INSTITUTION";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "CUSTOMER", label: "Customer", hint: "Order food, or donate it" },
  { value: "RESTAURANT", label: "Restaurant", hint: "List your surplus food" },
  { value: "SOCIAL_INSTITUTION", label: "Institution", hint: "Receive donations" },
];

export function SignUpForm({ initialRole = "CUSTOMER" }: { initialRole?: Role }) {
  const [state, formAction, pending] = useActionState(signUpAction, undefined);
  const [role, setRole] = useState<Role>(initialRole);

  const errors = state && !state.ok ? (state.errors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="role" value={role} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">
          What kind of account do you need?
        </legend>

        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              aria-pressed={role === option.value}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left transition-colors duration-150",
                role === option.value
                  ? "border-brand bg-brand-soft"
                  : "border-line-strong bg-surface hover:bg-surface-sunken",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-medium",
                  role === option.value ? "text-brand-ink" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-ink-muted">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2.5 text-sm text-urgent"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="space-y-5">
        <Field
          label={role === "CUSTOMER" ? "Your name" : "Your name (contact person)"}
          htmlFor="name"
          error={errors.name}
          required
        >
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder={role === "CUSTOMER" ? "Andi Pratama" : "Bu Sari Wulandari"}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters"
          error={errors.password}
          required
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          hint={role === "CUSTOMER" ? "Optional, used for pickup questions" : "Optional"}
          error={errors.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+62 812 3456 7890"
            invalid={Boolean(errors.phone)}
          />
        </Field>
      </div>

      {role !== "CUSTOMER" && (
        <div className="space-y-5 border-t border-line pt-6">
          <h2 className="text-sm font-semibold text-ink">
            {role === "RESTAURANT" ? "Restaurant details" : "Institution details"}
          </h2>

          <Field
            label={role === "RESTAURANT" ? "Restaurant name" : "Institution name"}
            htmlFor="businessName"
            error={errors.businessName}
            required
          >
            <Input
              id="businessName"
              name="businessName"
              required
              placeholder={role === "RESTAURANT" ? "Dapur Bu Sari" : "Panti Asuhan Kasih Ibu"}
              invalid={Boolean(errors.businessName)}
            />
          </Field>

          {role === "SOCIAL_INSTITUTION" && (
            <Field
              label="Institution type"
              htmlFor="institutionType"
              error={errors.institutionType}
              required
            >
              <Select
                id="institutionType"
                name="institutionType"
                required
                defaultValue="ORPHANAGE"
                invalid={Boolean(errors.institutionType)}
              >
                <option value="ORPHANAGE">Orphanage</option>
                <option value="NURSING_HOME">Nursing home</option>
                <option value="FOOD_BANK">Food bank</option>
                <option value="SHELTER">Shelter</option>
                <option value="COMMUNITY_KITCHEN">Community kitchen</option>
              </Select>
            </Field>
          )}

          {role === "RESTAURANT" && (
            <Field
              label="Cuisine"
              htmlFor="cuisine"
              hint="Optional — helps customers find you"
              error={errors.cuisine}
            >
              <Input
                id="cuisine"
                name="cuisine"
                placeholder="Indonesian home cooking"
                invalid={Boolean(errors.cuisine)}
              />
            </Field>
          )}

          <Field label="Street address" htmlFor="address" error={errors.address} required>
            <Input
              id="address"
              name="address"
              required
              autoComplete="street-address"
              placeholder="Jl. Kemang Raya No. 42"
              invalid={Boolean(errors.address)}
            />
          </Field>

          <Field label="City" htmlFor="city" error={errors.city} required>
            <Input
              id="city"
              name="city"
              required
              autoComplete="address-level2"
              placeholder="Jakarta"
              invalid={Boolean(errors.city)}
            />
          </Field>

          {role === "SOCIAL_INSTITUTION" && (
            <Field
              label="People currently supported"
              htmlFor="supportedCount"
              hint="Shown to donors when they choose where their donation goes"
              error={errors.supportedCount}
            >
              <Input
                id="supportedCount"
                name="supportedCount"
                type="number"
                min={0}
                placeholder="35"
                invalid={Boolean(errors.supportedCount)}
              />
            </Field>
          )}

          {role === "SOCIAL_INSTITUTION" && (
            <p className="text-xs leading-relaxed text-ink-muted">
              New institutions are reviewed before donations go live, so that
              donors can be confident the food reaches people who need it.
            </p>
          )}
        </div>
      )}

      <Button type="submit" loading={pending} fullWidth size="lg">
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
