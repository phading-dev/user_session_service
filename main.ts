import express = require("express");
import getStream = require("get-stream");
import http = require("http");
import promClient = require("prom-client");
import { CreateClientSessionHandler } from "./backend/create_client_session_handler";
import { ExchangeSessionAndCheckCapabilityHandler } from "./backend/exchange_session_and_check_capability_handler";
import {
  SESSION_SECRET_KEY_FILENAME,
  USER_SESSION_SERVICE_BUCKET_NAME,
} from "./common/constants";
import { SessionSigner } from "./common/session_signer";
import { CheckCapabilityHandler } from "./frontend/check_capability_handler";
import { RenewClientSessionHandler } from "./frontend/renew_client_session_handler";
import { Storage } from "@google-cloud/storage";
import { USER_SESSION_SERVICE_BASE_URL } from "@phading/constants/origin";
import { HandlerRegister } from "@selfage/service_handler/register";
import "./environment";

class BucketReader {
  public constructor(
    private storage: Storage,
    private bucketName: string,
  ) {}

  public async read(fileName: string): Promise<string> {
    return getStream(
      this.storage.bucket(this.bucketName).file(fileName).createReadStream(),
    );
  }
}

function registerHandlers(sessionKey: string): express.Express {
  SessionSigner.SECRET_KEY = sessionKey;
  let app = express();
  let router = express.Router();
  let register = HandlerRegister.create(router);
  register.registerCorsAllowedPreflightHandler();
  register.registerNode(CreateClientSessionHandler.create());
  register.registerNode(ExchangeSessionAndCheckCapabilityHandler.create());
  register.registerWeb(CheckCapabilityHandler.create());
  register.registerWeb(RenewClientSessionHandler.create());
  app.use(USER_SESSION_SERVICE_BASE_URL, router);
  app.get("/healthz", (req, res) => {
    res.end("ok");
  });
  app.get("/metrics", async (req, res) => {
    res.end(await promClient.register.metrics());
  });
  return app;
}

async function main() {
  let reader = new BucketReader(
    new Storage(),
    USER_SESSION_SERVICE_BUCKET_NAME,
  );
  let [sessionKey] = await Promise.all([
    reader.read(SESSION_SECRET_KEY_FILENAME),
  ]);
  let app = registerHandlers(sessionKey);
  let httpServer = http.createServer(app);
  httpServer.listen(80, () => {
    console.log("Http server started at 80.");
  });
}

main();
