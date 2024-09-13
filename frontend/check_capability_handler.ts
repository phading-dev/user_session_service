import { SessionExchanger } from "../common/session_exchanger";
import { CheckCapabilityHandlerInterface } from "@phading/user_session_service_interface/frontend/handler";
import {
  CheckCapabilityRequestBody,
  CheckCapabilityResponse,
} from "@phading/user_session_service_interface/frontend/interface";

export class CheckCapabilityHandler extends CheckCapabilityHandlerInterface {
  public static create(): CheckCapabilityHandler {
    return new CheckCapabilityHandler(SessionExchanger.create());
  }

  public constructor(private sessionExchanger: SessionExchanger) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CheckCapabilityRequestBody,
    sessionStr: string,
  ): Promise<CheckCapabilityResponse> {
    let response = await this.sessionExchanger.exchange(loggingPrefix, {
      signedSession: sessionStr,
      checkCanConsumeShows: body.checkCanConsumeShows,
      checkCanPublishShows: body.checkCanPublishShows,
    });
    return {
      canConsumeShows: response.canConsumeShows,
      canPublishShows: response.canPublishShows,
    };
  }
}