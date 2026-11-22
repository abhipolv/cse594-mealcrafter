// Applies the SQL migrations in ./drizzle. Run locally and by the deploy workflow.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, client } from "./db";

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied."))
  .finally(() => client.end());
