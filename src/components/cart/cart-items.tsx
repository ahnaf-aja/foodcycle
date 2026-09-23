"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { FoodImage } from "@/components/food/food-image";
import { GradeBadge } from "@/components/ui/badge";
import { setCartQuantityAction, removeCartItemAction } from "@/server/actions/cart";
import { GRADE_META } from "@/lib/domain";
import { cn, formatRupiah, formatTime, discountPercent } from "@/lib/utils";
import type { CartView } from "@/server/cart";

/**
 * The cart lines.
 *
 * Quantity changes are optimistic: the number moves the instant it is tapped
 * and the server confirms afterwards. Anything the server rejects — usually
 * because the stock ran out — surfaces as a message rather than a silent
 * revert, so the customer is told why the number went back.
 */
export function CartItems({ cart }: { cart: CartView }) {
  return (
    <div className="divide-y divide-line">
      {cart.groups.map((group) => (
        <section key={group.restaurant.id} className="py-6 first:pt-0">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <Link
              href={`/restaurants/${group.restaurant.slug}`}
              className="text-sm font-semibold text-ink hover:text-brand-ink"
            >
              {group.restaurant.name}
            </Link>
            <span className="text-xs text-ink-muted">{group.restaurant.city}</span>
          </div>

          <ul className="space-y-5">
            {group.items.map((item) => (
              <CartLine key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CartLine({ item }: { item: CartView["items"][number] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const food = item.foodItem;
  const grade = GRADE_META[food.grade];
  const discount = discountPercent(food.originalPrice, food.discountPrice);

  // Never offer more than the restaurant still has.
  const max = Math.min(food.stock, 50);
  const atMax = item.quantity >= max;

  function setQuantity(quantity: number) {
    startTransition(async () => {
      const result = await setCartQuantityAction({ cartItemId: item.id, quantity });
      if (!result.ok) {
        // Surface the reason, then re-render from the database.
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(item.id);
      router.refresh();
    });
  }

  return (
    <li className={cn("flex gap-4 transition-opacity duration-150", pending && "opacity-60")}>
      <Link href={`/foods/${food.id}`} className="shrink-0">
        <FoodImage
          src={food.image}
          alt={food.name}
          category={food.category}
          sizes="96px"
          className="size-24 rounded-md"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/foods/${food.id}`}
              className="line-clamp-2 text-sm font-medium text-ink hover:text-brand-ink"
            >
              {food.name}
            </Link>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <GradeBadge
                grade={food.grade}
                label={grade.label}
                summary={grade.summary}
                size="sm"
              />
              <span className="text-xs text-ink-muted">
                Pickup before {formatTime(food.pickupDeadline)}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-ink tabular">
              {formatRupiah(food.discountPrice * item.quantity)}
            </p>
            {discount > 0 && (
              <p className="text-xs text-ink-muted line-through tabular">
                {formatRupiah(food.originalPrice * item.quantity)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex items-center rounded-md border border-line-strong bg-surface">
            <button
              type="button"
              onClick={() => setQuantity(item.quantity - 1)}
              disabled={pending}
              aria-label={`Decrease quantity of ${food.name}`}
              className="inline-flex size-9 items-center justify-center rounded-l-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </button>

            <span
              aria-live="polite"
              aria-label={`Quantity: ${item.quantity}`}
              className="w-9 text-center text-sm font-medium text-ink tabular"
            >
              {item.quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(item.quantity + 1)}
              disabled={pending || atMax}
              aria-label={`Increase quantity of ${food.name}`}
              className="inline-flex size-9 items-center justify-center rounded-r-md text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {atMax && food.stock <= 3 && (
              <span className="text-xs font-medium text-soon">Only {food.stock} left</span>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-ink-muted transition-colors duration-150 hover:text-urgent disabled:opacity-40"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
