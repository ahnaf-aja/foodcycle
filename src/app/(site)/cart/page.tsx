import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShoppingBag } from "lucide-react";

import { Container } from "@/components/layout/shell";
import { CartItems } from "@/components/cart/cart-items";
import { EmptyState } from "@/components/ui/empty-state";
import { requireCustomer } from "@/server/auth-guards";
import { getCart } from "@/server/cart";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Cart" };

export const dynamic = "force-dynamic";

/**
 * The cart.
 *
 * Deliberately spare: the lines, a three-line summary, and one button. Prices
 * are read fresh from the database on every load, so a listing that sold out or
 * was repriced while the cart sat idle is reflected before the customer gets to
 * checkout.
 */
export default async function CartPage() {
  const user = await requireCustomer();
  const cart = await getCart(user.id);

  if (cart.items.length === 0) {
    return (
      <Container className="py-10" size="default">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Your cart</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Explore surplus food near you and help reduce food waste."
          action={{ href: "/foods", label: "Explore food" }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Your cart
        <span className="ml-2 text-base font-normal text-ink-muted tabular">
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
        </span>
      </h1>

      {/*
        Anything that became unbuyable since it was added is explained up front,
        rather than quietly disappearing and changing the total.
      */}
      {cart.problems.length > 0 && (
        <div className="mt-5 rounded-lg border border-soon/30 bg-soon-soft p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-soon">
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
            Some items are no longer available
          </p>
          <ul className="mt-2 space-y-1 text-sm text-soon">
            {cart.problems.map((problem) => (
              <li key={problem.cartItemId}>
                {problem.name} — {problem.reason.toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-soon">
            They have been left out of your total below.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="min-w-0">
          <CartItems cart={cart} />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink tabular">{formatRupiah(cart.subtotal)}</dd>
              </div>

              {cart.savings > 0 && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-soft">You save</dt>
                  <dd className="font-medium text-available tabular">
                    −{formatRupiah(cart.savings)}
                  </dd>
                </div>
              )}

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="text-lg font-semibold text-ink tabular">
                  {formatRupiah(cart.total)}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand text-base font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              Checkout
            </Link>

            <p className="mt-3 text-center text-xs text-ink-muted">
              You will choose pickup or delivery, and whether to keep it or donate
              it, on the next step.
            </p>

            <Link
              href="/foods"
              className="mt-3 block text-center text-xs font-medium text-brand-ink hover:underline"
            >
              Add more food
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
