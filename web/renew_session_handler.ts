import { SESSION_LONGEVITY_MS } from "../common/params";
import { SessionExtractor } from "../common/session_signer";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { getUserSession, updateUserSessionStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { RenewSessionHandlerInterface } from "@phading/user_session_service_interface/web/handler";
import {
  RenewSessionRequestBody,
  RenewSessionResponse,
} from "@phading/user_session_service_interface/web/interface";
import { newNotFoundError, newUnauthorizedError } from "@selfage/http_error";

export class RenewSessionHandler extends RenewSessionHandlerInterface {
  public static create(): RenewSessionHandler {
    return new RenewSessionHandler(
      SPANNER_DATABASE,
      SessionExtractor.create(),
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
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
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getUserSession(transaction, sessionId);
      if (rows.length === 0) {
        throw newNotFoundError(`Session not found.`);
      }
      let { userSessionData } = rows[0];
      let now = this.getNow();
      if (userSessionData.renewedTimeMs + SESSION_LONGEVITY_MS < now) {
        throw newUnauthorizedError(`Session expired.`);
      }
      userSessionData.renewedTimeMs = this.getNow();
      await transaction.batchUpdate([
        updateUserSessionStatement(userSessionData),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
