import { SPANNER_DATABASE } from "../common/spanner_client";
import { listSessionsByAccountId, updateUserSessionStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { UpdateAccountCapabilitiesHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  UpdateAccountCapabilitiesRequestBody,
  UpdateAccountCapabilitiesResponse,
} from "@phading/user_session_service_interface/node/interface";

export class UpdateAccountCapabilitiesHandler extends UpdateAccountCapabilitiesHandlerInterface {
  public static create(): UpdateAccountCapabilitiesHandler {
    return new UpdateAccountCapabilitiesHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateAccountCapabilitiesRequestBody,
  ): Promise<UpdateAccountCapabilitiesResponse> {
    await this.database.runTransactionAsync(async (transaction) => {
      let sessions = await listSessionsByAccountId(transaction, body.accountId);
      let statements = new Array<Statement>();
      sessions.forEach((session) => {
        let data = session.userSessionData;
        if (body.capabilitiesVersion <= data.capabilitiesVersion) {
          return;
        }
        data.capabilitiesVersion = body.capabilitiesVersion;
        data.capabilities = body.capabilities;
        statements.push(updateUserSessionStatement(data));
      });
      if (statements.length > 0) {
        await transaction.batchUpdate(statements);
        await transaction.commit();
      }
    });
    return {};
  }
}
