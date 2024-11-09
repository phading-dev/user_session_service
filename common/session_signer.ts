import crypto = require("crypto");
import { newUnauthorizedError } from "@selfage/http_error";

function millisecondsToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

export class SessionSigner {
  public static SECRET_KEY = "some secrets";
  private static ALGORITHM = "sha256";

  public sign(sessionStr: string, timestamp: number): string {
    let signature = crypto
      .createHmac(SessionSigner.ALGORITHM, SessionSigner.SECRET_KEY)
      .update(`${sessionStr}/${timestamp}`)
      .digest("base64");
    return signature;
  }
}

export class SessionBuilder {
  public static create(): SessionBuilder {
    return new SessionBuilder(new SessionSigner(), () => Date.now());
  }

  public constructor(
    private sessionSigner: SessionSigner,
    private getNow: () => number,
  ) {}

  public build(sessionId: string): string {
    let timestamp = millisecondsToSeconds(this.getNow());
    let signature = this.sessionSigner.sign(sessionId, timestamp);
    return `${sessionId}|${timestamp.toString(36)}|${signature}`;
  }
}

export class SessionExtractor {
  public static create(): SessionExtractor {
    return new SessionExtractor(new SessionSigner());
  }

  public constructor(private sessionSigner: SessionSigner) {}

  public extractSessionId(
    loggingPrefix: string,
    signedSession: string,
  ): string {
    if (typeof signedSession !== "string") {
      throw newUnauthorizedError(
        `${loggingPrefix} signedSession is not a string, but it's ${typeof signedSession}.`,
      );
    }

    let pieces = signedSession.split("|");
    if (pieces.length !== 3) {
      throw newUnauthorizedError("Invalid signed session string.");
    }
    let sessionId = pieces[0];
    let timestamp = Number.parseInt(pieces[1], 36);
    let signature = pieces[2];

    let signatureExpected = this.sessionSigner.sign(sessionId, timestamp);
    if (signature !== signatureExpected) {
      throw newUnauthorizedError("Invalid session signature");
    }
    return sessionId;
  }
}
