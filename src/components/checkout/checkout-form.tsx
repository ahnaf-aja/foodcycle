"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Heart, Store, Truck, Utensils } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { checkoutAction } from "@/server/actions/checkout";
import { INSTITUTION_TYPE_LABEL } from "@/lib/domain";
import { cn, formatRupiah } from "@/lib/utils";
import type { InstitutionType } from "@prisma/client";

/**
 * Checkout, as three steps.
 *
 * The step is a piece of local state rather than a URL, because moving between
 * them is not navigation — there is nothing to bookmark or share halfway
 * through, and the order is only real once it is submitted.
 *
 * The purpose step is the emotional centre of the product, and it is built to
 * stay neutral: "For myself" and "Donate" are presented as equally valid
 * choices, with the same visual weight and no guilt-inducing copy on either
 * side. Donating is framed around what the institution needs, not around what
 * the customer owes.
 */

export type CheckoutInstitution = {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  description: string | null;
  supportedCount: number | null;
  needs: string[];
  _count: { donations: number };
};

type Purpose = "SELF" | "DONATION";
type Fulfillment = "PICKUP" | "DELIVERY";

const STEPS = ["Order", "Purpose", "Confirmation"] as const;

export function CheckoutForm({
  institutions,
  customerCity,
  subtotal,
  savings,
  total,
  itemCount,
}: {
  institutions: CheckoutInstitution[];
  customerCity?: string;
  subtotal: number;
  savings: number;
  total: number;
  itemCount: number;
}) {
  const [state, formAction, pending] = useActionState(checkoutAction, undefined);

  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<Purpose>("SELF");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("PICKUP");
  const [institutionId, setInstitutionId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const errors = state && !state.ok ? (state.errors ?? {}) : {};
  const selectedInstitution = institutions.find((i) => i.id === institutionId);

  /** Whether the current step is complete enough to advance. */
  const canAdvance =
    step === 0
      ? true
      : step === 1
        ? purpose === "SELF" || Boolean(institutionId)
        : true;

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="fulfillment" value={purpose === "DONATION" ? "PICKUP" : fulfillment} />
      <input type="hidden" name="institutionId" value={institutionId} />

      <div className="min-w-0">
        <Stepper current={step} onSelect={setStep} />

        {state && !state.ok && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2.5 text-sm text-urgent"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 1 — review the order                                        */}
        {/* ---------------------------------------------------------------- */}
        {step === 0 && (
          <section className="mt-6" aria-labelledby="step-order">
            <h2 id="step-order" className="text-lg font-semibold tracking-tight text-ink">
              Your order
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"} from{" "}
              {new Set(institutions).size >= 0 ? "the restaurants listed in your cart" : ""}.
              Check the pickup window for each before you continue.
            </p>

            <div className="mt-5 rounded-lg border border-line bg-surface p-4">
              <Field
                label="Notes for the restaurant"
                htmlFor="notes"
                hint="Optional — allergies, packaging, or how to find you"
                error={errors.notes}
              >
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  placeholder="e.g. Tolong dipisah per porsi, tanpa sambal."
                />
              </Field>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 2 — keep it or give it away                                 */}
        {/* ---------------------------------------------------------------- */}
        {step === 1 && (
          <section className="mt-6" aria-labelledby="step-purpose">
            <h2 id="step-purpose" className="text-lg font-semibold tracking-tight text-ink">
              What would you like to do with this food?
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Both choices are good ones. Pick whichever suits you today.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                selected={purpose === "SELF"}
                onSelect={() => setPurpose("SELF")}
                icon={Utensils}
                title="For myself"
                description="Collect it from the restaurant, or have it delivered."
              />
              <ChoiceCard
                selected={purpose === "DONATION"}
                onSelect={() => setPurpose("DONATION")}
                icon={Heart}
                title="Donate my order"
                description="We will send it to a registered institution on your behalf, and tell you when it arrives."
              />
            </div>

            {purpose === "SELF" && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-ink">How would you like it?</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    compact
                    selected={fulfillment === "PICKUP"}
                    onSelect={() => setFulfillment("PICKUP")}
                    icon={Store}
                    title="Pickup"
                    description="No delivery fee. Collect within the pickup window."
                  />
                  <ChoiceCard
                    compact
                    selected={fulfillment === "DELIVERY"}
                    onSelect={() => setFulfillment("DELIVERY")}
                    icon={Truck}
                    title="Delivery"
                    description="Delivered to your address."
                  />
                </div>

                {fulfillment === "DELIVERY" && (
                  <Field
                    label="Delivery address"
                    htmlFor="deliveryAddress"
                    error={errors.deliveryAddress}
                    required
                  >
                    <Textarea
                      id="deliveryAddress"
                      name="deliveryAddress"
                      required
                      placeholder="Jl. Kemang Selatan No. 12, RT 04 / RW 07, Jakarta Selatan"
                      invalid={Boolean(errors.deliveryAddress)}
                    />
                  </Field>
                )}
              </div>
            )}

            {purpose === "DONATION" && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Choose where your donation goes
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {customerCity
                      ? `Institutions in ${customerCity} are listed first.`
                      : "These institutions are registered and verified on FoodCycle."}
                  </p>
                </div>

                {errors.institutionId && (
                  <p role="alert" className="text-sm text-urgent">
                    {errors.institutionId}
                  </p>
                )}

                <ul className="space-y-3">
                  {institutions.map((institution) => (
                    <li key={institution.id}>
                      <InstitutionOption
                        institution={institution}
                        selected={institutionId === institution.id}
                        onSelect={() => setInstitutionId(institution.id)}
                        isLocal={Boolean(customerCity && institution.city === customerCity)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 3 — confirmation                                            */}
        {/* ---------------------------------------------------------------- */}
        {step === 2 && (
          <section className="mt-6" aria-labelledby="step-confirm">
            <h2 id="step-confirm" className="text-lg font-semibold tracking-tight text-ink">
              Confirmation
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              One last look before your order is sent to the restaurant.
            </p>

            <dl className="mt-5 divide-y divide-line rounded-lg border border-line bg-surface">
              <SummaryRow label="Items" value={`${itemCount} ${itemCount === 1 ? "portion" : "portions"}`} />
              <SummaryRow
                label="Purpose"
                value={purpose === "DONATION" ? "Donate to an institution" : "For myself"}
              />
              {purpose === "SELF" && (
                <SummaryRow
                  label="Fulfillment"
                  value={fulfillment === "PICKUP" ? "Pickup from the restaurant" : "Delivery"}
                />
              )}
              {purpose === "DONATION" && selectedInstitution && (
                <SummaryRow
                  label="Receiving"
                  value={`${selectedInstitution.name}, ${selectedInstitution.city}`}
                />
              )}
              <SummaryRow
                label="You save"
                value={formatRupiah(savings)}
                valueClassName="text-available"
              />
              <SummaryRow
                label="Total"
                value={formatRupiah(total)}
                valueClassName="text-base font-semibold"
              />
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              {purpose === "DONATION"
                ? "The restaurant prepares your order and hands it to the institution. You will be notified when the institution confirms it arrived, and the meals will be added to your impact."
                : "No payment is taken in this demo. Your order will be sent to the restaurant, and you will follow its progress on your orders page."}
            </p>
          </section>
        )}

        {/* Navigation ------------------------------------------------------- */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setStep((s) => s - 1)}
              disabled={pending}
            >
              Back
            </Button>
          )}

          {step < 2 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 sm:flex-none"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" size="lg" loading={pending} className="flex-1 sm:flex-none">
              {pending
                ? "Placing your order…"
                : purpose === "DONATION"
                  ? "Confirm donation"
                  : "Place order"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary rail ------------------------------------------------------ */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Summary</h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="font-medium text-ink tabular">{formatRupiah(subtotal)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-soft">You save</dt>
                <dd className="font-medium text-available tabular">−{formatRupiah(savings)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-medium text-ink">Total</dt>
              <dd className="text-lg font-semibold text-ink tabular">
                {formatRupiah(total)}
              </dd>
            </div>
          </dl>

          <ol className="mt-5 space-y-2 border-t border-line pt-4">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                    index < step
                      ? "bg-brand text-white"
                      : index === step
                        ? "bg-brand-soft text-brand-ink"
                        : "bg-surface-sunken text-ink-muted",
                  )}
                >
                  {index < step ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className={index === step ? "font-medium text-ink" : "text-ink-muted"}>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </form>
  );
}

/** The three-step progress indicator. Completed steps are clickable. */
function Stepper({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              // Only allow going back to a step already completed.
              disabled={index > current}
              onClick={() => index <= current && onSelect(index)}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
                state === "current" && "bg-brand-soft text-brand-ink",
                state === "done" && "text-ink-soft hover:bg-surface-sunken",
                state === "todo" && "text-ink-muted",
              )}
            >
              <span className="tabular">{index + 1}</span>
              {label}
            </button>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px w-4 bg-line-strong" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col rounded-lg border p-4 text-left transition-colors duration-150",
        selected
          ? "border-brand bg-brand-soft"
          : "border-line-strong bg-surface hover:bg-surface-sunken",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <Icon
          aria-hidden="true"
          className={cn("size-5", selected ? "text-brand" : "text-ink-muted")}
        />
        {selected && (
          <span className="flex size-4 items-center justify-center rounded-full bg-brand text-white">
            <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
          </span>
        )}
      </span>

      <span
        className={cn(
          "mt-2.5 text-sm font-semibold",
          selected ? "text-brand-ink" : "text-ink",
        )}
      >
        {title}
      </span>
      <span className={cn("mt-0.5 text-xs leading-relaxed", compact ? "" : "mt-1", "text-ink-muted")}>
        {description}
      </span>
    </button>
  );
}

/**
 * An institution as a selectable card.
 *
 * Shows what the institution supports and what it needs, because that is the
 * information a donor actually uses to choose. It states facts and stops —
 * there is no "only you can help" framing.
 */
function InstitutionOption({
  institution,
  selected,
  onSelect,
  isLocal,
}: {
  institution: CheckoutInstitution;
  selected: boolean;
  onSelect: () => void;
  isLocal: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-lg border p-4 text-left transition-colors duration-150",
        selected
          ? "border-brand bg-brand-soft"
          : "border-line-strong bg-surface hover:bg-surface-sunken",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", selected ? "text-brand-ink" : "text-ink")}>
            {institution.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {INSTITUTION_TYPE_LABEL[institution.type]} · {institution.city}
            {isLocal && <span className="ml-1.5 text-brand-ink">· Near you</span>}
          </p>
        </div>

        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
            selected ? "border-brand bg-brand text-white" : "border-line-strong",
          )}
        >
          {selected && <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />}
        </span>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
        {institution.supportedCount !== null && (
          <div>
            <dt className="text-ink-muted">Currently supporting</dt>
            <dd className="font-medium text-ink-soft tabular">
              {institution.supportedCount} people
            </dd>
          </div>
        )}
        {institution.needs.length > 0 && (
          <div>
            <dt className="text-ink-muted">Needed</dt>
            <dd className="font-medium text-ink-soft">{institution.needs.join(", ")}</dd>
          </div>
        )}
      </dl>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className={cn("text-sm text-ink tabular", valueClassName)}>{value}</dd>
    </div>
  );
}
