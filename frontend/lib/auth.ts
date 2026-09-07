import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "@neondatabase/serverless";

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/resolvdesk";

// Strip channel_binding parameter as Neon serverless WebSocket pool does not support SCRAM channel binding
const connectionString = rawConnectionString.replace(/[\?&]channel_binding=[^&]*/g, "");

const pool = new Pool({ connectionString });
pool.on("error", (err: any) => {
  console.warn("Neon database connection pool event:", err?.message || err);
});

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
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
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    "https://resolvdesk.online",
    "https://www.resolvdesk.online",
    "https://resolvdesk.vercel.app",
    "http://localhost:3000",
  ],
  plugins: [
    jwt({
      jwks: {
        jwksPath: "/.well-known/jwks.json",
      },
      definePayload: ({ user }: { user: any }) => ({
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
      }),
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
