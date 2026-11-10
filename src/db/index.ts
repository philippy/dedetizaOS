import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "postgresql://user:pass@localhost:5432/db";

function createNeonDb(url: string) {
  return drizzleNeon(neon(url), { schema });
}

export type DB = ReturnType<typeof createNeonDb>;

// Em produção o banco é o Neon (driver HTTP). Para desenvolver e testar com um
// Postgres local (localhost/127.0.0.1), usa o driver "pg" comum.
function isLocalPostgres(url: string) {
  return /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
}

function createLocalDb(url: string): DB {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres");
  return drizzle(new Pool({ connectionString: url }), { schema }) as DB;
}

export const db: DB = isLocalPostgres(connectionString) && process.env.DATABASE_URL
  ? createLocalDb(connectionString)
  : createNeonDb(connectionString);
