import { SessionBuilder, SessionExtractor } from "./session_signer";
import { newUnauthorizedError } from "@selfage/http_error";
import { assertThat, assertThrow, eq, eqError } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SessionSignerTest",
  cases: [
    {
      name: "BuildAndExtract",
      execute: () => {
        // Prepare
        let builder = SessionBuilder.create();
        let extractor = SessionExtractor.create();
        let sessionId = "s1";

        // Execute
        let signedSession = builder.build(sessionId);
        let extractedSession = extractor.extractSessionId("", signedSession);

        // Verify
        assertThat(extractedSession, eq(sessionId), "session id");
      },
    },
    {
      name: "ExtractWithEmptySession",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();

        // Execute
        let error = assertThrow(() =>
          extractor.extractSessionId("", undefined),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("is not a string")),
          "missing error",
        );
      },
    },
    {
      name: "ExtractWithInvalidSignature",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();
        let incorrectSignedSession = "some random string|12313|some signature";

        // Execute
        let error = assertThrow(() =>
          extractor.extractSessionId("", incorrectSignedSession),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("signature")),
          "signature error",
        );
      },
    },
  ],
});
