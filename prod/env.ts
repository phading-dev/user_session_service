import "../env_const";
import "@phading/cluster/prod/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = ENV_VARS.balancedSpannerInstanceId;
ENV_VARS.bigtableInstanceId = ENV_VARS.singleBigtableInstanceId;
ENV_VARS.replicas = 2;
ENV_VARS.cpu = "300m";
ENV_VARS.memory = "512Mi";
