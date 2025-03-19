import "../local/env";
import { BIGTABLE } from "../common/bigtable_client";
import { SESSION_LONGEVITY_MS } from "../common/constants";
import { SessionExtractorMock } from "../common/session_signer_mock";
import { SPANNER_DATABASE } from "../common/spanner_client";
import {
  GET_USER_SESSION_ROW,
  deleteUserSessionStatement,
  getUserSession,
  insertUserSessionStatement,
} from "../db/sql";
import { RenewSessionHandler } from "./renew_session_handler";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteUserSessionStatement({ userSessionSessionIdEq: "session1" }),
    ]);
    await transaction.commit();
  });
  await BIGTABLE.deleteRows(`u`);
}

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
              renewedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert({
          key: `u#session1`,
          data: {
            u: {
              t: {
                value: 100,
              },
            },
          },
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          BIGTABLE,
          extractorMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, {
            userSessionSessionIdEq: "session1",
          }),
          isArray([
            eqMessage(
              {
                userSessionSessionId: "session1",
                userSessionRenewedTimeMs: 1000,
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "session",
        );
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["t"][0].value,
          eq(1000),
          "timestamp",
        );
      },
      tearDown: async () => {
        await cleanupAll();
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
          BIGTABLE,
          extractorMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          (
            await BIGTABLE.getRows({
              keys: ["u#session1"],
            })
          )[0].length,
          eq(0),
          "no session",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
    {
      name: "SessionNotPresentInBigtable",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertUserSessionStatement({
              sessionId: "session1",
              renewedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          BIGTABLE,
          extractorMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          (
            await BIGTABLE.getRows({
              keys: ["u#session1"],
            })
          )[0].length,
          eq(0),
          "no session",
        );
      },
      tearDown: async () => {
        await cleanupAll();
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
              renewedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        await BIGTABLE.insert({
          key: `u#session1`,
          data: {
            u: {
              t: {
                value: 100,
              },
            },
          },
        });
        let extractorMock = new SessionExtractorMock();
        extractorMock.sessionId = "session1";
        let handler = new RenewSessionHandler(
          SPANNER_DATABASE,
          BIGTABLE,
          extractorMock,
          () => 1000 + SESSION_LONGEVITY_MS,
        );

        // Execute
        await handler.handle("", {}, "signed_session");

        // Verify
        assertThat(
          await getUserSession(SPANNER_DATABASE, {
            userSessionSessionIdEq: "session1",
          }),
          isArray([
            eqMessage(
              {
                userSessionSessionId: "session1",
                userSessionRenewedTimeMs: 100,
              },
              GET_USER_SESSION_ROW,
            ),
          ]),
          "session",
        );
        assertThat(
          (await BIGTABLE.row("u#session1").get())[0].data["u"]["t"][0].value,
          eq(100),
          "timestamp",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
  ],
});
