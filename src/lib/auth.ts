import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "detetiza_impacto_secret_default_2026_key_998877",
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "https://dedetiza-os.vercel.app"),
  trustedOrigins: [
    "https://dedetiza-os.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000"
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true },
});
