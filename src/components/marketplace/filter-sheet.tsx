"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { FilterPanel, type FilterOption } from "./filter-panel";

/**
 * The mobile filter sheet.
 *
 * Filters on a phone open in a bottom sheet rather than pushing the results
 * down the page — the same controls, without the results jumping around
 * underneath them while they are being changed.
 *
 * Implemented as a native `<dialog>` opened with `showModal()`, which gives
 * focus trapping, `Escape` to close, inertness of the page behind, and the
 * correct ARIA semantics for free. Re-implementing those by hand is where
 * custom modals usually go wrong.
 */
export function FilterSheet({
  categories,
  restaurants,
  activeCount,
}: {
  categories: FilterOption[];
  restaurants: FilterOption[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white tabular">
            {activeCount}
          </span>
        )}
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        // Clicking the backdrop closes the sheet; clicks inside do not.
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false);
        }}
        className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/40 md:hidden"
      >
        <div className="fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-xl bg-surface pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Filters</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="inline-flex size-9 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <FilterPanel
              categories={categories}
              restaurants={restaurants}
              showHeading={false}
            />
          </div>

          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 w-full rounded-md bg-brand text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              Show results
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
