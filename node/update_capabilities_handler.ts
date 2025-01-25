import { SPANNER_DATABASE } from "../common/spanner_client";
import { listSessionsByAccountId, updateUserSessionStatement } from "../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { UpdateCapabilitiesHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  UpdateCapabilitiesRequestBody,
  UpdateCapabilitiesResponse,
} from "@phading/user_session_service_interface/node/interface";

export class UpdateCapabilitiesHandler extends UpdateCapabilitiesHandlerInterface {
  public static create(): UpdateCapabilitiesHandler {
    return new UpdateCapabilitiesHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateCapabilitiesRequestBody,
  ): Promise<UpdateCapabilitiesResponse> {
    await this.database.runTransactionAsync(async (transaction) => {
      let sessions = await listSessionsByAccountId(transaction, body.accountId);
      let statements = new Array<Statement>();
      sessions.forEach((session) => {
        let data = session.userSessionData;
        if (body.version <= data.version) {
          return;
        }
        data.version = body.version;
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
