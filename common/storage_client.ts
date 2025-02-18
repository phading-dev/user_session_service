import { Storage } from "@google-cloud/storage";
import "../environment";

export let STORAGE_CLIENT = new Storage({
  projectId: globalThis.PROJECT_ID,
});
