import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Carry our `id` and `role` through the session.
 *
 * `role` is the single fact that decides which dashboard a person may reach, so
 * it is written into the JWT at sign-in and read back on every request.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
