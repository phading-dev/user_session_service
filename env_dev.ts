import { ENV_VARS } from "./env";
import "./env_const";
import "@phading/cluster/env_dev";

ENV_VARS.databaseInstanceId = ENV_VARS.highReadDbInstanceId;
