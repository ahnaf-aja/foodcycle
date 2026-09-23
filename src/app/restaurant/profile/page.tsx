import type { Metadata } from "next";

import { RestaurantProfileForm } from "@/components/restaurant/profile-form";
import { requireRestaurant } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Restaurant profile" };

export const dynamic = "force-dynamic";

/** The details customers see on the restaurant page and on every listing. */
export default async function RestaurantProfilePage() {
  const { restaurant } = await requireRestaurant();

  const full = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurant.id },
    select: {
      name: true,
      description: true,
      cuisine: true,
      address: true,
      city: true,
      phone: true,
      isOpen: true,
      slug: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Restaurant profile
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          This is what customers see when they look at your listings and your
          restaurant page.
        </p>
      </div>

      <RestaurantProfileForm
        initial={{
          name: full.name,
          description: full.description ?? "",
          cuisine: full.cuisine ?? "",
          address: full.address,
          city: full.city,
          phone: full.phone ?? "",
          isOpen: full.isOpen,
        }}
        publicUrl={`/restaurants/${full.slug}`}
      />
    </div>
  );
}
