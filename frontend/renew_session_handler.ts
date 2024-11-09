import { SessionExchanger } from "../common/session_exchanger";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { updateRenewedTimestampStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { RenewSessionHandlerInterface } from "@phading/user_session_service_interface/frontend/handler";
import {
  RenewSessionRequestBody,
  RenewSessionResponse,
} from "@phading/user_session_service_interface/frontend/interface";

export class RenewSessionHandler extends RenewSessionHandlerInterface {
  public static create(): RenewSessionHandler {
    return new RenewSessionHandler(
      SPANNER_DATABASE,
      SessionExchanger.create(),
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private sessionExchanger: SessionExchanger,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: RenewSessionRequestBody,
    sessionStr: string,
  ): Promise<RenewSessionResponse> {
    let resposne = await this.sessionExchanger.exchange(loggingPrefix, {
      signedSession: sessionStr,
    });
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        updateRenewedTimestampStatement(this.getNow(), resposne.sessionId),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
