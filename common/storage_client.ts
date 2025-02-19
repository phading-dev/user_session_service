import { Storage } from "@google-cloud/storage";
import { CLUSTER_ENV_VARS } from "@phading/cluster/env";

export let STORAGE_CLIENT = new Storage({
  projectId: CLUSTER_ENV_VARS.projectId,
});
