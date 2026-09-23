import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Buttons.
 *
 * Three variants only, and one accent colour: `primary` is the single most
 * important action on a screen, `secondary` is a real alternative, `ghost` is
 * everything else. If a screen needs a fourth kind of button, the screen is
 * probably doing too much.
 *
 * The `loading` flag swaps in a spinner and disables the control without
 * changing its width, so nothing shifts under the user's finger mid-click.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong active:bg-brand-strong disabled:bg-brand/50",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-sunken hover:border-ink-muted",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink",
  danger: "bg-urgent text-white hover:brightness-95 active:brightness-90",
};

const SIZE: Record<Size, string> = {
  // 40px minimum height everywhere — a comfortable touch target.
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-colors duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-70",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
