import crypto = require("crypto");
import { SessionBuilder } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { insertUserSessionStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateSessionHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  AccountType,
  CreateSessionRequestBody,
  CreateSessionResponse,
} from "@phading/user_session_service_interface/node/interface";

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
        insertUserSessionStatement({
          sessionId,
          userId: body.userId,
          accountId: body.accountId,
          canConsumeShows,
          canPublishShows,
          createdTimeMs: now,
          renewedTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });
    let signedSession = this.sessionBuilder.build(sessionId);
    return {
      signedSession,
    };
  }
}
