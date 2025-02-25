import { ENV_VARS } from "./env";
import { spawnSync } from "child_process";
import "./env_local";

async function main() {
  spawnSync("gcloud", ["auth", "application-default", "login"], {
    stdio: "inherit",
  });
  spawnSync("gcloud", ["config", "set", "project", ENV_VARS.projectId], {
    stdio: "inherit",
  });
  spawnSync(
    "gcloud",
    [
      "spanner",
      "instances",
      "create",
      ENV_VARS.spannerInstanceId,
      `--config=${ENV_VARS.spannerRegion}`,
      `--description=${ENV_VARS.spannerInstanceId}`,
      "--edition=STANDARD",
      "--processing-units=100",
    ],
    { stdio: "inherit" },
  );
  spawnSync(
    "gcloud",
    [
      "spanner",
      "databases",
      "create",
      ENV_VARS.spannerDatabaseId,
      `--instance=${ENV_VARS.spannerInstanceId}`,
    ],
    { stdio: "inherit" },
  );
  spawnSync(
    "npx",
    [
      "spanage",
      "update",
      "db/ddl",
      "-p",
      ENV_VARS.projectId,
      "-i",
      ENV_VARS.spannerInstanceId,
      "-d",
      ENV_VARS.spannerDatabaseId,
    ],
    { stdio: "inherit" },
  );
}

main();
