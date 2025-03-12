import crypto = require("crypto");
import { BIGTABLE } from "../common/bigtable_client";
import { SessionBuilder } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { insertUserSessionStatement } from "../db/sql";
import { Table } from "@google-cloud/bigtable";
import { Database } from "@google-cloud/spanner";
import { CreateSessionHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  CreateSessionRequestBody,
  CreateSessionResponse,
} from "@phading/user_session_service_interface/node/interface";

export class CreateSessionHandler extends CreateSessionHandlerInterface {
  public static create(): CreateSessionHandler {
    return new CreateSessionHandler(
      SPANNER_DATABASE,
      BIGTABLE,
      SessionBuilder.create(),
      () => crypto.randomUUID(),
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bigtable: Table,
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
    let now = this.getNow();
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        insertUserSessionStatement({
          sessionId,
          userId: body.userId,
          accountId: body.accountId,
          createdTimeMs: now,
          renewedTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });
    await this.bigtable.insert({
      key: `u#${sessionId}`,
      data: {
        u: {
          u: {
            value: body.userId,
          },
          a: {
            value: body.accountId,
          },
          t: {
            value: now,
          },
          v: {
            value: body.capabilitiesVersion,
          },
          cs: {
            value: body.capabilities.canConsume ? "1" : "",
          },
          pb: {
            value: body.capabilities.canPublish ? "1" : "",
          },
          bl: {
            value: body.capabilities.canBeBilled ? "1" : "",
          },
          er: {
            value: body.capabilities.canEarn ? "1" : "",
          },
        },
      },
    });
    let signedSession = this.sessionBuilder.build(sessionId);
    return {
      signedSession,
    };
  }
}
