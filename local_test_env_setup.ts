import { spawnSync } from "child_process";
import "./environment_local";

async function main() {
  spawnSync("gcloud", ["auth", "application-default", "login"], { stdio: "inherit" });
  spawnSync("gcloud", ["spanner", "instances", "create", "test", `--config=${globalThis.DB_REGION}`, "--description=test", "--edition=STANDARD", "--processing-units=100"], { stdio: "inherit" });
  spawnSync("gcloud", ["spanner", "databases", "create", "test", "--instance=test"], { stdio: "inherit" });
  spawnSync("npx", ["spanage", "update", "db/ddl", "-p", globalThis.PROJECT_ID, "-i", "test", "-d", "test"], { stdio: "inherit" });
}

main();
