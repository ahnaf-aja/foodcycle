import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/shell";
import { CheckoutForm, type CheckoutInstitution } from "@/components/checkout/checkout-form";
import { requireCustomer } from "@/server/auth-guards";
import { getCart } from "@/server/cart";
import { getDonationInstitutions } from "@/server/impact";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Checkout" };

export const dynamic = "force-dynamic";

/**
 * Checkout.
 *
 * An empty cart has nothing to check out, so it goes back to the cart rather
 * than showing a form that cannot be submitted. If any line has gone stale, the
 * cart is where that is explained, so send them there too.
 */
export default async function CheckoutPage() {
  const user = await requireCustomer();
  const cart = await getCart(user.id);

  if (cart.items.length === 0) redirect("/cart");

  // Institutions are matched to the customer's city where we know it — the
  // city of the first restaurant they are ordering from is a reasonable proxy.
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: cart.groups[0]?.restaurant.id },
    select: { city: true },
  });

  const institutions = await getDonationInstitutions(restaurant?.city);

  // Only institutions that are verified are offered as donation targets.
  const options: CheckoutInstitution[] = institutions.map((institution) => ({
    id: institution.id,
    name: institution.name,
    type: institution.type,
    city: institution.city,
    description: institution.description,
    supportedCount: institution.supportedCount,
    needs: institution.needs,
    _count: institution._count,
  }));

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-ink">Checkout</h1>

      <CheckoutForm
        institutions={options}
        customerCity={restaurant?.city}
        subtotal={cart.subtotal}
        savings={cart.savings}
        total={cart.total}
        itemCount={cart.itemCount}
      />
    </Container>
  );
}
