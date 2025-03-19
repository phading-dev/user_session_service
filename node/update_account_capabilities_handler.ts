import { BIGTABLE } from "../common/bigtable_client";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { listSessionsByAccountId } from "../db/sql";
import { Table } from "@google-cloud/bigtable";
import { Database } from "@google-cloud/spanner";
import { UpdateAccountCapabilitiesHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  UpdateAccountCapabilitiesRequestBody,
  UpdateAccountCapabilitiesResponse,
} from "@phading/user_session_service_interface/node/interface";

export class UpdateAccountCapabilitiesHandler extends UpdateAccountCapabilitiesHandlerInterface {
  public static create(): UpdateAccountCapabilitiesHandler {
    return new UpdateAccountCapabilitiesHandler(SPANNER_DATABASE, BIGTABLE);
  }

  public constructor(
    private database: Database,
    private bigtable: Table,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateAccountCapabilitiesRequestBody,
  ): Promise<UpdateAccountCapabilitiesResponse> {
    let rows = await listSessionsByAccountId(this.database, {
      userSessionAccountIdEq: body.accountId,
    });
    let filter = [
      {
        family: /^u$/,
      },
      {
        column: /^v$/,
      },
      {
        column: {
          cellLimit: 1,
        },
      },
      {
        value: {
          end: body.capabilitiesVersion - 1,
        },
      },
    ];
    let onMatch = {
      onMatch: [
        {
          method: "insert",
          data: {
            u: {
              v: {
                value: body.capabilitiesVersion,
              },
              cs: {
                value: body.capabilities.canConsume ? "1" : "",
              },
              pb: {
                value: body.capabilities.canPublish ? "1" : "",
              },
              bl: {
                value: body.capabilities.canBeBilled ? "1" : "",
              },
              er: {
                value: body.capabilities.canEarn ? "1" : "",
              },
            },
          },
        },
      ],
    };
    await Promise.all(
      rows.map((row) =>
        this.bigtable
          .row(`u#${row.userSessionSessionId}`)
          .filter(filter, onMatch),
      ),
    );
    return {};
  }
}
