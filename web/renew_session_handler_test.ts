import { SessionExchanger } from "../common/session_exchanger";
import { SessionExtractorMock } from "../common/session_signer_mock";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  GET_SESSION_ROW,
  deleteSessionStatement,
  getSession,
  insertSessionStatement,
} from "../db/sql";
import { RenewSessionHandler } from "./renew_session_handler";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
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
            insertSessionStatement(
              "session1",
              {
                userId: "user1",
                accountId: "account1",
                canConsumeShows: false,
                canPublishShows: false,
              },
              100,
              100,
            ),
          ]);
          await transaction.commit();
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          new SessionExchanger(SPANNER_DATABASE, extractorMock, () => 1000),
          () => 1000,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          await getSession(SPANNER_DATABASE, "session1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  userId: "user1",
                  accountId: "account1",
                  canConsumeShows: false,
                  canPublishShows: false,
                },
                userSessionRenewedTimestamp: 1000,
              },
              GET_SESSION_ROW,
            ),
          ]),
          "session",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSessionStatement("session1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
