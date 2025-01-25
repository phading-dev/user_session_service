import EventEmitter from "events";
import { UserSession } from "../db/schema";
import { deleteExpiredSessionStatement, getUserSession } from "../db/sql";
import { SESSION_LONGEVITY_MS } from "./params";
import { SessionExtractor } from "./session_signer";
import { SPANNER_DATABASE } from "./spanner_client";
import { Database } from "@google-cloud/spanner";
import { CapabilitiesMask } from "@phading/user_session_service_interface/capabilities";
import { newUnauthorizedError } from "@selfage/http_error";

export interface RequestBody {
  signedSession?: string;
  capabilitiesMask?: CapabilitiesMask;
}

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
  ): Promise<UserSession> {
    let sessionId = this.sessionExtractor.extractSessionId(
      loggingPrefix,
      body.signedSession,
    );
    let rows = await getUserSession(this.database, sessionId);
    if (rows.length === 0) {
      throw newUnauthorizedError(`Session not found.`);
    }
    let { userSessionData } = rows[0];
    let validTimestamp = this.getNow() - SESSION_LONGEVITY_MS;
    if (userSessionData.renewedTimeMs < validTimestamp) {
      // Fire and forget.
      this.cleanUpExpiredSession(validTimestamp);
      throw newUnauthorizedError(`Session expired.`);
    }
    if (!body.capabilitiesMask.checkCanConsumeShows) {
      userSessionData.capabilities.canConsumeShows = undefined;
    }
    if (!body.capabilitiesMask.checkCanPublishShows) {
      userSessionData.capabilities.canPublishShows = undefined;
    }
    if (!body.capabilitiesMask.checkCanBeBilled) {
      userSessionData.capabilities.canBeBilled = undefined;
    }
    if (!body.capabilitiesMask.checkCanEarn) {
      userSessionData.capabilities.canEarn = undefined;
    }
    userSessionData.capabilitiesVersion = undefined;
    userSessionData.createdTimeMs = undefined;
    userSessionData.renewedTimeMs = undefined;
    return userSessionData;
  }

  private async cleanUpExpiredSession(validTimestamp: number): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteExpiredSessionStatement(validTimestamp),
      ]);
      await transaction.commit();
    });
    this.emit("cleanedUp");
  }
}
