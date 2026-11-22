// Starts (or creates) the local Postgres container. Needs only plain Docker.
import { execSync } from "node:child_process";

const NAME = "mealcrafter-db";
const run = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

try {
  const state = run(`docker inspect -f "{{.State.Running}}" ${NAME}`);
  if (state !== "true") run(`docker start ${NAME}`);
  console.log(`${NAME} is running on localhost:54329`);
} catch {
  run(
    `docker run -d --name ${NAME} -e POSTGRES_USER=mealcrafter -e POSTGRES_PASSWORD=mealcrafter ` +
      `-e POSTGRES_DB=mealcrafter -p 54329:5432 -v ${NAME}:/var/lib/postgresql/data postgres:17`,
  );
  console.log(`Created ${NAME} on localhost:54329. Give it a few seconds, then run pnpm db:migrate.`);
}
