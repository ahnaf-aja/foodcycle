import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain";

/**
 * A single figure on a dashboard.
 *
 * Used sparingly and only where the number changes what the operator does next
 * — an order count that means work waiting, a stock level that means a listing
 * about to sell out. A number that nobody acts on does not belong on a
 * dashboard, however easy it is to compute.
 *
 * Optionally a link, when the figure is also the way to the thing it counts.
 */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const toneClass: Record<Tone, string> = {
    available: "text-available",
    soon: "text-soon",
    urgent: "text-urgent",
    unavailable: "text-unavailable",
    neutral: "text-ink",
  };

  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tabular", toneClass[tone])}>
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </>
  );

  const base = cn("rounded-lg border border-line bg-surface p-4", className);

  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "block transition-colors duration-150 hover:border-line-strong")}
      >
        {body}
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
