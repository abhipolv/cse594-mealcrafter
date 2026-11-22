// One-time local setup: pnpm setup
//   1. creates .env.local from .env.example (with a random SESSION_SECRET)
//   2. starts the local Postgres container (needs Docker)
//   3. applies migrations and seeds the demo persona (log in with sam-demo)
// Safe to run again: it keeps an existing .env.local and re-seeds only the demo user.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const sh = (cmd) => execSync(cmd, { stdio: "inherit" });

if (existsSync(".env.local")) {
  console.log("Keeping your existing .env.local");
} else {
  const env = readFileSync(".env.example", "utf8").replace(
    /^SESSION_SECRET=.*$/m,
    `SESSION_SECRET=${randomBytes(32).toString("base64")}`,
  );
  writeFileSync(".env.local", env);
  console.log("Created .env.local (AI runs in mock mode; no keys needed)");
}

sh("node scripts/db-up.mjs");

for (let i = 0; ; i++) {
  try {
    execSync("docker exec mealcrafter-db pg_isready -U mealcrafter", { stdio: "ignore" });
    break;
  } catch {
    if (i >= 30) throw new Error("Postgres did not start within 30 seconds. Is Docker running?");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

sh("pnpm db:migrate");
sh("pnpm db:seed");
console.log("\nDone. Run pnpm dev, open http://localhost:3000 and log in with sam-demo.");
