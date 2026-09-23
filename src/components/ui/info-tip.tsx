"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small information affordance for explaining Grade and Quality Score.
 *
 * Reachable three ways, because a hover-only tooltip is unusable on touch and
 * invisible to keyboards: clicking/tapping toggles it, hovering shows it for
 * mouse users, and focusing the button opens it for keyboard users. Escape and
 * an outside click both dismiss it.
 */
export function InfoTip({
  label,
  children,
  className,
  align = "start",
}: {
  /** Accessible name, e.g. "About FoodCycle Grade". */
  label: string;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapper} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!wrapper.current?.contains(event.relatedTarget as Node)) setOpen(false);
        }}
        className="inline-flex size-4 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:text-ink-soft"
      >
        <Info aria-hidden="true" className="size-3.5" />
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-64 rounded-md border border-line bg-surface p-3",
            "text-xs leading-relaxed font-normal text-ink-soft shadow-lg shadow-ink/5",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
