import { SessionExchanger } from "../common/session_exchanger";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { updateRenewedTimestamp } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { RenewSessionHandlerInterface } from "@phading/user_session_service_interface/frontend/handler";
import {
  RenewSessionRequestBody,
  RenewSessionResponse,
} from "@phading/user_session_service_interface/frontend/interface";

export class RenewSessionHandler extends RenewSessionHandlerInterface {
  public static create(): RenewSessionHandler {
    return new RenewSessionHandler(SessionExchanger.create(), SPANNER_DATABASE);
  }

  public constructor(
    private sessionExchanger: SessionExchanger,
    private database: Database,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: RenewSessionRequestBody,
    sessionStr: string,
  ): Promise<RenewSessionResponse> {
    let userSession = (
      await this.sessionExchanger.exchange(loggingPrefix, {
        signedSession: sessionStr,
      })
    ).userSession;
    await updateRenewedTimestamp(
      (query) => this.database.run(query),
      userSession.sessionId,
    );
    return {};
  }
}
