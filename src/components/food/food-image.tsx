"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A food photograph that degrades gracefully.
 *
 * Restaurant listings carry a photo when the restaurant has supplied one. When
 * there is no photo — or the remote image fails to load — we render a quiet
 * tinted panel with the category name rather than a broken-image icon or a
 * generic illustration.
 *
 * The placeholder tone is derived from the category, so a grid of listings
 * reads as varied without any of it being decorative noise: the same category
 * always gets the same tone, which makes browsing slightly easier to scan.
 *
 * ## The fade-in, and why it is ordered the way it is
 *
 * Photos fade in once decoded instead of popping in over a grey box. Same
 * fail-visible discipline as the scroll reveals: the `loading` state is the
 * server-rendered default, but it only hides anything under `.js` (set before
 * first paint by the root layout). With JavaScript off, the photo is simply
 * visible. The class is then cleared by `onLoad`.
 */

const CATEGORY_TONE: Record<string, string> = {
  "Rice & Bowls": "#f0ece2",
  "Noodles & Pasta": "#f2ece4",
  "Bakery & Pastry": "#f4eee2",
  "Sandwiches & Wraps": "#eef0e8",
  Chicken: "#f3ece4",
  Salads: "#eaf1ea",
  Snacks: "#f4f0e6",
  Desserts: "#f3eaee",
  Beverages: "#e9eef0",
};

export function FoodImage({
  src,
  alt,
  category,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  className,
  imageClassName,
}: {
  src: string | null | undefined;
  alt: string;
  category: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [state, setState] = useState<"loading" | "loaded">("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached image is already complete by the time this runs, and its `load`
  // event may have fired before React attached the handler — so without this
  // it would stay permanently hidden. That is the one way a photo could fail to
  // appear, hence the explicit check.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setState("loaded");
  }, [src]);

  const showPlaceholder = !src || failed;

  if (showPlaceholder) {
    return (
      <div
        className={cn("relative flex items-center justify-center overflow-hidden", className)}
        style={{ backgroundColor: CATEGORY_TONE[category] ?? "#f1efe9" }}
        role="img"
        aria-label={`${alt} — no photo provided`}
      >
        <div className="flex flex-col items-center gap-1.5 px-4 text-center">
          <ImageIcon aria-hidden="true" className="size-5 text-ink-muted/60" />
          <span className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
            {category}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-surface-sunken", className)}>
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        data-image-state={state}
        onLoad={() => setState("loaded")}
        onError={() => setFailed(true)}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}
