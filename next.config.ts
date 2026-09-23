import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Turn off the automatic agent-instruction files.
   *
   * Next.js 16.3+ writes a pair of markdown files into the project root on
   * `next dev` when it detects an automated coding agent in the environment,
   * pointing it at the version-matched docs bundled with the `next` package.
   * They are irrelevant to how this app runs, so they are switched off here.
   *
   * Configuring it is the supported way to remove them: simply deleting the
   * files does not hold, because the next `next dev` run writes them back.
   */
  agentRules: false,
};

export default nextConfig;
