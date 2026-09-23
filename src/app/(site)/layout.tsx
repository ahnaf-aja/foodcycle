import { Shell } from "@/components/layout/shell";

/**
 * The public and customer-facing area.
 *
 * Everything in this route group gets the navbar, footer and bottom navigation.
 * The restaurant, institution and admin areas sit outside the group and supply
 * their own chrome.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
