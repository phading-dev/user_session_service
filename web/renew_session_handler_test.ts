import { SESSION_LONGEVITY_MS } from "../common/params";
import { SessionExtractorMock } from "../common/session_signer_mock";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  GET_USER_SESSION_ROW,
  deleteUserSessionStatement,
  getUserSession,
  insertUserSessionStatement,
} from "../db/sql";
import { RenewSessionHandler } from "./renew_session_handler";
import { newNotFoundError, newUnauthorizedError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "RenewSessionHandlerTest",
  cases: [
    {
      name: "Success",
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
              renewedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          extractorMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session1",
                  userId: "user1",
                  accountId: "account1",
                  canConsumeShows: false,
                  canPublishShows: false,
                  createdTimeMs: 100,
                  renewedTimeMs: 1000,
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "session",
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
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          extractorMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", {}, "signed_session"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newNotFoundError("Session not found")),
          "error",
        );
      },
    },
    {
      name: "SessionExpired",
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
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          extractorMock,
          () => 500 + SESSION_LONGEVITY_MS,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", {}, "signed_session"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newUnauthorizedError("Session expired")),
          "error",
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
