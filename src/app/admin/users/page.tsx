import type { Metadata } from "next";

import { requireAdmin } from "@/server/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  RESTAURANT: "Restaurant",
  SOCIAL_INSTITUTION: "Institution",
  ADMIN: "Admin",
};

/**
 * Every account on the platform.
 *
 * Read-only by design. The only role change an administrator might legitimately
 * need — promoting someone — is deliberately not offered as an inline control
 * here, because getting it wrong grants a stranger access to the whole platform
 * and there is no undo that a mis-tap deserves. `setUserRoleAction` exists for
 * that job and can be wired to a deliberate, confirmed flow when it is needed.
 */
export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, donations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const byRole = users.reduce<Record<string, number>>((accumulator, user) => {
    accumulator[user.role] = (accumulator[user.role] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Users</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {users.length} {users.length === 1 ? "account" : "accounts"} ·{" "}
          {Object.entries(byRole)
            .map(([role, count]) => `${count} ${ROLE_LABEL[role]?.toLowerCase() ?? role}`)
            .join(", ")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2.5 pr-4 font-medium text-ink-muted">
                Name
              </th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-ink-muted">
                Email
              </th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-ink-muted">
                Role
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium text-ink-muted">
                Orders
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium text-ink-muted">
                Donations
              </th>
              <th scope="col" className="py-2.5 font-medium text-ink-muted">
                Joined
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-3 pr-4 text-ink">{user.name ?? "—"}</td>
                <td className="py-3 pr-4 text-ink-soft">{user.email}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-xs bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-soft">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right text-ink-soft tabular">
                  {user._count.orders}
                </td>
                <td className="py-3 pr-4 text-right text-ink-soft tabular">
                  {user._count.donations}
                </td>
                <td className="py-3 text-ink-muted">{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length >= 200 && (
        <p className="text-xs text-ink-muted">
          Showing the 200 most recent accounts.
        </p>
      )}
    </div>
  );
}
