import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// The client connects lazily, so a build without DATABASE_URL still succeeds;
// the first query then fails with a clear message.
const url = process.env.DATABASE_URL ?? "postgres://missing-DATABASE_URL-see-.env.example@localhost:1/none";

// prepare:false is required by the Supabase transaction pooler (port 6543).
// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = globalForDb.pg ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
