import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { UserSession, USER_SESSION } from './schema';
import { serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { MessageDescriptor } from '@selfage/message/descriptor';

export function insertUserSessionStatement(
  data: UserSession,
): Statement {
  return insertUserSessionInternalStatement(
    data.sessionId,
    data.accountId,
    data.renewedTimeMs,
    data
  );
}

export function insertUserSessionInternalStatement(
  sessionId: string,
  accountId: string,
  renewedTimeMs: number,
  data: UserSession,
): Statement {
  return {
    sql: "INSERT UserSession (sessionId, accountId, renewedTimeMs, data) VALUES (@sessionId, @accountId, @renewedTimeMs, @data)",
    params: {
      sessionId: sessionId,
      accountId: accountId,
      renewedTimeMs: Spanner.float(renewedTimeMs),
      data: Buffer.from(serializeMessage(data, USER_SESSION).buffer),
    },
    types: {
      sessionId: { type: "string" },
      accountId: { type: "string" },
      renewedTimeMs: { type: "float64" },
      data: { type: "bytes" },
    }
  };
}

export interface GetUserSessionRow {
  userSessionData: UserSession,
}

export let GET_USER_SESSION_ROW: MessageDescriptor<GetUserSessionRow> = {
  name: 'GetUserSessionRow',
  fields: [{
    name: 'userSessionData',
    index: 1,
    messageType: USER_SESSION,
  }],
};

export async function getUserSession(
  runner: Database | Transaction,
  userSessionSessionIdEq: string,
): Promise<Array<GetUserSessionRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.data FROM UserSession WHERE (UserSession.sessionId = @userSessionSessionIdEq)",
    params: {
      userSessionSessionIdEq: userSessionSessionIdEq,
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetUserSessionRow>();
  for (let row of rows) {
    resRows.push({
      userSessionData: deserializeMessage(row.at(0).value, USER_SESSION),
    });
  }
  return resRows;
}

export function updateUserSessionStatement(
  data: UserSession,
): Statement {
  return updateUserSessionInternalStatement(
    data.sessionId,
    data.accountId,
    data.renewedTimeMs,
    data
  );
}

export function updateUserSessionInternalStatement(
  userSessionSessionIdEq: string,
  setAccountId: string,
  setRenewedTimeMs: number,
  setData: UserSession,
): Statement {
  return {
    sql: "UPDATE UserSession SET accountId = @setAccountId, renewedTimeMs = @setRenewedTimeMs, data = @setData WHERE (UserSession.sessionId = @userSessionSessionIdEq)",
    params: {
      userSessionSessionIdEq: userSessionSessionIdEq,
      setAccountId: setAccountId,
      setRenewedTimeMs: Spanner.float(setRenewedTimeMs),
      setData: Buffer.from(serializeMessage(setData, USER_SESSION).buffer),
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
      setAccountId: { type: "string" },
      setRenewedTimeMs: { type: "float64" },
      setData: { type: "bytes" },
    }
  };
}

export function deleteUserSessionStatement(
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
  userSessionRenewedTimeMsLt: number,
): Statement {
  return {
    sql: "DELETE UserSession WHERE UserSession.renewedTimeMs < @userSessionRenewedTimeMsLt",
    params: {
      userSessionRenewedTimeMsLt: Spanner.float(userSessionRenewedTimeMsLt),
    },
    types: {
      userSessionRenewedTimeMsLt: { type: "float64" },
    }
  };
}

export interface ListSessionsByAccountIdRow {
  userSessionData: UserSession,
}

export let LIST_SESSIONS_BY_ACCOUNT_ID_ROW: MessageDescriptor<ListSessionsByAccountIdRow> = {
  name: 'ListSessionsByAccountIdRow',
  fields: [{
    name: 'userSessionData',
    index: 1,
    messageType: USER_SESSION,
  }],
};

export async function listSessionsByAccountId(
  runner: Database | Transaction,
  userSessionAccountIdEq: string,
): Promise<Array<ListSessionsByAccountIdRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.data FROM UserSession WHERE UserSession.accountId = @userSessionAccountIdEq",
    params: {
      userSessionAccountIdEq: userSessionAccountIdEq,
    },
    types: {
      userSessionAccountIdEq: { type: "string" },
    }
  });
  let resRows = new Array<ListSessionsByAccountIdRow>();
  for (let row of rows) {
    resRows.push({
      userSessionData: deserializeMessage(row.at(0).value, USER_SESSION),
    });
  }
  return resRows;
}
