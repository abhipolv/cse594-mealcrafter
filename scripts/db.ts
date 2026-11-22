// Database client for scripts (outside Next.js, so no "server-only").
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run with --env-file=.env.local).");
export const client = postgres(url, { prepare: false, max: 1 });
export const db = drizzle(client, { schema });
export { schema };
