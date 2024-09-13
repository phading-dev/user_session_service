import { SessionExchanger } from "../common/session_exchanger";
import { ExchangeSessionAndCheckCapabilityHandlerInterface } from "@phading/user_session_service_interface/backend/handler";
import {
  ExchangeSessionAndCheckCapabilityRequestBody,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/backend/interface";

export class ExchangeSessionAndCheckCapabilityHandler extends ExchangeSessionAndCheckCapabilityHandlerInterface {
  public static create(): ExchangeSessionAndCheckCapabilityHandler {
    return new ExchangeSessionAndCheckCapabilityHandler(
      SessionExchanger.create(),
    );
  }

  public constructor(private sessionExchanger: SessionExchanger) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ExchangeSessionAndCheckCapabilityRequestBody,
  ): Promise<ExchangeSessionAndCheckCapabilityResponse> {
    return this.sessionExchanger.exchange(loggingPrefix, body);
  }
}
