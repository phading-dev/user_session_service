import { SessionFetcher } from "../common/session_fetcher";
import { CheckCapabilityHandlerInterface } from "@phading/user_session_service_interface/web/handler";
import {
  CheckCapabilityRequestBody,
  CheckCapabilityResponse,
} from "@phading/user_session_service_interface/web/interface";

export class CheckCapabilityHandler extends CheckCapabilityHandlerInterface {
  public static create(): CheckCapabilityHandler {
    return new CheckCapabilityHandler(SessionFetcher.create());
  }

  public constructor(private sessionFetcher: SessionFetcher) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CheckCapabilityRequestBody,
    sessionStr: string,
  ): Promise<CheckCapabilityResponse> {
    return this.sessionFetcher.fetch(loggingPrefix, {
      signedSession: sessionStr,
      capabilitiesMask: body.capabilitiesMask,
    });
  }
}
