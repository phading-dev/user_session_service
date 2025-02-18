import "@phading/cluster/environment";

declare global {
  var SERVICE_NAME: string;
  var DATABASE_INSTANCE_ID: string;
  var DATABASE_ID: string;
  var SESSION_SECRET_KEY_FILE: string;
  var BUILDER_ACCOUNT: string;
  var SERVICE_ACCOUNT: string;
  var PORT: number;
}
