"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Marketplace search.
 *
 * Recent searches are kept in the browser's own storage, not the database —
 * they are a convenience for this person on this device, not something worth
 * persisting server-side or syncing across accounts.
 *
 * Writes to localStorage are wrapped in try/catch: a private window or blocked
 * site data throws on access, and search must keep working regardless.
 */

const STORAGE_KEY = "foodcycle.recentSearches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(term: string) {
  if (!term.trim()) return;
  try {
    const existing = readRecent().filter(
      (value) => value.toLowerCase() !== term.toLowerCase(),
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([term, ...existing].slice(0, MAX_RECENT)),
    );
  } catch {
    // Storage unavailable — recent searches are simply not remembered.
  }
}

function clearRecent() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

export function SearchBar({
  className,
  autoFocus = false,
  placeholder = "Search food or restaurant",
}: {
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Load history after mount; reading storage during render would break SSR.
  useEffect(() => {
    if (autoFocus) setRecent(readRecent());
  }, [autoFocus]);

  useEffect(() => {
    if (!showRecent) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setShowRecent(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showRecent]);

  /** Navigate with the new query, preserving every other filter. */
  function submit(term: string) {
    const trimmed = term.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
      writeRecent(trimmed);
    } else {
      params.delete("q");
    }

    setShowRecent(false);
    startTransition(() => {
      router.push(`/foods?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div ref={wrapper} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor="food-search" className="sr-only">
          Search food or restaurant
        </label>

        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        />

        <input
          id="food-search"
          type="search"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => {
            setRecent(readRecent());
            setShowRecent(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowRecent(false);
          }}
          className={cn(
            "h-11 w-full rounded-md border border-line-strong bg-surface pr-9 pl-9 text-sm text-ink",
            "placeholder:text-ink-muted",
            "transition-colors duration-150 hover:border-ink-muted",
            "focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              submit("");
            }}
            className="absolute top-1/2 right-2.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </form>

      {showRecent && !value && recent.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg shadow-ink/5">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-ink-muted">Recent searches</span>
            <button
              type="button"
              onClick={() => {
                clearRecent();
                setRecent([]);
                setShowRecent(false);
              }}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Clear
            </button>
          </div>
          <ul className="pb-1">
            {recent.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(term);
                    submit(term);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
                >
                  <Search aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
                  <span className="truncate">{term}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending && (
        <span className="sr-only" role="status">
          Updating results
        </span>
      )}
    </div>
  );
}
