import { Spanner } from "@google-cloud/spanner";
import "../environment";

export let SPANNER_DATABASE = new Spanner({
  projectId: globalThis.PROJECT_ID,
})
  .instance(globalThis.DATABASE_INSTANCE_ID)
  .database(globalThis.DATABASE_ID);
