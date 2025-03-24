import http = require("http");
import getStream from "get-stream";
import { SessionSigner } from "./common/session_signer";
import { STORAGE_CLIENT } from "./common/storage_client";
import { ENV_VARS } from "./env_vars";
import { CreateSessionHandler } from "./node/create_session_handler";
import { DeleteExpiredSessionsHandler } from "./node/delete_expired_sessions_handler";
import { FetchSessionAndCheckCapabilityHandler } from "./node/fetch_session_and_check_capability_handler";
import { UpdateAccountCapabilitiesHandler } from "./node/update_account_capabilities_handler";
import { CheckCapabilityHandler } from "./web/check_capability_handler";
import { RenewSessionHandler } from "./web/renew_session_handler";
import {
  USER_SESSION_NODE_SERVICE,
  USER_SESSION_WEB_SERVICE,
} from "@phading/user_session_service_interface/service";
import { ServiceHandler } from "@selfage/service_handler/service_handler";

async function main() {
  let [sessionSecretKey] = await Promise.all([
    getStream(
      STORAGE_CLIENT.bucket(ENV_VARS.gcsSecretBucketName)
        .file(ENV_VARS.sessionSecretKeyFile)
        .createReadStream(),
    ),
  ]);
  SessionSigner.SECRET_KEY = sessionSecretKey;
  let service = ServiceHandler.create(
    http.createServer(),
    ENV_VARS.externalOrigin,
  )
    .addCorsAllowedPreflightHandler()
    .addHealthCheckHandler()
    .addReadinessHandler()
    .addMetricsHandler();
  service
    .addHandlerRegister(USER_SESSION_NODE_SERVICE)
    .add(CreateSessionHandler.create())
    .add(DeleteExpiredSessionsHandler.create())
    .add(FetchSessionAndCheckCapabilityHandler.create())
    .add(UpdateAccountCapabilitiesHandler.create());
  service
    .addHandlerRegister(USER_SESSION_WEB_SERVICE)
    .add(CheckCapabilityHandler.create())
    .add(RenewSessionHandler.create());
  await service.start(ENV_VARS.port);
}

main();
