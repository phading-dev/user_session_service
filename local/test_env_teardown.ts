import "./env";
import { ENV_VARS } from "../env_vars";
import { spawnSync } from "child_process";

async function main() {
  spawnSync(
    "gcloud",
    ["spanner", "instances", "delete", ENV_VARS.spannerInstanceId, "--quiet"],
    { stdio: "inherit" },
  );
  spawnSync("cbt", [
    "-project",
    ENV_VARS.projectId,
    "deleteinstance",
    ENV_VARS.bigtableInstanceId,
  ]);
}

main();
