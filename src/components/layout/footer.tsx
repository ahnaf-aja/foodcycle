import Link from "next/link";

import { Logo } from "./logo";

/**
 * The site footer.
 *
 * Three short columns and one line of legal copy. No newsletter signup, no
 * social icons, no sitemap dump — the bottom navigation already covers
 * navigation.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      {/* Extra bottom space on mobile so the fixed nav never covers the last line. */}
      <div className="mx-auto max-w-6xl px-4 py-10 pb-24 md:pb-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-ink-muted">
              Surplus food from nearby restaurants, at lower prices. Enjoy it
              yourself, or pass it on to someone who needs it.
            </p>
          </div>

          <nav aria-label="Explore" className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wide text-ink uppercase">Explore</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link href="/foods" className="transition-colors duration-150 hover:text-ink">
                  Browse food
                </Link>
              </li>
              <li>
                <Link href="/restaurants" className="transition-colors duration-150 hover:text-ink">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/donate" className="transition-colors duration-150 hover:text-ink">
                  How donation works
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Your account" className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wide text-ink uppercase">Account</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link href="/orders" className="transition-colors duration-150 hover:text-ink">
                  My orders
                </Link>
              </li>
              <li>
                <Link href="/impact" className="transition-colors duration-150 hover:text-ink">
                  My impact
                </Link>
              </li>
              <li>
                <Link href="/profile" className="transition-colors duration-150 hover:text-ink">
                  Profile
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Partners" className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wide text-ink uppercase">Partners</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>
                <Link
                  href="/signup?role=RESTAURANT"
                  className="transition-colors duration-150 hover:text-ink"
                >
                  List your restaurant
                </Link>
              </li>
              <li>
                <Link
                  href="/signup?role=SOCIAL_INSTITUTION"
                  className="transition-colors duration-150 hover:text-ink"
                >
                  Register an institution
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-ink-muted">
            FoodCycle Grade and Quality Score are internal marketplace indicators of
            freshness and remaining consumption window. They are not food-safety
            certifications. Restaurants remain responsible for ensuring that listed
            food is suitable for consumption.
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            © {new Date().getFullYear()} FoodCycle
          </p>
        </div>
      </div>
    </footer>
  );
}
