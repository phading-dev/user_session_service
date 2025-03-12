import "../local/env";
import { BIGTABLE } from "../common/bigtable_client";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  deleteUserSessionStatement,
  insertUserSessionStatement,
} from "../db/sql";
import { UpdateAccountCapabilitiesHandler } from "./update_account_capabilities_handler";
import { assertThat, eq } from "@selfage/test_matcher";
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
              userId: "user1",
              accountId: "account1",
              renewedTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert({
          key: "u#session1",
          data: {
            u: {
              v: {
                value: 1,
              },
              cs: {
                value: "1",
              },
            },
          },
        });
        let handler = new UpdateAccountCapabilitiesHandler(
          SPANNER_DATABASE,
          BIGTABLE,
        );

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsume: false,
          },
        });

        // Verify
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["v"][0].value,
          eq(2),
          "version",
        );
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["cs"][0].value,
          eq(""),
          "canConsume",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement("session1"),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.deleteRows("u");
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
              userId: "user1",
              accountId: "account1",
              renewedTimeMs: 100,
            }),
            insertUserSessionStatement({
              sessionId: "session2",
              userId: "user1",
              accountId: "account1",
              renewedTimeMs: 800,
            }),
            insertUserSessionStatement({
              sessionId: "session3",
              userId: "user1",
              accountId: "account1",
              renewedTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert([
          {
            key: "u#session1",
            data: {
              u: {
                v: {
                  value: 1,
                },
                cs: {
                  value: "1",
                },
              },
            },
          },
          {
            key: "u#session2",
            data: {
              u: {
                v: {
                  value: 2,
                },
                cs: {
                  value: "1",
                },
              },
            },
          },
          {
            key: "u#session3",
            data: {
              u: {
                v: {
                  value: 1,
                },
                cs: {
                  value: "1",
                },
              },
            },
          },
        ]);
        let handler = new UpdateAccountCapabilitiesHandler(
          SPANNER_DATABASE,
          BIGTABLE,
        );

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsume: false,
          },
        });

        // Verify
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["v"][0].value,
          eq(2),
          "version 1",
        );
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["cs"][0].value,
          eq(""),
          "canConsume 1",
        );
        assertThat(
          (await BIGTABLE.row("u#session2").get())[0].data["u"]["v"][0].value,
          eq(2),
          "version 2",
        );
        assertThat(
          (await BIGTABLE.row("u#session2").get())[0].data["u"]["cs"][0].value,
          eq("1"),
          "canConsume 2",
        );
        assertThat(
          (await BIGTABLE.row("u#session3").get())[0].data["u"]["v"][0].value,
          eq(2),
          "version 3",
        );
        assertThat(
          (await BIGTABLE.row("u#session3").get())[0].data["u"]["cs"][0].value,
          eq(""),
          "canConsume 3",
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
        await BIGTABLE.deleteRows("u");
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
              userId: "user1",
              accountId: "account1",
              renewedTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert({
          key: "u#session1",
          data: {
            u: {
              v: {
                value: 1,
              },
              vv: { // Irrelevant column
                value: 1,
              },
              cs: {
                value: "1",
              },
            },
          },
        });
        // Overrides previous insert.
        await BIGTABLE.insert({
          key: "u#session1",
          data: {
            u: {
              v: {
                value: 3,
              },
              cs: {
                value: "1",
              },
            },
          },
        });
        let handler = new UpdateAccountCapabilitiesHandler(
          SPANNER_DATABASE,
          BIGTABLE,
        );

        // Execute
        await handler.handle("test", {
          accountId: "account1",
          capabilitiesVersion: 2,
          capabilities: {
            canConsume: false,
          },
        });

        // Verify
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["v"][0].value,
          eq(3),
          "version",
        );
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["cs"][0].value,
          eq("1"),
          "canConsume",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteUserSessionStatement("session1"),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.deleteRows("u");
      },
    },
  ],
});
