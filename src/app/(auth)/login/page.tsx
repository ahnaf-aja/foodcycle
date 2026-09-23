import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm, DemoAccounts } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/server/auth-guards";
import { ROLE_HOME } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in.
 *
 * A narrow single column, the form, and the demo accounts alongside on desktop.
 * Someone already signed in is sent straight to their dashboard rather than
 * being shown a login form they do not need.
 */
export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  const params = await props.searchParams;
  const rawNext = typeof params.next === "string" ? params.next : undefined;
  // Only ever redirect within this site — an absolute URL here would turn the
  // login page into an open redirect.
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo />

          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 mb-7 text-sm text-ink-muted">
            Sign in to order, donate, or manage your restaurant.
          </p>

          <LoginForm next={next} />
        </div>
      </div>

      <div className="hidden flex-col justify-center border-l border-line bg-surface px-10 lg:flex">
        <div className="mx-auto w-full max-w-sm">
          <DemoAccounts />
        </div>
      </div>
    </div>
  );
}
