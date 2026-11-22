// Adds a login code.  pnpm user:add <code> <display name> [participant|team|demo]
//   pnpm user:add p03-basil "P03"
//   pnpm user:add abhi "Abhi" team
import { db, schema, client } from "./db";

async function main() {
  const [code, displayName, role = "participant"] = process.argv.slice(2);
  if (!code || !displayName || !["participant", "team", "demo"].includes(role)) {
    console.error('Usage: pnpm user:add <code> "<display name>" [participant|team|demo]');
    process.exit(1);
  }
  const [user] = await db
    .insert(schema.users)
    .values({ code: code.toLowerCase(), displayName, role: role as "participant" | "team" | "demo" })
    .returning();
  console.log(`Added ${user.code} (${user.role}).`);
}

main().finally(() => client.end());
