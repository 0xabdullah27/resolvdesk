import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/resolvdesk";

const pool = new Pool({ connectionString });

export const auth = betterAuth({
  database: pool,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "resolvdesk-development-auth-secret-key-32chars",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "http://localhost:3000",
  ],
  plugins: [
    jwt({
      jwks: {
        jwksPath: "/.well-known/jwks.json",
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Rolls back (deletes) a newly created Better Auth user if downstream
 * workspace provisioning in the backend fails.
 */
export async function rollbackBetterAuthUser(userId: string) {
  try {
    // 1. Attempt Better Auth internal adapter delete
    if ("adapter" in auth && typeof (auth as any).adapter?.delete === "function") {
      try {
        await (auth as any).adapter.delete({
          model: "user",
          where: [{ field: "id", value: userId }],
        });
        return;
      } catch (adapterErr) {
        console.warn("Adapter delete fallback to direct pool query:", adapterErr);
      }
    }

    // 2. Direct database pool cleanup
    try {
      await pool.query('DELETE FROM "session" WHERE "userId" = $1 OR "user_id" = $1', [userId]);
    } catch {}
    try {
      await pool.query('DELETE FROM "account" WHERE "userId" = $1 OR "user_id" = $1', [userId]);
    } catch {}
    try {
      await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
    } catch {}
  } catch (err) {
    console.error(`Rollback: Failed to delete Better Auth user ${userId}:`, err);
  }
}
