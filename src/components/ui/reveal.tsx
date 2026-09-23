"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Reveal — fade and rise a block into view as it is scrolled to.
 *
 * ## Why it is built this way
 *
 * **The hidden state is server-rendered, but only applied when JavaScript is
 * running.** The element renders with `data-reveal="pending"`, and `globals.css`
 * only treats that as "hidden" underneath `html.js` — a class a tiny inline
 * script in the root layout sets before the first paint. So:
 *
 *   - With JavaScript on, the element is hidden from the very first frame (no
 *     flash of content appearing and then vanishing) and animates in when it is
 *     scrolled to.
 *   - With JavaScript off or failed, `html.js` is never set, the CSS rule never
 *     matches, and the content is plainly visible. The animation can never be
 *     the reason a page looks empty.
 *
 * The alternative — starting visible and hiding it from an effect — is what
 * produces a visible flicker, because effects run after the browser has already
 * painted. This ordering avoids that entirely.
 *
 * **`IntersectionObserver`, not a scroll listener.** One observer per element,
 * disconnected the moment it fires, so nothing is recomputed while scrolling
 * and the main thread stays free. A handler that runs on every frame is what
 * makes this kind of effect feel janky.
 *
 * **Already-visible blocks animate immediately** rather than waiting for a
 * scroll that may never come, so the page still has an entrance.
 *
 * **Stagger is clamped** so a long grid can never leave the last card waiting.
 */

const HIDDEN = "pending";
const SHOWN = "shown";

export function Reveal({
  children,
  as: Tag = "div",
  className,
  /** Milliseconds to hold before animating. Used to stagger a grid. */
  delay = 0,
  /** How far the block travels, in pixels. */
  shift = 12,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  shift?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  // Must match the server's output exactly, or hydration mismatches.
  const [state, setState] = useState<typeof HIDDEN | typeof SHOWN>(HIDDEN);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reduced motion: show it and skip the observer work entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState(SHOWN);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setState(SHOWN);
      return;
    }

    // On screen already: animate now instead of waiting for a scroll.
    const rect = element.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    if (inView) {
      setState(SHOWN);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setState(SHOWN);
          observer.disconnect(); // reveal once; never re-hide on scroll up
        }
      },
      {
        // Fire just before the element reaches the fold, so it has settled by
        // the time the reader's eye arrives.
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.01,
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={state}
      data-reveal-delay={delay > 0 ? "" : undefined}
      style={
        {
          "--reveal-shift": `${shift}px`,
          ...(delay > 0 ? { "--reveal-delay": `${Math.min(delay, 400)}ms` } : {}),
        } as React.CSSProperties
      }
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
