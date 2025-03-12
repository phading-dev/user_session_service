import { SessionFetcher } from "../common/session_fetcher";
import { FetchSessionAndCheckCapabilityHandlerInterface } from "@phading/user_session_service_interface/node/handler";
import {
  FetchSessionAndCheckCapabilityRequestBody,
  FetchSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";

export class FetchSessionAndCheckCapabilityHandler extends FetchSessionAndCheckCapabilityHandlerInterface {
  public static create(): FetchSessionAndCheckCapabilityHandler {
    return new FetchSessionAndCheckCapabilityHandler(SessionFetcher.create());
  }

  public constructor(private sessionFetcher: SessionFetcher) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: FetchSessionAndCheckCapabilityRequestBody,
  ): Promise<FetchSessionAndCheckCapabilityResponse> {
    return this.sessionFetcher.fetch(loggingPrefix, body);
  }
}
