import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "postgresql://user:pass@localhost:5432/db";

export const sqlClient = neon(connectionString);
export const db = drizzle(sqlClient, { schema });
