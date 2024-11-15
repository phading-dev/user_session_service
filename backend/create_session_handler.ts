import crypto = require("crypto");
import { SessionBuilder } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { insertSessionStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateSessionHandlerInterface } from "@phading/user_session_service_interface/backend/handler";
import {
  AccountType,
  CreateSessionRequestBody,
  CreateSessionResponse,
} from "@phading/user_session_service_interface/backend/interface";

export class CreateSessionHandler extends CreateSessionHandlerInterface {
  public static create(): CreateSessionHandler {
    return new CreateSessionHandler(
      SPANNER_DATABASE,
      SessionBuilder.create(),
      () => crypto.randomUUID(),
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private sessionBuilder: SessionBuilder,
    private generateUuid: () => string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CreateSessionRequestBody,
  ): Promise<CreateSessionResponse> {
    let sessionId = this.generateUuid();
    let canPublishShows = body.accountType === AccountType.PUBLISHER;
    let canConsumeShows = body.accountType === AccountType.CONSUMER;
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      await transaction.batchUpdate([
        insertSessionStatement(
          sessionId,
          body.userId,
          body.accountId,
          now,
          now,
          canPublishShows,
          canConsumeShows,
        ),
      ]);
      await transaction.commit();
    });
    let signedSession = this.sessionBuilder.build(sessionId);
    return {
      signedSession,
    };
  }
}
