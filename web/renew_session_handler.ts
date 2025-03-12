import { BIGTABLE } from "../common/bigtable_client";
import { SESSION_LONGEVITY_MS } from "../common/constants";
import { SessionExtractor } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { getUserSession, updateUserSessionStatement } from "../db/sql";
import { Table } from "@google-cloud/bigtable";
import { Database } from "@google-cloud/spanner";
import { RenewSessionHandlerInterface } from "@phading/user_session_service_interface/web/handler";
import {
  RenewSessionRequestBody,
  RenewSessionResponse,
} from "@phading/user_session_service_interface/web/interface";

export class RenewSessionHandler extends RenewSessionHandlerInterface {
  public static create(): RenewSessionHandler {
    return new RenewSessionHandler(
      SPANNER_DATABASE,
      BIGTABLE,
      SessionExtractor.create(),
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bigtable: Table,
    private sessionExtractor: SessionExtractor,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: RenewSessionRequestBody,
    sessionStr: string,
  ): Promise<RenewSessionResponse> {
    let sessionId = this.sessionExtractor.extractSessionId(
      loggingPrefix,
      sessionStr,
    );
    let now = this.getNow();
    let valid = true;
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getUserSession(transaction, sessionId);
      if (rows.length === 0) {
        valid = false;
        return;
      }
      let { userSessionData } = rows[0];
      let now = this.getNow();
      if (userSessionData.renewedTimeMs < now - SESSION_LONGEVITY_MS) {
        valid = false;
        return;
      }
      userSessionData.renewedTimeMs = this.getNow();
      await transaction.batchUpdate([
        updateUserSessionStatement(userSessionData),
      ]);
      await transaction.commit();
    });
    if (!valid) {
      return {};
    }
    await this.bigtable.row(`u#${sessionId}`).filter(
      [
        {
          family: /^u$/,
        },
        {
          column: /^t$/,
        },
        {
          value: {
            start: 0, // Simply checks for presence of the row.
          },
        },
      ],
      {
        onMatch: [
          {
            method: "insert",
            data: {
              u: {
                t: {
                  value: now,
                },
              },
            },
          },
        ],
      },
    );
    return {};
  }
}
