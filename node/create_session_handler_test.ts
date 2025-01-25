import { SessionBuilderMock } from "../common/session_signer_mock";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  GET_USER_SESSION_ROW,
  deleteUserSessionStatement,
  getUserSession,
} from "../db/sql";
import { CreateSessionHandler } from "./create_session_handler";
import { CREATE_SESSION_RESPONSE } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CreateSessionHandlerTest",
  cases: [
    {
      name: "Default",
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
          version: 1,
          capabilities: {
            canConsumeShows: true,
            canPublishShows: false,
          },
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
          await getUserSession(SPANNER_DATABASE, "id1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "id1",
                  userId: "user1",
                  accountId: "account1",
                  version: 1,
                  capabilities: {
                    canConsumeShows: true,
                    canPublishShows: false,
                  },
                  createdTimeMs: 1000,
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
          await transaction.batchUpdate([deleteUserSessionStatement("id1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
