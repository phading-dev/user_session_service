import { SessionBuilderMock } from "../common/session_signer_mock";
import { SPANNER_DATABASE } from "../common/spanner_client";
import { GET_SESSION_ROW, deleteSessionStatement, getSession } from "../db/sql";
import { CreateSessionHandler } from "./create_session_handler";
import {
  AccountType,
  CREATE_SESSION_RESPONSE,
} from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CreateSessionHandlerTest",
  cases: [
    {
      name: "ForConsumer",
      execute: async () => {
        // Prepare
        let builderMock = new SessionBuilderMock();
        builderMock.signedSession = "signed_session";
        let handler = new CreateSessionHandler(
          SPANNER_DATABASE,
          builderMock,
          () => "id1",
          () => 1000,
        );

        // Execute
        let response = await handler.handle("", {
          userId: "user1",
          accountId: "account1",
          accountType: AccountType.CONSUMER,
        });

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              signedSession: "signed_session",
            },
            CREATE_SESSION_RESPONSE,
          ),
          "resposne",
        );
        assertThat(
          await getSession(SPANNER_DATABASE, "id1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "id1",
                  userId: "user1",
                  accountId: "account1",
                  canConsumeShows: true,
                  canPublishShows: false,
                  createdTimeMs: 1000,
                  renewedTimeMs: 1000,
                },
              },
              GET_SESSION_ROW,
            ),
          ]),
          "session",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSessionStatement("id1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "ForPublisher",
      execute: async () => {
        // Prepare
        let builderMock = new SessionBuilderMock();
        builderMock.signedSession = "signed_session";
        let handler = new CreateSessionHandler(
          SPANNER_DATABASE,
          builderMock,
          () => "id1",
          () => 1000,
        );

        // Execute
        let response = await handler.handle("", {
          userId: "user1",
          accountId: "account1",
          accountType: AccountType.PUBLISHER,
        });

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              signedSession: "signed_session",
            },
            CREATE_SESSION_RESPONSE,
          ),
          "resposne",
        );
        assertThat(
          await getSession(SPANNER_DATABASE, "id1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "id1",
                  userId: "user1",
                  accountId: "account1",
                  canConsumeShows: false,
                  canPublishShows: true,
                  createdTimeMs: 1000,
                  renewedTimeMs: 1000,
                },
              },
              GET_SESSION_ROW,
            ),
          ]),
          "session",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSessionStatement("id1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
