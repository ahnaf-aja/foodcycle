import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient for the whole process.
 *
 * In development Next.js hot-reloads modules on every edit, which would
 * otherwise create a new connection pool each time and exhaust Postgres
 * connections. Caching the instance on `globalThis` keeps one pool alive
 * across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
