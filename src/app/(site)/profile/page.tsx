import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/server/auth-guards";
import { getPersonalImpact } from "@/server/impact";
import { ROLE_HOME } from "@/lib/auth";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Profile" };

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  RESTAURANT: "Restaurant",
  SOCIAL_INSTITUTION: "Social institution",
  ADMIN: "Administrator",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const impact = await getPersonalImpact(user.id);

  return (
    <Container className="py-8 sm:py-10" size="narrow">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Profile</h1>
      <p className="mt-1.5 mb-8 text-sm text-ink-muted">
        Your account details and what you have done on FoodCycle.
      </p>

      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line bg-surface p-4">
        <div>
          <p className="text-xs text-ink-muted">Account type</p>
          <p className="mt-0.5 text-sm font-medium text-ink">{ROLE_LABEL[user.role]}</p>
        </div>

        <div>
          <p className="text-xs text-ink-muted">Go to</p>
          <Link
            href={ROLE_HOME[user.role]}
            className="mt-0.5 block text-sm font-medium text-brand-ink hover:underline"
          >
            {user.role === "CUSTOMER" ? "My FoodCycle" : "Your dashboard"}
          </Link>
        </div>

        {user.role === "CUSTOMER" && (
          <>
            <div>
              <p className="text-xs text-ink-muted">Meals saved</p>
              <p className="mt-0.5 text-sm font-medium text-ink tabular">
                {impact.mealsSaved}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Meals donated</p>
              <p className="mt-0.5 text-sm font-medium text-ink tabular">
                {impact.mealsDonated}
              </p>
            </div>
          </>
        )}
      </div>

      <ProfileForm
        initial={{ name: user.name ?? "", email: user.email, phone: user.phone ?? "" }}
      />

      <div className="mt-10 border-t border-line pt-6">
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
          >
            Sign out
          </button>
        </form>
      </div>
    </Container>
  );
}
