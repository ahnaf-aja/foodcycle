import type { ImpactSummary } from "@/server/impact";
import { cn } from "@/lib/utils";

/**
 * Impact figures.
 *
 * Three plain numbers on a hairline rule — no gauges, no animated counters, no
 * donut charts. The only visualisation in the app is the trend line on the
 * impact page, and it exists because a direction of travel is genuinely
 * informative where a static total is not.
 */
export function ImpactStats({
  impact,
  variant = "default",
  className,
}: {
  impact: Pick<ImpactSummary, "mealsSaved" | "mealsDonated" | "weightKg">;
  variant?: "default" | "compact";
  className?: string;
}) {
  const stats = [
    { label: "Meals saved", value: impact.mealsSaved.toLocaleString("id-ID"), unit: "meals" },
    { label: "Meals donated", value: impact.mealsDonated.toLocaleString("id-ID"), unit: "meals" },
    {
      label: "Food waste prevented",
      value: impact.weightKg.toFixed(1),
      unit: "kg",
    },
  ];

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap gap-x-8 gap-y-3", className)}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <span className="text-lg font-semibold text-ink tabular">{stat.value}</span>
            <span className="ml-1 text-xs text-ink-muted">{stat.unit}</span>
            <p className="text-xs text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6 sm:grid-cols-3", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="border-t border-line pt-4">
          <p className="text-2xl font-semibold text-ink tabular sm:text-3xl">
            {stat.value}
            <span className="ml-1.5 text-sm font-normal text-ink-muted">{stat.unit}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * A single-line sparkline of daily meals, as a responsive SVG.
 *
 * Drawn as a plain path rather than a charting library: it is one series and
 * one shape, and a dependency would be more code than the 20 lines here.
 * The line is decorative-but-informative, so the exact figures are available in
 * the accessible summary beneath it.
 */
export function TrendLine({
  data,
  className,
}: {
  data: { date: string; mealsSaved: number; mealsDonated: number }[];
  className?: string;
}) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.mealsSaved + d.mealsDonated);
  const max = Math.max(1, ...values);
  const width = 100;
  const height = 28;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - (value / max) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const total = values.reduce((a, b) => a + b, 0);
  const first = data[0].date;
  const last = data[data.length - 1].date;

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-10 w-full"
        aria-hidden="true"
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-1 text-xs text-ink-muted">
        {total.toLocaleString("id-ID")} meals over {data.length} days
        <span className="sr-only">
          , from {first} to {last}
        </span>
      </figcaption>
    </figure>
  );
}
