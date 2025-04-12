import "../local/env";
import { BIGTABLE } from "./bigtable_client";
import { SESSION_LONGEVITY_MS } from "./constants";
import { SessionFetcher } from "./session_fetcher";
import { SessionExtractorMock } from "./session_signer_mock";
import { newUnauthorizedError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { assertReject, assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SessionFetcherTest",
  cases: [
    {
      name: "CheckCanConsume_CheckCanPublish_CheckCanBeBilled_CheckCanEarn_AuthOnly",
      execute: async () => {
        // Prepare
        await BIGTABLE.insert({
          key: "u#session1",
          data: {
            u: {
              u: {
                value: "user1",
              },
              a: {
                value: "account1",
              },
              t: {
                value: 100,
              },
              cs: {
                value: "",
              },
              pb: {
                value: "1",
              },
              bl: {
                value: "",
              },
              er: {
                value: "1",
              },
            },
          },
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let fetcher = new SessionFetcher(BIGTABLE, extractorMock, () => 1000);

        // Execute
        let response = await fetcher.fetch("", {
          signedSession: "signed1",
          capabilitiesMask: {
            checkCanConsume: true,
          },
        });

        // Verify
        assertThat(
          extractorMock.signedSession,
          eq("signed1"),
          "signed session",
        );
        assertThat(response.userId, eq("user1"), "response.userId");
        assertThat(response.accountId, eq("account1"), "response.accountId");
        assertThat(
          response.capabilities.canConsume,
          eq(false),
          "response.capabilities.canConsume",
        );

        // Execute
        response = await fetcher.fetch("", {
          signedSession: "signed1",
          capabilitiesMask: {
            checkCanPublish: true,
          },
        });

        // Verify
        assertThat(
          response.capabilities.canPublish,
          eq(true),
          "response.capabilities.canPublish",
        );

        // Execute
        response = await fetcher.fetch("", {
          signedSession: "signed1",
          capabilitiesMask: {
            checkCanBeBilled: true,
          },
        });

        // Verify
        assertThat(
          response.capabilities.canBeBilled,
          eq(false),
          "response.capabilities.canBeBilled",
        );

        // Execute
        response = await fetcher.fetch("", {
          signedSession: "signed1",
          capabilitiesMask: {
            checkCanEarn: true,
          },
        });

        // Verify
        assertThat(
          response.capabilities.canEarn,
          eq(true),
          "response.capabilities.canEarn",
        );

        // Execute
        response = await fetcher.fetch("", {
          signedSession: "signed1",
          capabilitiesMask: {
            checkCanBeBilled: true,
          },
        });

        // Verify no error thrown
      },
      tearDown: async () => {
        await BIGTABLE.deleteRows("u");
      },
    },
    {
      name: "SessionNotFound",
      execute: async () => {
        // Prepare
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let fetcher = new SessionFetcher(BIGTABLE, extractorMock, () => 1000);

        // Execute
        let error = await assertReject(
          fetcher.fetch("", {
            signedSession: "signed1",
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newUnauthorizedError("Session not found")),
          "error",
        );
      },
      tearDown: async () => {
        await BIGTABLE.deleteRows("u");
      },
    },
    {
      name: "SessionExpired",
      execute: async () => {
        // Prepare
        await BIGTABLE.insert({
          key: "u#session1",
          data: {
            u: {
              u: {
                value: "user1",
              },
              a: {
                value: "account1",
              },
              t: {
                value: 100,
              },
              cs: {
                value: "",
              },
              pb: {
                value: "1",
              },
              bl: {
                value: "",
              },
              er: {
                value: "1",
              },
            },
          },
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let fetcher = new SessionFetcher(
          BIGTABLE,
          extractorMock,
          () => 1000 + SESSION_LONGEVITY_MS,
        );

        // Execute
        let error = await assertReject(
          fetcher.fetch("", {
            signedSession: "signed1",
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newUnauthorizedError("Session expired")),
          "error",
        );
      },
      tearDown: async () => {
        await BIGTABLE.deleteRows("u");
      },
    },
  ],
});
