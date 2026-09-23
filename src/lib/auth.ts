import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

import { prisma } from "./prisma";
import { loginSchema } from "./validation";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Sessions use JWTs rather than database sessions. That is not a preference:
 * the Credentials provider cannot create database sessions, and it is the right
 * trade here anyway — the JWT carries the user's role, so authorisation checks
 * cost nothing beyond verifying the cookie.
 *
 * The Prisma adapter is still installed so the `Account`, `Session` and
 * `VerificationToken` tables exist and OAuth providers can be added later
 * without a migration.
 *
 * The `Session.user.id` / `Session.user.role` types are declared in
 * `src/types/next-auth.d.ts`.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            passwordHash: true,
          },
        });

        // Compare against a dummy hash when the user is missing so that a
        // non-existent account and a wrong password take the same time to
        // reject. Without this, response timing reveals which emails exist.
        if (!user?.passwordHash) {
          await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // A role can change (an admin promoting someone). Re-read it when the
      // session is explicitly updated rather than on every request.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as UserRole) ?? "CUSTOMER";
      }
      return session;
    },
  },
});

/** Where each role belongs after signing in. */
export const ROLE_HOME: Record<UserRole, string> = {
  CUSTOMER: "/dashboard",
  RESTAURANT: "/restaurant/dashboard",
  SOCIAL_INSTITUTION: "/institution/dashboard",
  ADMIN: "/admin/dashboard",
};

/** The path prefix each role owns. Used to keep roles out of each other's areas. */
export const ROLE_AREA: Record<UserRole, string> = {
  CUSTOMER: "/dashboard",
  RESTAURANT: "/restaurant",
  SOCIAL_INSTITUTION: "/institution",
  ADMIN: "/admin",
};
