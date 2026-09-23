"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/ui/badge";
import {
  updateStockAction,
  updateFoodStatusAction,
  deleteFoodAction,
} from "@/server/actions/food";
import { GRADE_META, FOOD_STATUS_META } from "@/lib/domain";
import { cn, formatRupiah, formatTime, timeRemaining, deadlineUrgency } from "@/lib/utils";
import type { Grade, FoodStatus } from "@prisma/client";

/**
 * Inventory.
 *
 * The two things a restaurant does most often here — adjusting stock and
 * withdrawing a listing — are inline on the row, without a form or a page
 * change. Editing the listing itself is a link, because it is the rarer job.
 */

export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  grade: Grade;
  qualityScore: number;
  status: FoodStatus;
  pickupDeadline: Date;
  expirationTime: Date;
  _count: { orderItems: number };
};

export function InventoryList({ rows }: { rows: InventoryRow[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {rows.map((row) => (
        <InventoryItem key={row.id} row={row} />
      ))}
    </ul>
  );
}

function InventoryItem({ row }: { row: InventoryRow }) {
  const router = useRouter();
  const [stockState, stockAction, stockPending] = useActionState(updateStockAction, undefined);
  const [statusState, statusAction, statusPending] = useActionState(
    updateFoodStatusAction,
    undefined,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(deleteFoodAction, undefined);
  const [editingStock, setEditingStock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const grade = GRADE_META[row.grade];
  const urgency = deadlineUrgency(row.pickupDeadline);
  const remaining = timeRemaining(row.pickupDeadline);
  const busy = stockPending || statusPending || deletePending || pending;

  /** Nudge stock by a delta without opening the editor. */
  function adjust(delta: number) {
    const next = Math.max(0, Math.min(999, row.stock + delta));
    const formData = new FormData();
    formData.set("foodItemId", row.id);
    formData.set("stock", String(next));

    startTransition(async () => {
      await stockAction(formData);
      router.refresh();
    });
  }

  const feedback =
    (stockState && !stockState.ok ? stockState.message : null) ??
    (statusState && !statusState.ok ? statusState.message : null) ??
    (deleteState && !deleteState.ok ? deleteState.message : null);

  return (
    <li className="p-3.5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {/* Identity */}
        <div className="min-w-[12rem] flex-1">
          <Link
            href={`/restaurant/food/${row.id}`}
            className="text-sm font-medium text-ink hover:text-brand-ink"
          >
            {row.name}
          </Link>
          <p className="mt-0.5 text-xs text-ink-muted">
            {row.category} · {row._count.orderItems} ordered
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <GradeBadge grade={row.grade} label={grade.label} summary={grade.summary} size="sm" />
            <span className="text-xs text-ink-muted tabular">Quality {row.qualityScore}%</span>
          </div>
        </div>

        {/* Price */}
        <div className="w-24 shrink-0">
          <p className="text-xs text-ink-muted">Price</p>
          <p className="mt-0.5 text-sm font-medium text-ink tabular">
            {formatRupiah(row.discountPrice)}
          </p>
          <p className="text-xs text-ink-muted line-through tabular">
            {formatRupiah(row.originalPrice)}
          </p>
        </div>

        {/* Stock */}
        <div className="w-36 shrink-0">
          <p className="text-xs text-ink-muted">Stock</p>

          {editingStock ? (
            <form action={stockAction} className="mt-1 flex items-center gap-1.5">
              <input type="hidden" name="foodItemId" value={row.id} />
              <input
                name="stock"
                type="number"
                min={0}
                max={999}
                defaultValue={row.stock}
                aria-label={`Stock for ${row.name}`}
                className="h-8 w-16 rounded-md border border-line-strong px-2 text-sm tabular focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
              <Button type="submit" size="sm" loading={stockPending}>
                Save
              </Button>
              <button
                type="button"
                onClick={() => setEditingStock(false)}
                aria-label="Cancel"
                className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjust(-1)}
                disabled={busy || row.stock <= 0}
                aria-label={`Decrease stock of ${row.name}`}
                className="inline-flex size-8 items-center justify-center rounded-md border border-line-strong text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setEditingStock(true)}
                className={cn(
                  "min-w-10 rounded-md px-2 py-1 text-sm font-medium tabular transition-colors duration-150 hover:bg-surface-sunken",
                  row.stock === 0
                    ? "text-unavailable"
                    : row.stock <= 3
                      ? "text-soon"
                      : "text-ink",
                )}
              >
                {row.stock}
              </button>

              <button
                type="button"
                onClick={() => adjust(1)}
                disabled={busy || row.stock >= 999}
                aria-label={`Increase stock of ${row.name}`}
                className="inline-flex size-8 items-center justify-center rounded-md border border-line-strong text-ink-soft transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Deadline */}
        <div className="w-28 shrink-0">
          <p className="text-xs text-ink-muted">Pickup by</p>
          <p
            className={cn(
              "mt-0.5 text-sm",
              urgency === "urgent"
                ? "font-medium text-urgent"
                : urgency === "soon"
                  ? "font-medium text-soon"
                  : "text-ink",
            )}
          >
            {formatTime(row.pickupDeadline)}
          </p>
          {remaining && <p className="text-xs text-ink-muted">{remaining}</p>}
        </div>

        {/* Status + actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-xs px-2 py-0.5 text-xs font-medium",
              row.status === "AVAILABLE"
                ? "bg-available-soft text-available"
                : "bg-unavailable-soft text-unavailable",
            )}
          >
            {FOOD_STATUS_META[row.status].label}
          </span>

          <form action={statusAction}>
            <input type="hidden" name="foodItemId" value={row.id} />
            <input
              type="hidden"
              name="status"
              value={row.status === "UNAVAILABLE" ? "AVAILABLE" : "UNAVAILABLE"}
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={busy}
              title={
                row.status === "UNAVAILABLE"
                  ? "Make this listing visible to customers again"
                  : "Hide this listing from customers without deleting it"
              }
            >
              {row.status === "UNAVAILABLE" ? "Make available" : "Mark unavailable"}
            </Button>
          </form>

          <Link
            href={`/restaurant/food/${row.id}`}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            Edit
          </Link>

          {confirmDelete ? (
            <form action={deleteAction} className="flex items-center gap-1.5">
              <input type="hidden" name="foodItemId" value={row.id} />
              <Button type="submit" variant="danger" size="sm" loading={deletePending}>
                Confirm
              </Button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-urgent"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <p
          role="alert"
          className="mt-2.5 flex items-start gap-2 rounded-md bg-urgent-soft px-3 py-2 text-xs text-urgent"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {feedback}
        </p>
      )}

      {row._count.orderItems > 0 && confirmDelete && (
        <p className="mt-2 text-xs text-ink-muted">
          This listing has past orders, so it will be marked unavailable instead of
          deleted — order history stays intact.
        </p>
      )}
    </li>
  );
}
