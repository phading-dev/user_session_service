import { BIGTABLE } from "./bigtable_client";
import { SESSION_LONGEVITY_MS } from "./constants";
import { SessionExtractor } from "./session_signer";
import { Table } from "@google-cloud/bigtable";
import {
  Capabilities,
  CapabilitiesMask,
} from "@phading/user_session_service_interface/capabilities";
import { newUnauthorizedError } from "@selfage/http_error";

export interface RequestBody {
  signedSession?: string;
  capabilitiesMask?: CapabilitiesMask;
}

export interface Response {
  userId?: string;
  accountId?: string;
  capabilities?: Capabilities;
}

export class SessionFetcher {
  public static create(): SessionFetcher {
    return new SessionFetcher(BIGTABLE, SessionExtractor.create(), () =>
      Date.now(),
    );
  }

  public constructor(
    private bigtable: Table,
    private sessionExtractor: SessionExtractor,
    private getNow: () => number,
  ) {}

  public async fetch(
    loggingPrefix: string,
    body: RequestBody,
  ): Promise<Response> {
    let sessionId = this.sessionExtractor.extractSessionId(
      loggingPrefix,
      body.signedSession,
    );
    let regexStrs = ["u", "a", "t"];
    if (body.capabilitiesMask.checkCanConsume) {
      regexStrs.push("cs");
    }
    if (body.capabilitiesMask.checkCanPublish) {
      regexStrs.push("pb");
    }
    if (body.capabilitiesMask.checkCanBeBilled) {
      regexStrs.push("bl");
    }
    if (body.capabilitiesMask.checkCanEarn) {
      regexStrs.push("er");
    }
    let [rows] = await this.bigtable.getRows({
      keys: [`u#${sessionId}`],
      filter: [
        {
          column: new RegExp(`^(${regexStrs.join("|")})$`),
        },
        {
          column: {
            cellLimit: 1,
          },
        },
      ],
    });
    if (rows.length === 0) {
      throw newUnauthorizedError(`Session not found.`);
    }
    let row = rows[0];
    let validTimestamp = this.getNow() - SESSION_LONGEVITY_MS;
    if (row.data["u"]["t"][0].value < validTimestamp) {
      throw newUnauthorizedError(`Session expired.`);
    }
    let response: Response = {
      userId: row.data["u"]["u"][0].value,
      accountId: row.data["u"]["a"][0].value,
      capabilities: {},
    };
    if (body.capabilitiesMask.checkCanConsume) {
      response.capabilities.canConsume = Boolean(row.data["u"]["cs"][0].value);
    }
    if (body.capabilitiesMask.checkCanPublish) {
      response.capabilities.canPublish = Boolean(row.data["u"]["pb"][0].value);
    }
    if (body.capabilitiesMask.checkCanBeBilled) {
      response.capabilities.canBeBilled = Boolean(row.data["u"]["bl"][0].value);
    }
    if (body.capabilitiesMask.checkCanEarn) {
      response.capabilities.canEarn = Boolean(row.data["u"]["er"][0].value);
    }
    return response;
  }
}
