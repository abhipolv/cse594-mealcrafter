// Adds a login code with a random part, so codes cannot be guessed from the
// public repo.  pnpm user:add <prefix> <display name> [participant|team|demo]
//   pnpm user:add p03 "P03"          -> e.g. p03-kale-4821
//   pnpm user:add abhi "Abhi" team
import { randomInt } from "node:crypto";
import { db, schema, client } from "./db";

const WORDS = ["basil", "kale", "plum", "fig", "leek", "pear", "lime", "corn", "bean", "rice", "mint", "sage", "dill", "okra", "yam", "chive"];

async function main() {
  const [prefix, displayName, role = "participant"] = process.argv.slice(2);
  const code = prefix && `${prefix}-${WORDS[randomInt(WORDS.length)]}-${randomInt(1000, 10000)}`;
  if (!code || !displayName || !["participant", "team", "demo"].includes(role)) {
    console.error('Usage: pnpm user:add <prefix> "<display name>" [participant|team|demo]');
    process.exit(1);
  }
  const [user] = await db
    .insert(schema.users)
    .values({ code: code.toLowerCase(), displayName, role: role as "participant" | "team" | "demo" })
    .returning();
  console.log(`Added ${user.displayName} (${user.role}). Login code: ${user.code}`);
}

main().finally(() => client.end());
