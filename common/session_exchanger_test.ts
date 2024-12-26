import { USER_SESSION } from "../db/schema";
import {
  deleteUserSessionStatement,
  getUserSession,
  insertUserSessionStatement,
} from "../db/sql";
import { SESSION_LONGEVITY_MS } from "./params";
import { SessionExchanger } from "./session_exchanger";
import { SessionExtractorMock } from "./session_signer_mock";
import { SPANNER_DATABASE } from "./spanner_client";
import { newUnauthorizedError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SessionExchangerTest",
  cases: [
    {
      name: "CheckCanConsume_CheckCanPublish",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              userId: "user1",
              accountId: "account1",
              canConsumeShows: false,
              canPublishShows: false,
              createdTimeMs: 100,
              renewedTimeMs: 400,
            }),
          ]);
          await transaction.commit();
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let exchanger = new SessionExchanger(
          SPANNER_DATABASE,
          extractorMock,
          () => 1000,
        );

        // Execute
        let response = await exchanger.exchange("", {
          signedSession: "signed1",
          checkCanConsumeShows: true,
        });

        // Verify
        assertThat(
          extractorMock.signedSession,
          eq("signed1"),
          "signed session",
        );
        assertThat(
          response,
          eqMessage(
            {
              sessionId: "session1",
              userId: "user1",
              accountId: "account1",
              canConsumeShows: false,
            },
            USER_SESSION,
          ),
          "response",
        );

        // Execute
        response = await exchanger.exchange("", {
          signedSession: "signed1",
          checkCanPublishShows: true,
        });

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              sessionId: "session1",
              userId: "user1",
              accountId: "account1",
              canPublishShows: false,
            },
            USER_SESSION,
          ),
          "response 2",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement("session1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SessionNotFound",
      execute: async () => {
        // Prepare
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let exchanger = new SessionExchanger(
          SPANNER_DATABASE,
          extractorMock,
          () => 500,
        );

        // Execute
        let error = await assertReject(
          exchanger.exchange("", {
            signedSession: "signed1",
            checkCanConsumeShows: true,
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newUnauthorizedError("Session not found")),
          "error",
        );
      },
      tearDown: async () => {},
    },
    {
      name: "SessionExpiredAndCleanedUp",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              userId: "user1",
              accountId: "account1",
              canConsumeShows: false,
              canPublishShows: false,
              createdTimeMs: 100,
              renewedTimeMs: 400,
            }),
          ]);
          await transaction.commit();
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let exchanger = new SessionExchanger(
          SPANNER_DATABASE,
          extractorMock,
          () => 500 + SESSION_LONGEVITY_MS,
        );

        // Execute
        let cleanedUpPromise = new Promise<void>((resolve) =>
          exchanger.once("cleanedUp", resolve),
        );
        let error = await assertReject(
          exchanger.exchange("", {
            signedSession: "signed1",
            checkCanConsumeShows: true,
          }),
        );
        await cleanedUpPromise;

        // Verify
        assertThat(
          error,
          eqHttpError(newUnauthorizedError("Session expired")),
          "error",
        );
        assertThat(
          (await getUserSession(SPANNER_DATABASE, "session1")).length,
          eq(0),
          "session deleted",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement("session1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
