import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty states.
 *
 * One quiet icon, one plain sentence explaining the situation, one optional
 * line of guidance, and exactly one action. No illustration, no oversized
 * mascot — an empty cart is not an occasion.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-6 text-ink-muted" />

      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      )}

      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
