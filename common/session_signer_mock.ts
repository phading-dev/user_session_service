import { SessionBuilder, SessionExtractor } from "./session_signer";

export class SessionBuilderMock extends SessionBuilder {
  public sessionId: string;
  public signedSession: string;

  public constructor() {
    super(undefined, undefined);
  }

  public build(sessionId: string): string {
    this.sessionId = sessionId;
    return this.signedSession;
  }
}

export class SessionExtractorMock extends SessionExtractor {
  public sessionId: string;
  public signedSession: string;

  public constructor() {
    super(undefined);
  }

  public extractSessionId(
    loggingPrefix: string,
    signedSession: string,
  ): string {
    this.signedSession = signedSession;
    return this.sessionId;
  }
}
