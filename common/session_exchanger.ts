import EventEmitter from "events";
import { deleteExpiredSessionStatement, getSession } from "../db/sql";
import { SESSION_LONGEVITY_MS } from "./params";
import { RequestBody, Response } from "./session_exchanger_interface";
import { SessionExtractor } from "./session_signer";
import { SPANNER_DATABASE } from "./spanner_client";
import { Database } from "@google-cloud/spanner";
import { newUnauthorizedError } from "@selfage/http_error";

export interface SessionExchanger {
  on(event: "cleanedUp", listener: () => void): this;
}

export class SessionExchanger extends EventEmitter {
  public static create(): SessionExchanger {
    return new SessionExchanger(
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

  public async exchange(
    loggingPrefix: string,
    body: RequestBody,
  ): Promise<Response> {
    let sessionId = this.sessionExtractor.extractSessionId(
      loggingPrefix,
      body.signedSession,
    );
    let rows = await getSession(this.database, sessionId);
    if (rows.length === 0) {
      throw newUnauthorizedError(`${loggingPrefix} session not found.`);
    }
    let sessionRow = rows[0];
    let validTimestamp = this.getNow() - SESSION_LONGEVITY_MS;
    if (sessionRow.userSessionRenewedTimestamp < validTimestamp) {
      // Fire and forget.
      this.cleanUpExpredSession(validTimestamp);
      throw newUnauthorizedError(`${loggingPrefix} session expired.`);
    }
    let data = sessionRow.userSessionData;
    return {
      sessionId: sessionId,
      userId: data.userId,
      accountId: data.accountId,
      canConsumeShows: body.checkCanConsumeShows
        ? data.canConsumeShows
        : undefined,
      canPublishShows: body.checkCanPublishShows
        ? data.canPublishShows
        : undefined,
    };
  }

  private async cleanUpExpredSession(validTimestamp: number): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteExpiredSessionStatement(validTimestamp),
      ]);
      await transaction.commit();
    });
    this.emit("cleanedUp");
  }
}
