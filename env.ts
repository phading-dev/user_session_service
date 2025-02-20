import { CLUSTER_ENV_VARS, ClusterEnvVars } from "@phading/cluster/env";

export interface EnvVars extends ClusterEnvVars {
  databaseId?: string;
  databaseInstanceId?: string;
  sessionSecretKeyFile?: string;
  releaseServiceName?: string;
  port?: number;
  builderAccount?: string;
  serviceAccount?: string;
}

export let ENV_VARS: EnvVars = CLUSTER_ENV_VARS;
