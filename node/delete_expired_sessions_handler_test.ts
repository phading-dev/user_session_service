import "../local/env";
import { BIGTABLE } from "../common/bigtable_client";
import { SESSION_LONGEVITY_MS } from "../common/constants";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  deleteUserSessionStatement,
  getUserSession,
  insertUserSessionStatement,
} from "../db/sql";
import { DeleteExpiredSessionsHandler } from "./delete_expired_sessions_handler";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DeleteExpiredSessionsHandlerTest",
  cases: [
    {
      name: "DeleteExpiredSessions",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              renewedTimeMs: 1000,
            }),
            insertUserSessionStatement({
              sessionId: "session2",
              renewedTimeMs: 2000,
            }),
            insertUserSessionStatement({
              sessionId: "session3",
              renewedTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert([
          {
            key: "u#session1",
            data: {
              u: {
                r: {
                  // Randome column
                  value: 1,
                },
              },
            },
          },
          {
            key: "u#session2",
            data: {
              u: {
                r: {
                  // Randome column
                  value: 1,
                },
              },
            },
          },
          {
            key: "u#session3",
            data: {
              u: {
                r: {
                  // Randome column
                  value: 1,
                },
              },
            },
          },
        ]);
        let handler = new DeleteExpiredSessionsHandler(
          SPANNER_DATABASE,
          BIGTABLE,
          () => 3000 + SESSION_LONGEVITY_MS,
        );

        // Execute
        await handler.handle("", {});

        // Verify
        assertThat(
          (
            await getUserSession(SPANNER_DATABASE, {
              userSessionSessionIdEq: "session1",
            })
          ).length,
          eq(0),
          "session1",
        );
        assertThat(
          (
            await getUserSession(SPANNER_DATABASE, {
              userSessionSessionIdEq: "session2",
            })
          ).length,
          eq(0),
          "session2",
        );
        assertThat(
          (
            await getUserSession(SPANNER_DATABASE, {
              userSessionSessionIdEq: "session3",
            })
          ).length,
          eq(1),
          "session3",
        );
        assertThat(
          (
            await BIGTABLE.getRows({
              keys: ["u#session1"],
            })
          )[0].length,
          eq(0),
          "u#session1",
        );
        assertThat(
          (
            await BIGTABLE.getRows({
              keys: ["u#session2"],
            })
          )[0].length,
          eq(0),
          "u#session2",
        );
        assertThat(
          (
            await BIGTABLE.getRows({
              keys: ["u#session3"],
            })
          )[0].length,
          eq(1),
          "u#session3",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement({ userSessionSessionIdEq: "session1" }),
            deleteUserSessionStatement({ userSessionSessionIdEq: "session2" }),
            deleteUserSessionStatement({ userSessionSessionIdEq: "session3" }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.deleteRows("u");
      },
    },
  ],
});
