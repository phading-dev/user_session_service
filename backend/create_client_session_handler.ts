import crypto = require("crypto");
import { SessionBuilder } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { insertSession } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateClientSessionHandlerInterface } from "@phading/user_session_service_interface/backend/handler";
import {
  AccountType,
  CreateClientSessionRequestBody,
  CreateClientSessionResponse,
} from "@phading/user_session_service_interface/backend/interface";

export class CreateClientSessionHandler extends CreateClientSessionHandlerInterface {
  public static create(): CreateClientSessionHandler {
    return new CreateClientSessionHandler(
      SPANNER_DATABASE,
      SessionBuilder.create(),
      () => crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private sessionBuilder: SessionBuilder,
    private generateUuid: () => string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CreateClientSessionRequestBody,
  ): Promise<CreateClientSessionResponse> {
    let sessionId = this.generateUuid();
    let canPublishShows = body.accountType === AccountType.PUBLISHER;
    let canConsumeShows = body.accountType === AccountType.CONSUMER;
    await insertSession(
      (query) => this.database.run(query),
      sessionId,
      body.userId,
      body.accountId,
      canPublishShows,
      canConsumeShows,
    );
    let signedSession = this.sessionBuilder.build(sessionId);
    return {
      signedSession,
    };
  }
}
