import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FoodCycle — Save food, share goodness",
    template: "%s · FoodCycle",
  },
  description:
    "Discover quality surplus food from nearby restaurants at lower prices — enjoy it yourself or donate it to someone who needs it.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Two deliberate deviations from a plain <html>:
  //
  // `suppressHydrationWarning` — the inline script below adds `js` before the
  // first paint, so the DOM intentionally differs from the server HTML. Without
  // this, React reports a hydration mismatch on every single page load.
  //
  // `data-scroll-behavior` — Next.js asks for this when `scroll-behavior:
  // smooth` is set on <html>, so route transitions don't animate the scroll.
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/*
          Marks the document as scripted, before the first paint.

          The scroll-reveal animation hides its blocks until they scroll into
          view, and it must do so from the very first frame — hiding them later,
          from an effect, makes content visibly flash in and then out again. But
          the hiding must also never outlive the script: if JavaScript is off or
          fails, nothing would ever un-hide the page.

          So the CSS is scoped to `.js`, and this one line sets it. No script,
          no class, no hiding — the fallback is that content is simply visible.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body className="min-h-full">
        {/*
          Keyboard users reach the content in one tab, rather than stepping
          through the entire navbar on every page.
        */}
        <a href="#main" className="skip-link rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
