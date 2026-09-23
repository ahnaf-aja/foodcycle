import { FoodGridSkeleton } from "@/components/food/food-grid";

/**
 * The global loading fallback.
 *
 * Shaped like the marketplace grid, because that is what most navigations
 * within this app are heading towards, so the transition does not jump when the
 * real content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="skeleton h-8 w-56 rounded-xs" />
      <div className="skeleton mt-3 h-4 w-72 rounded-xs" />
      <div className="skeleton mt-6 h-11 w-full max-w-xl rounded-md" />
      <div className="mt-8">
        <FoodGridSkeleton count={8} />
      </div>
    </div>
  );
}
