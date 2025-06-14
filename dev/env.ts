import "../env_const";
import "@phading/cluster/dev/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = ENV_VARS.balancedSpannerInstanceId;
ENV_VARS.replicas = 1;
ENV_VARS.cpu = "200m";
ENV_VARS.memory = "256Mi";
