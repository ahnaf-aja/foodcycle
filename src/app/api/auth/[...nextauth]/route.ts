import { handlers } from "@/lib/auth";

/**
 * Auth.js route handler.
 *
 * Next.js 16 requires the second argument to be a promise and exports handlers
 * as a plain `{ GET, POST }` object. The spread keeps that contract intact
 * without pinning the app to a particular Auth.js signature.
 */
export const { GET, POST } = handlers;

export const runtime = "nodejs";
