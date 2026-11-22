// Lists every login code.
//   pnpm user:list         local database (.env.local)
//   pnpm user:list:prod    production database (.env.production.local, Abhi's machine)
import { asc, eq } from "drizzle-orm";
import { db, schema, client } from "./db";

async function main() {
  const rows = await db
    .select({
      code: schema.users.code,
      name: schema.users.displayName,
      role: schema.users.role,
      setupDone: schema.profiles.setupCompletedAt,
      created: schema.users.createdAt,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
    .orderBy(asc(schema.users.createdAt));

  console.table(
    rows.map((r) => ({
      code: r.code,
      name: r.name,
      role: r.role,
      "setup done": r.setupDone ? "yes" : "no",
      created: r.created.toISOString().slice(0, 10),
    })),
  );
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
