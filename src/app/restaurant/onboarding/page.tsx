import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { requireRole } from "@/server/auth-guards";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Finish setting up" };

/** The restaurant counterpart to the institution onboarding fallback. */
export default async function RestaurantOnboardingPage() {
  await requireRole("RESTAURANT");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Logo />

        <h1 className="mt-8 text-xl font-semibold tracking-tight text-ink">
          Your restaurant is not set up yet
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          This account does not have a restaurant linked to it. If you signed up
          as a restaurant and expected one, please sign out and register again.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
