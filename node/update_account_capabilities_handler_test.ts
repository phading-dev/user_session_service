import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  GET_USER_SESSION_ROW,
  deleteUserSessionStatement,
  getUserSession,
  insertUserSessionStatement,
} from "../db/sql";
import { UpdateAccountCapabilitiesHandler } from "./update_account_capabilities_handler";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateAccountCapabilitiesHandlerTest",
  cases: [
    {
      name: "UpdateOneSession",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              accountId: "account1",
              renewedTimeMs: 1000,
              capabilitiesVersion: 1,
              capabilities: {
                canConsumeShows: true,
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new UpdateAccountCapabilitiesHandler(SPANNER_DATABASE);

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsumeShows: false,
          },
        });

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session1",
                  accountId: "account1",
                  renewedTimeMs: 1000,
                  capabilitiesVersion: 2,
                  capabilities: {
                    canConsumeShows: false,
                  },
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "getUserSession",
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
      name: "UpdateMultipleSessions",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              accountId: "account1",
              renewedTimeMs: 1000,
              capabilitiesVersion: 1,
              capabilities: {
                canConsumeShows: true,
              },
            }),
            insertUserSessionStatement({
              sessionId: "session2",
              accountId: "account1",
              renewedTimeMs: 1000,
              capabilitiesVersion: 2,
              capabilities: {
                canConsumeShows: true,
              },
            }),
            insertUserSessionStatement({
              sessionId: "session3",
              accountId: "account1",
              renewedTimeMs: 1000,
              capabilitiesVersion: 1,
              capabilities: {
                canConsumeShows: true,
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new UpdateAccountCapabilitiesHandler(SPANNER_DATABASE);

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsumeShows: false,
          },
        });

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session1",
                  accountId: "account1",
                  renewedTimeMs: 1000,
                  capabilitiesVersion: 2,
                  capabilities: {
                    canConsumeShows: false,
                  },
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "getUserSession",
        );
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session2"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session2",
                  accountId: "account1",
                  renewedTimeMs: 1000,
                  capabilitiesVersion: 2,
                  capabilities: {
                    canConsumeShows: true,
                  },
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "getUserSession 2",
        );
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session3"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session3",
                  accountId: "account1",
                  renewedTimeMs: 1000,
                  capabilitiesVersion: 2,
                  capabilities: {
                    canConsumeShows: false,
                  },
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "getUserSession 3",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement("session1"),
            deleteUserSessionStatement("session2"),
            deleteUserSessionStatement("session3"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "NoUpdates",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              accountId: "account1",
              renewedTimeMs: 1000,
              capabilitiesVersion: 3,
              capabilities: {
                canConsumeShows: true,
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new UpdateAccountCapabilitiesHandler(SPANNER_DATABASE);

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsumeShows: false,
          },
        });

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, "session1"),
          isArray([
            eqMessage(
              {
                userSessionData: {
                  sessionId: "session1",
                  accountId: "account1",
                  renewedTimeMs: 1000,
                  capabilitiesVersion: 3,
                  capabilities: {
                    canConsumeShows: true,
                  },
                },
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "getUserSession",
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
