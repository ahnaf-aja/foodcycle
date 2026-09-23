"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * The route-level error boundary.
 *
 * Shows a plain explanation and a way to retry, and logs the underlying error
 * to the console for whoever is debugging. It deliberately does not surface the
 * error message itself to the customer — those are written for developers and
 * tend to be alarming and unhelpful.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle aria-hidden="true" className="size-6 text-ink-muted" />

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
        Something went wrong
      </h1>

      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        This page could not be loaded. Trying again often works — if it does not,
        the problem is on our side.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink-muted">Reference: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
