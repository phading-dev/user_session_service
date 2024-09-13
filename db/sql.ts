import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';

export interface GetSessionRow {
  userSessionSessionId?: string,
  userSessionUserId?: string,
  userSessionAccountId?: string,
  userSessionRenewedTimestamp?: number,
  userSessionCanPublishShows?: boolean,
  userSessionCanConsumeShows?: boolean,
}

export async function getSession(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  userSessionSessionId: string,
): Promise<Array<GetSessionRow>> {
  let [rows] = await run({
    sql: "SELECT UserSession.sessionId, UserSession.userId, UserSession.accountId, UserSession.renewedTimestamp, UserSession.canPublishShows, UserSession.canConsumeShows FROM UserSession WHERE UserSession.sessionId = @userSessionSessionId",
    params: {
      userSessionSessionId: userSessionSessionId,
    },
    types: {
      userSessionSessionId: { type: "string" },
    }
  });
  let resRows = new Array<GetSessionRow>();
  for (let row of rows) {
    resRows.push({
      userSessionSessionId: row.at(0).value == null ? undefined : row.at(0).value,
      userSessionUserId: row.at(1).value == null ? undefined : row.at(1).value,
      userSessionAccountId: row.at(2).value == null ? undefined : row.at(2).value,
      userSessionRenewedTimestamp: row.at(3).value == null ? undefined : row.at(3).value.getMicroseconds(),
      userSessionCanPublishShows: row.at(4).value == null ? undefined : row.at(4).value,
      userSessionCanConsumeShows: row.at(5).value == null ? undefined : row.at(5).value,
    });
  }
  return resRows;
}

export async function insertSession(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  sessionId: string,
  userId: string,
  accountId: string,
  canPublishShows: boolean,
  canConsumeShows: boolean,
): Promise<void> {
  await run({
    sql: "INSERT UserSession (sessionId, userId, accountId, createdTimestamp, renewedTimestamp, canPublishShows, canConsumeShows) VALUES (@sessionId, @userId, @accountId, PENDING_COMMIT_TIMESTAMP(), PENDING_COMMIT_TIMESTAMP(), @canPublishShows, @canConsumeShows)",
    params: {
      sessionId: sessionId,
      userId: userId,
      accountId: accountId,
      canPublishShows: canPublishShows,
      canConsumeShows: canConsumeShows,
    },
    types: {
      sessionId: { type: "string" },
      userId: { type: "string" },
      accountId: { type: "string" },
      canPublishShows: { type: "bool" },
      canConsumeShows: { type: "bool" },
    }
  });
}

export async function updateRenewedTimestamp(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  userSessionSessionId: string,
): Promise<void> {
  await run({
    sql: "UPDATE UserSession SET renewedTimestamp = PENDING_COMMIT_TIMESTAMP() WHERE UserSession.sessionId = @userSessionSessionId",
    params: {
      userSessionSessionId: userSessionSessionId,
    },
    types: {
      userSessionSessionId: { type: "string" },
    }
  });
}

export async function deleteSession(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  userSessionSessionId: string,
): Promise<void> {
  await run({
    sql: "DELETE UserSession WHERE UserSession.sessionId = @userSessionSessionId",
    params: {
      userSessionSessionId: userSessionSessionId,
    },
    types: {
      userSessionSessionId: { type: "string" },
    }
  });
}
