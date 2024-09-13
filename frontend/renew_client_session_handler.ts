import { SessionExchanger } from "../common/session_exchanger";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { updateRenewedTimestamp } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { RenewClientSessionHandlerInterface } from "@phading/user_session_service_interface/frontend/handler";
import {
  RenewClientSessionRequestBody,
  RenewClientSessionResponse,
} from "@phading/user_session_service_interface/frontend/interface";

export class RenewClientSessionHandler extends RenewClientSessionHandlerInterface {
  public static create(): RenewClientSessionHandler {
    return new RenewClientSessionHandler(
      SessionExchanger.create(),
      SPANNER_DATABASE,
    );
  }

  public constructor(
    private sessionExchanger: SessionExchanger,
    private database: Database,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: RenewClientSessionRequestBody,
    sessionStr: string,
  ): Promise<RenewClientSessionResponse> {
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
