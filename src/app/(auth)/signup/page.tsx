import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/server/auth-guards";
import { ROLE_HOME } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

type Role = "CUSTOMER" | "RESTAURANT" | "SOCIAL_INSTITUTION";

export default async function SignUpPage(props: PageProps<"/signup">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  // The footer links carry ?role=… so a restaurant arriving from "List your
  // restaurant" lands on the right form rather than switching manually.
  const params = await props.searchParams;
  const raw = typeof params.role === "string" ? params.role : undefined;
  const initialRole: Role =
    raw === "RESTAURANT" || raw === "SOCIAL_INSTITUTION" ? raw : "CUSTOMER";

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-lg">
        <Logo />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">
          Create your FoodCycle account
        </h1>
        <p className="mt-1.5 mb-8 text-sm text-ink-muted">
          Whether you are here to eat well for less, sell what you have left, or
          receive food for the people you look after.
        </p>

        <SignUpForm initialRole={initialRole} />
      </div>
    </div>
  );
}
