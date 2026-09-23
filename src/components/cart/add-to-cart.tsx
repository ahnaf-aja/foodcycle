"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/server/actions/cart";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * The quantity selector and add-to-cart control on a food detail page.
 *
 * Feedback is inline and immediate: the button becomes "Added" for a moment
 * and a link to the cart appears, so the customer knows it worked without
 * being navigated away from what they were reading.
 */
export function AddToCart({
  foodItemId,
  stock,
  price,
  isSignedIn,
  isCustomer,
  soldOut,
}: {
  foodItemId: string;
  stock: number;
  price: number;
  isSignedIn: boolean;
  isCustomer: boolean;
  soldOut: boolean;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok"; message: string } | { kind: "error"; message: string } | null
  >(null);
  const [added, setAdded] = useState(false);

  // Never let the selector offer more than the restaurant has.
  const max = Math.max(1, Math.min(stock, 20));

  function add(goToCheckout: boolean) {
    setFeedback(null);

    startTransition(async () => {
      const result = await addToCartAction({ foodItemId, quantity });

      if (!result.ok) {
        setFeedback({ kind: "error", message: result.message });
        return;
      }

      setAdded(true);
      setFeedback({
        kind: "ok",
        message: `${quantity} × added to your cart`,
      });

      if (goToCheckout) {
        router.push("/checkout");
        return;
      }

      router.refresh();
      window.setTimeout(() => setAdded(false), 2500);
    });
  }

  if (soldOut) {
    return (
      <div className="rounded-lg border border-line bg-surface-sunken px-4 py-3.5">
        <p className="text-sm font-medium text-ink">Sold out</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Every portion has been claimed. Have a look at similar food below.
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-3">
        <Link
          href={`/login?next=/foods/${foodItemId}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-base font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          Sign in to order
        </Link>
        <p className="text-center text-xs text-ink-muted">
          It takes a moment, and your cart is saved to your account.
        </p>
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="rounded-lg border border-line bg-surface-sunken px-4 py-3.5">
        <p className="text-sm text-ink-soft">
          You are signed in as a restaurant or institution account. Switch to a
          customer account to order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-line-strong bg-surface">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || pending}
            aria-label="Decrease quantity"
            className="inline-flex size-11 items-center justify-center rounded-l-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>

          <span
            aria-live="polite"
            className="w-10 text-center text-sm font-medium text-ink tabular"
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max || pending}
            aria-label="Increase quantity"
            className="inline-flex size-11 items-center justify-center rounded-r-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">
            {stock <= 3 ? (
              <span className="font-medium text-soon">Only {stock} left</span>
            ) : (
              <>{stock} available</>
            )}
          </p>
          <p className="text-sm font-medium text-ink tabular">
            {formatRupiah(price * quantity)} total
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => add(false)}
          loading={pending}
          size="lg"
          className="flex-1"
        >
          {added && !pending ? (
            <>
              <Check aria-hidden="true" className="size-4" />
              Added
            </>
          ) : (
            "Add to cart"
          )}
        </Button>

        <Button
          onClick={() => add(true)}
          variant="secondary"
          size="lg"
          disabled={pending}
          className="flex-1"
        >
          Buy now
        </Button>
      </div>

      {/*
        Status messages are announced politely rather than assertively — an
        "added to cart" confirmation should not interrupt a screen reader
        mid-sentence.
      */}
      <div aria-live="polite" className="min-h-0">
        {feedback && (
          <p
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              feedback.kind === "ok"
                ? "bg-available-soft text-available"
                : "bg-urgent-soft text-urgent",
            )}
          >
            {feedback.message}
            {feedback.kind === "ok" && (
              <>
                {" "}
                <Link href="/cart" className="font-medium underline">
                  View cart
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
