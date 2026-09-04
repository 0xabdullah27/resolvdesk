import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/resolvdesk";

const pool = new Pool({ connectionString });

export const auth = betterAuth({
  database: pool,
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
  ],
});

export type Session = typeof auth.$Infer.Session;
