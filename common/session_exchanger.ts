import { deleteSession, getSession } from "../db/sql";
import { SESSION_LONGEVITY_MS } from "./constants";
import { SessionExtractor } from "./session_signer";
import { SPANNER_DATABASE } from "./spanner_client";
import { Database } from "@google-cloud/spanner";
import {
  ExchangeSessionAndCheckCapabilityRequestBody,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/backend/interface";
import { newUnauthorizedError } from "@selfage/http_error";

export class SessionExchanger {
  public static create(): SessionExchanger {
    return new SessionExchanger(
      SessionExtractor.create(),
      SPANNER_DATABASE,
      () => Date.now(),
    );
  }

  public constructor(
    private sessionExtractor: SessionExtractor,
    private database: Database,
    private getNow: () => number,
  ) {}

  public async exchange(
    loggingPrefix: string,
    body: ExchangeSessionAndCheckCapabilityRequestBody,
  ): Promise<ExchangeSessionAndCheckCapabilityResponse> {
    let sessionId = this.sessionExtractor.extractSessionId(
      body.signedSession,
      loggingPrefix,
    );
    let rows = await getSession((query) => this.database.run(query), sessionId);
    if (rows.length === 0) {
      throw newUnauthorizedError(`${loggingPrefix} session not found.`);
    }
    let session = rows[0];
    if (
      this.getNow() - session.userSessionRenewedTimestamp >
      SESSION_LONGEVITY_MS
    ) {
      deleteSession(
        (query) => this.database.run(query),
        session.userSessionSessionId,
      );
      throw newUnauthorizedError(`${loggingPrefix} session expired.`);
    }
    return {
      userSession: {
        sessionId: session.userSessionSessionId,
        userId: session.userSessionUserId,
        accountId: session.userSessionAccountId,
      },
      canConsumeShows: body.checkCanConsumeShows
        ? session.userSessionCanConsumeShows
        : undefined,
      canPublishShows: body.checkCanPublishShows
        ? session.userSessionCanPublishShows
        : undefined,
    };
  }
}
