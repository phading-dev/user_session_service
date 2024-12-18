import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';

export interface GetSessionRow {
  userSessionUserId: string,
  userSessionAccountId: string,
  userSessionRenewedTimestamp: number,
  userSessionCanPublishShows: boolean,
  userSessionCanConsumeShows: boolean,
}

export let GET_SESSION_ROW: MessageDescriptor<GetSessionRow> = {
  name: 'GetSessionRow',
  fields: [{
    name: 'userSessionUserId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userSessionAccountId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userSessionRenewedTimestamp',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'userSessionCanPublishShows',
    index: 4,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'userSessionCanConsumeShows',
    index: 5,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};

export async function getSession(
  runner: Database | Transaction,
  userSessionSessionIdEq: string,
): Promise<Array<GetSessionRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.userId, UserSession.accountId, UserSession.renewedTimestamp, UserSession.canPublishShows, UserSession.canConsumeShows FROM UserSession WHERE UserSession.sessionId = @userSessionSessionIdEq",
    params: {
      userSessionSessionIdEq: userSessionSessionIdEq,
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSessionRow>();
  for (let row of rows) {
    resRows.push({
      userSessionUserId: row.at(0).value,
      userSessionAccountId: row.at(1).value,
      userSessionRenewedTimestamp: row.at(2).value.valueOf(),
      userSessionCanPublishShows: row.at(3).value,
      userSessionCanConsumeShows: row.at(4).value,
    });
  }
  return resRows;
}

export function insertSessionStatement(
  sessionId: string,
  userId: string,
  accountId: string,
  createdTimestamp: number,
  renewedTimestamp: number,
  canPublishShows: boolean,
  canConsumeShows: boolean,
): Statement {
  return {
    sql: "INSERT UserSession (sessionId, userId, accountId, createdTimestamp, renewedTimestamp, canPublishShows, canConsumeShows) VALUES (@sessionId, @userId, @accountId, @createdTimestamp, @renewedTimestamp, @canPublishShows, @canConsumeShows)",
    params: {
      sessionId: sessionId,
      userId: userId,
      accountId: accountId,
      createdTimestamp: new Date(createdTimestamp).toISOString(),
      renewedTimestamp: new Date(renewedTimestamp).toISOString(),
      canPublishShows: canPublishShows,
      canConsumeShows: canConsumeShows,
    },
    types: {
      sessionId: { type: "string" },
      userId: { type: "string" },
      accountId: { type: "string" },
      createdTimestamp: { type: "timestamp" },
      renewedTimestamp: { type: "timestamp" },
      canPublishShows: { type: "bool" },
      canConsumeShows: { type: "bool" },
    }
  };
}

export function updateRenewedTimestampStatement(
  userSessionSessionIdEq: string,
  setRenewedTimestamp: number,
): Statement {
  return {
    sql: "UPDATE UserSession SET renewedTimestamp = @setRenewedTimestamp WHERE UserSession.sessionId = @userSessionSessionIdEq",
    params: {
      userSessionSessionIdEq: userSessionSessionIdEq,
      setRenewedTimestamp: new Date(setRenewedTimestamp).toISOString(),
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
      setRenewedTimestamp: { type: "timestamp" },
    }
  };
}

export function deleteSessionStatement(
  userSessionSessionIdEq: string,
): Statement {
  return {
    sql: "DELETE UserSession WHERE UserSession.sessionId = @userSessionSessionIdEq",
    params: {
      userSessionSessionIdEq: userSessionSessionIdEq,
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
    }
  };
}

export function deleteExpiredSessionStatement(
  userSessionRenewedTimestampLt: number,
): Statement {
  return {
    sql: "DELETE UserSession WHERE UserSession.renewedTimestamp < @userSessionRenewedTimestampLt",
    params: {
      userSessionRenewedTimestampLt: new Date(userSessionRenewedTimestampLt).toISOString(),
    },
    types: {
      userSessionRenewedTimestampLt: { type: "timestamp" },
    }
  };
}
