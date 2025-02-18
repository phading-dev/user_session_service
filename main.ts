import http = require("http");
import getStream from "get-stream";
import { SessionSigner } from "./common/session_signer";
import { STORAGE_CLIENT } from "./common/storage_client";
import { CreateSessionHandler } from "./node/create_session_handler";
import { ExchangeSessionAndCheckCapabilityHandler } from "./node/exchange_session_and_check_capability_handler";
import { UpdateAccountCapabilitiesHandler } from "./node/update_account_capabilities_handler";
import { CheckCapabilityHandler } from "./web/check_capability_handler";
import { RenewSessionHandler } from "./web/renew_session_handler";
import {
  USER_SESSION_NODE_SERVICE,
  USER_SESSION_WEB_SERVICE,
} from "@phading/user_session_service_interface/service";
import { ServiceHandler } from "@selfage/service_handler/service_handler";
import "../environment";

async function main() {
  let [sessionSecretKey] = await Promise.all([
    getStream(
      STORAGE_CLIENT.bucket(globalThis.SECRET_BUCKET_NAME)
        .file(globalThis.SESSION_SECRET_KEY_FILE)
        .createReadStream(),
    ),
  ]);
  SessionSigner.SECRET_KEY = sessionSecretKey;
  let service = ServiceHandler.create(http.createServer())
    .addCorsAllowedPreflightHandler()
    .addHealthCheckHandler()
    .addMetricsHandler();
  service
    .addHandlerRegister(USER_SESSION_NODE_SERVICE)
    .add(CreateSessionHandler.create())
    .add(ExchangeSessionAndCheckCapabilityHandler.create())
    .add(UpdateAccountCapabilitiesHandler.create());
  service
    .addHandlerRegister(USER_SESSION_WEB_SERVICE)
    .add(CheckCapabilityHandler.create())
    .add(RenewSessionHandler.create());
  await service.start(globalThis.PORT);
}

main();
