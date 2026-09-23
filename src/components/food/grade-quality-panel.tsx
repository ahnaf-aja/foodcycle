import { GradeBadge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { GRADE_META, GRADE_DISCLAIMER, QUALITY_EXPLANATION, qualityLabel } from "@/lib/domain";
import type { Grade } from "@prisma/client";

/**
 * Grade and Quality, explained.
 *
 * Shown on the food detail page, where a customer has stopped to read. Both
 * values are always presented as words plus a number — never as a coloured
 * shape the viewer has to decode — and each carries an explainer that states
 * plainly what it is not: a food-safety certification.
 */
export function GradeQualityPanel({
  grade,
  qualityScore,
}: {
  grade: Grade;
  qualityScore: number;
}) {
  const meta = GRADE_META[grade];

  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-ink">Grade</h3>
            <InfoTip label="About FoodCycle Grade" align="start">
              <span className="block font-medium text-ink">{meta.label} — {meta.summary}</span>
              <span className="mt-1 block">{meta.description}</span>
              <span className="mt-2 block border-t border-line pt-2 text-ink-muted">
                {GRADE_DISCLAIMER}
              </span>
            </InfoTip>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{meta.summary}</p>
        </div>

        <GradeBadge grade={grade} label={meta.label} summary={meta.summary} />
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-ink">Quality</h3>
              <InfoTip label="About Quality Score" align="start">
                {QUALITY_EXPLANATION}
              </InfoTip>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{qualityLabel(qualityScore)}</p>
          </div>
          <span className="text-sm font-semibold text-ink tabular">{qualityScore}%</span>
        </div>

        {/*
          A plain bar rather than a circular gauge: it reads at a glance and
          does not need a legend to be understood.
        */}
        <div
          role="meter"
          aria-valuenow={qualityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quality score ${qualityScore} out of 100 — ${qualityLabel(qualityScore)}`}
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${Math.max(0, Math.min(100, qualityScore))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
