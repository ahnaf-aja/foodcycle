import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FoodForm } from "@/components/restaurant/food-form";
import { requireRestaurant } from "@/server/auth-guards";

export const metadata: Metadata = { title: "New listing" };

/**
 * Create a listing.
 *
 * A single column at a readable width — this is a form someone fills in while
 * standing in a kitchen, so it stays narrow and the fields stay large.
 */
export default async function NewFoodPage() {
  await requireRestaurant();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/restaurant/food"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to food
      </Link>

      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        List surplus food
      </h1>
      <p className="mt-1 mb-8 text-sm text-ink-muted">
        Describe what you have left, set a fair price, and choose a pickup window.
        It goes live in the marketplace immediately.
      </p>

      <FoodForm />
    </div>
  );
}
