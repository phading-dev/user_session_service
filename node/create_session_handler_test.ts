import "../local/env";
import { BIGTABLE } from "../common/bigtable_client";
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
import { assertThat, eq, isArray } from "@selfage/test_matcher";
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
          BIGTABLE,
          builderMock,
          () => "id1",
          () => 1000,
        );

        // Execute
        let response = await handler.handle("", {
          userId: "user1",
          accountId: "account1",
          capabilitiesVersion: 1,
          capabilities: {
            canConsume: true,
            canPublish: false,
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
                  createdTimeMs: 1000,
                  renewedTimeMs: 1000,
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "session",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["u"][0].value,
          eq("user1"),
          "userId",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["a"][0].value,
          eq("account1"),
          "accountId",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["t"][0].value,
          eq(1000),
          "timeMs",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["v"][0].value,
          eq(1),
          "version",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["cs"][0].value,
          eq("1"),
          "canConsume",
        );
        assertThat(
          (await BIGTABLE.row("u#id1").get())[0].data["u"]["pb"][0].value,
          eq(""),
          "canPublish",
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
