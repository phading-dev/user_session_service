import { Storage } from "@google-cloud/storage";
import { ENV_VARS } from "../env_vars"; 

export let STORAGE_CLIENT = new Storage({
  projectId: ENV_VARS.projectId,
});
