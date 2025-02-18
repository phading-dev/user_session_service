import "./environment";
import "@phading/cluster/environment_dev";

globalThis.SERVICE_NAME = "user-session-service";
globalThis.DATABASE_INSTANCE_ID = globalThis.HIGH_READ_DB_INSTANCE_ID;
globalThis.DATABASE_ID = "user-session-db";
globalThis.SESSION_SECRET_KEY_FILE = "session_secret.key";
globalThis.BUILDER_ACCOUNT = "user-session-service-builder";
globalThis.SERVICE_ACCOUNT = "user-session-service-account";
globalThis.PORT = 8080;
