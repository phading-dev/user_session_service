import { spawnSync } from "child_process";
import "./environment_local"

async function main() {
  spawnSync("gcloud", ["spanner", "instances", "delete", globalThis.DATABASE_INSTANCE_ID, "--quiet"], { stdio: "inherit" });
}

main();
