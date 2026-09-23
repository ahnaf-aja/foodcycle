import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain";

const TONE_CLASS: Record<Tone, string> = {
  available: "bg-available-soft text-available",
  soon: "bg-soon-soft text-soon",
  urgent: "bg-urgent-soft text-urgent",
  unavailable: "bg-unavailable-soft text-unavailable",
  neutral: "bg-surface-sunken text-ink-soft",
};

/**
 * A small, quiet status pill.
 *
 * Deliberately not a shouty badge: flat tinted background, no border, no
 * shadow, sentence-case text. Callers must pair the tone with readable text,
 * so meaning never depends on colour alone.
 */
export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * The FoodCycle Grade marker.
 *
 * Renders "Grade A" with the grade's tone plus a visually-hidden expansion of
 * what that means, so a screen-reader user gets the same information a sighted
 * user gets from the tooltip.
 */
export function GradeBadge({
  grade,
  label,
  summary,
  className,
  size = "md",
}: {
  grade: string;
  label: string;
  summary: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const tone = grade === "GRADE_A" ? "available" : grade === "GRADE_B" ? "soon" : "urgent";
  const letter = grade === "GRADE_A" ? "A" : grade === "GRADE_B" ? "B" : "C";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="font-semibold">
        {letter}
      </span>
      <span>
        {label}
        <span className="sr-only"> — {summary}</span>
      </span>
    </span>
  );
}

/**
 * A small dot plus text, for stock and availability states.
 * The dot reinforces the label; it never replaces it.
 */
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  const dot: Record<Tone, string> = {
    available: "bg-available",
    soon: "bg-soon",
    urgent: "bg-urgent",
    unavailable: "bg-unavailable",
    neutral: "bg-ink-muted",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot[tone])} />
      {children}
    </span>
  );
}
