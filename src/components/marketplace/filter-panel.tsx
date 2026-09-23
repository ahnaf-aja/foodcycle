"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Check } from "lucide-react";

import { GRADE_META } from "@/lib/domain";
import { cn, formatRupiah } from "@/lib/utils";
import { countActiveFilters } from "@/lib/filters";

/**
 * Marketplace filters.
 *
 * The panel is driven entirely by the URL: every control writes to the query
 * string, and the server re-renders the results. That means a filtered view is
 * shareable, bookmarkable, and survives the back button — none of which is true
 * of filters held in component state.
 *
 * Basic filters (category, grade, price) are always visible. The rest sit
 * behind "All filters", so the common case stays uncluttered.
 */

export type FilterOption = { value: string; label: string };

type Props = {
  categories: FilterOption[];
  restaurants: FilterOption[];
  /** Hide the panel's own heading when it is already inside a titled sheet. */
  showHeading?: boolean;
};

const SORT_LABELS: { value: string; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Lowest price" },
  { value: "discount", label: "Highest discount" },
  { value: "quality", label: "Highest quality" },
  { value: "ending-soon", label: "Ending soon" },
];

const PRICE_BANDS = [
  { value: "0-20000", label: "Under Rp20.000" },
  { value: "20000-35000", label: "Rp20.000 – Rp35.000" },
  { value: "35000-50000", label: "Rp35.000 – Rp50.000" },
  { value: "50000-", label: "Rp50.000 and above" },
];

const DISCOUNT_BANDS = [
  { value: "30", label: "30% or more" },
  { value: "40", label: "40% or more" },
  { value: "50", label: "50% or more" },
];

const QUALITY_BANDS = [
  { value: "90", label: "90% and above" },
  { value: "80", label: "80% and above" },
  { value: "70", label: "70% and above" },
];

const PICKUP_BANDS = [
  { value: "2", label: "Within 2 hours" },
  { value: "4", label: "Within 4 hours" },
  { value: "8", label: "Within 8 hours" },
];

export function FilterPanel({ categories, restaurants, showHeading = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  /** Write one key, or remove it when the value is empty. */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null || value === "") params.delete(key);
      else params.set(key, value);

      // Any filter change invalidates the current scroll position's meaning.
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  /** Toggle a value inside a comma-separated multi-value param. */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = (searchParams.get(key) ?? "").split(",").filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      setParam(key, next.length > 0 ? next.join(",") : null);
    },
    [searchParams, setParam],
  );

  const listHas = (key: string, value: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean).includes(value);

  const activeCount = countActiveFilters(searchParams);

  return (
    <div
      className={cn("space-y-6 transition-opacity duration-150", pending && "opacity-60")}
      aria-busy={pending}
    >
      {showHeading && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Filters</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
              className="text-xs font-medium text-brand-ink hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <FilterGroup label="Sort by">
        <div className="space-y-1">
          {SORT_LABELS.map((option) => {
            const active = (searchParams.get("sort") ?? "recommended") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setParam("sort", option.value === "recommended" ? null : option.value)
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-150",
                  active
                    ? "bg-brand-soft font-medium text-brand-ink"
                    : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                )}
              >
                {option.label}
                {active && <Check aria-hidden="true" className="size-3.5" />}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup label="Category">
        <div className="space-y-1">
          {categories.map((option) => (
            <CheckRow
              key={option.value}
              label={option.label}
              checked={listHas("category", option.value)}
              onChange={() => toggleInList("category", option.value)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Grade">
        <div className="space-y-1">
          {(["GRADE_A", "GRADE_B", "GRADE_C"] as const).map((grade) => (
            <CheckRow
              key={grade}
              label={`${GRADE_META[grade].label} — ${GRADE_META[grade].summary}`}
              checked={listHas("grade", grade)}
              onChange={() => toggleInList("grade", grade)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Price">
        <div className="space-y-1">
          {PRICE_BANDS.map((band) => (
            <RadioRow
              key={band.value}
              label={band.label}
              name="price"
              checked={searchParams.get("price") === band.value}
              onChange={() => {
                const [min, max] = band.value.split("-");
                const params = new URLSearchParams(searchParams.toString());
                params.set("price", band.value);
                if (min) params.set("minPrice", min);
                else params.delete("minPrice");
                if (max) params.set("maxPrice", max);
                else params.delete("maxPrice");
                startTransition(() =>
                  router.push(`${pathname}?${params.toString()}`, { scroll: false }),
                );
              }}
            />
          ))}
        </div>
      </FilterGroup>

      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm font-medium text-brand-ink hover:underline"
        >
          All filters
        </button>
      )}

      {showAll && (
        <>
          <FilterGroup label="Minimum discount">
            <div className="space-y-1">
              {DISCOUNT_BANDS.map((band) => (
                <RadioRow
                  key={band.value}
                  label={band.label}
                  name="discount"
                  checked={searchParams.get("minDiscount") === band.value}
                  onChange={() =>
                    setParam(
                      "minDiscount",
                      searchParams.get("minDiscount") === band.value ? null : band.value,
                    )
                  }
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Minimum quality">
            <div className="space-y-1">
              {QUALITY_BANDS.map((band) => (
                <RadioRow
                  key={band.value}
                  label={band.label}
                  name="quality"
                  checked={searchParams.get("minQuality") === band.value}
                  onChange={() =>
                    setParam(
                      "minQuality",
                      searchParams.get("minQuality") === band.value ? null : band.value,
                    )
                  }
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Pickup window">
            <div className="space-y-1">
              {PICKUP_BANDS.map((band) => (
                <RadioRow
                  key={band.value}
                  label={band.label}
                  name="pickup"
                  checked={searchParams.get("pickup") === band.value}
                  onChange={() =>
                    setParam(
                      "pickup",
                      searchParams.get("pickup") === band.value ? null : band.value,
                    )
                  }
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Restaurant">
            <div className="space-y-1">
              {restaurants.map((option) => (
                <CheckRow
                  key={option.value}
                  label={option.label}
                  checked={listHas("restaurant", option.value)}
                  onChange={() => toggleInList("restaurant", option.value)}
                />
              ))}
            </div>
          </FilterGroup>
        </>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink uppercase">{label}</h3>
      {children}
    </div>
  );
}

/**
 * A checkbox row. The real input is visually hidden but still focusable, so
 * keyboard and screen-reader behaviour is native while the row stays compact.
 */
function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-150",
          checked ? "border-brand bg-brand text-white" : "border-line-strong bg-surface",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30",
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  );
}

function RadioRow({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        onClick={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          checked ? "border-brand" : "border-line-strong",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  );
}

export { SORT_LABELS };
