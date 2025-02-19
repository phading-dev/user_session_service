import { CLUSTER_ENV_VARS, ClusterEnvVars } from "@phading/cluster/env";

export interface EnvVars extends ClusterEnvVars {
  releaseServiceName?: string;
  databaseId?: string;
  databaseInstanceId?: string;
  sessionSecretKeyFile?: string;
  builderAccount?: string;
  serviceAccount?: string;
  port?: number;
}

export let ENV_VARS: EnvVars = CLUSTER_ENV_VARS;
