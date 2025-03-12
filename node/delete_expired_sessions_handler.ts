import { BIGTABLE } from "../common/bigtable_client";
import { SESSION_LONGEVITY_MS } from "../common/constants";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { deleteExpiredSessionsStatement, listExpiredSessions } from "../db/sql";
import { Table } from "@google-cloud/bigtable";
import { Database } from "@google-cloud/spanner";
import { DeleteExpiredSessionsHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  DeleteExpiredSessionsRequestBody,
  DeleteExpiredSessionsResponse,
} from "@phading/user_session_service_interface/node/interface";

export class DeleteExpiredSessionsHandler extends DeleteExpiredSessionsHandlerInterface {
  public static create(): DeleteExpiredSessionsHandler {
    return new DeleteExpiredSessionsHandler(SPANNER_DATABASE, BIGTABLE, () =>
      Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bigtable: Table,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: DeleteExpiredSessionsRequestBody,
  ): Promise<DeleteExpiredSessionsResponse> {
    let expiredTimeMs = this.getNow() - SESSION_LONGEVITY_MS;
    let rows = await listExpiredSessions(this.database, expiredTimeMs);
    let sessionIds = rows.map((row) => row.userSessionSessionId);
    await this.bigtable.mutate(
      sessionIds.map((sessionId) => ({
        key: `u#${sessionId}`,
        method: "delete",
      })),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteExpiredSessionsStatement(expiredTimeMs),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
