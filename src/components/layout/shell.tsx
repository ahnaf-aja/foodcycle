import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { Reveal } from "@/components/ui/reveal";

/**
 * The customer-facing chrome: navbar, main content, footer.
 *
 * Used by the route group that holds every public and customer page, so the
 * dashboard areas can supply their own sidebar layout without inheriting this
 * one. `main` carries the id the skip link targets.
 *
 * The bottom padding on mobile clears the fixed bottom navigation.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Standard page container. One place decides the maximum width and gutters, so
 * every page lines up without repeating the same classes.
 */
export function Container({
  children,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  const width =
    size === "wide" ? "max-w-7xl" : size === "narrow" ? "max-w-2xl" : "max-w-6xl";

  return (
    <div className={`mx-auto w-full ${width} px-4 ${className}`}>{children}</div>
  );
}

/**
 * A page heading. Kept to a title, an optional one-line description, and an
 * optional action on the right — the hierarchy the rest of the page hangs from.
 */
export function PageHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * A labelled section with an optional "see all" link. Sections are separated by
 * space and a heading, not by wrapping everything in another card.
 *
 * The whole section rises into view as it is scrolled to. Doing it here rather
 * than at each call site means every section on every page animates, and the
 * effect cannot drift out of step between pages.
 */
export function Section({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal as="section" className={className}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Reveal>
  );
}
