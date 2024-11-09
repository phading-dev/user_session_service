import { getEnvVar } from "@selfage/env_var_getter";

export let PROJECT_ID = getEnvVar("PROJECT_ID").required().asString();
export let DATABASE_ID = getEnvVar("DATABASE_ID").required().asString();
export let INSTANCE_ID = getEnvVar("INSTANCE_ID").required().asString();
