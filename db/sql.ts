import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertUserSessionStatement(
  args: {
    sessionId: string,
    userId?: string,
    accountId?: string,
    createdTimeMs?: number,
    renewedTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT UserSession (sessionId, userId, accountId, createdTimeMs, renewedTimeMs) VALUES (@sessionId, @userId, @accountId, @createdTimeMs, @renewedTimeMs)",
    params: {
      sessionId: args.sessionId,
      userId: args.userId == null ? null : args.userId,
      accountId: args.accountId == null ? null : args.accountId,
      createdTimeMs: args.createdTimeMs == null ? null : Spanner.float(args.createdTimeMs),
      renewedTimeMs: args.renewedTimeMs == null ? null : Spanner.float(args.renewedTimeMs),
    },
    types: {
      sessionId: { type: "string" },
      userId: { type: "string" },
      accountId: { type: "string" },
      createdTimeMs: { type: "float64" },
      renewedTimeMs: { type: "float64" },
    }
  };
}

export function deleteUserSessionStatement(
  args: {
    userSessionSessionIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE UserSession WHERE (UserSession.sessionId = @userSessionSessionIdEq)",
    params: {
      userSessionSessionIdEq: args.userSessionSessionIdEq,
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
    }
  };
}

export interface GetUserSessionRow {
  userSessionSessionId?: string,
  userSessionUserId?: string,
  userSessionAccountId?: string,
  userSessionCreatedTimeMs?: number,
  userSessionRenewedTimeMs?: number,
}

export let GET_USER_SESSION_ROW: MessageDescriptor<GetUserSessionRow> = {
  name: 'GetUserSessionRow',
  fields: [{
    name: 'userSessionSessionId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userSessionUserId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userSessionAccountId',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userSessionCreatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'userSessionRenewedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getUserSession(
  runner: Database | Transaction,
  args: {
    userSessionSessionIdEq: string,
  }
): Promise<Array<GetUserSessionRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.sessionId, UserSession.userId, UserSession.accountId, UserSession.createdTimeMs, UserSession.renewedTimeMs FROM UserSession WHERE (UserSession.sessionId = @userSessionSessionIdEq)",
    params: {
      userSessionSessionIdEq: args.userSessionSessionIdEq,
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetUserSessionRow>();
  for (let row of rows) {
    resRows.push({
      userSessionSessionId: row.at(0).value == null ? undefined : row.at(0).value,
      userSessionUserId: row.at(1).value == null ? undefined : row.at(1).value,
      userSessionAccountId: row.at(2).value == null ? undefined : row.at(2).value,
      userSessionCreatedTimeMs: row.at(3).value == null ? undefined : row.at(3).value.value,
      userSessionRenewedTimeMs: row.at(4).value == null ? undefined : row.at(4).value.value,
    });
  }
  return resRows;
}

export function updateUserSessionRenewedTimeStatement(
  args: {
    userSessionSessionIdEq: string,
    setRenewedTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE UserSession SET renewedTimeMs = @setRenewedTimeMs WHERE UserSession.sessionId = @userSessionSessionIdEq",
    params: {
      userSessionSessionIdEq: args.userSessionSessionIdEq,
      setRenewedTimeMs: args.setRenewedTimeMs == null ? null : Spanner.float(args.setRenewedTimeMs),
    },
    types: {
      userSessionSessionIdEq: { type: "string" },
      setRenewedTimeMs: { type: "float64" },
    }
  };
}

export function deleteExpiredSessionsStatement(
  args: {
    userSessionRenewedTimeMsLt?: number,
  }
): Statement {
  return {
    sql: "DELETE UserSession WHERE UserSession.renewedTimeMs < @userSessionRenewedTimeMsLt",
    params: {
      userSessionRenewedTimeMsLt: args.userSessionRenewedTimeMsLt == null ? null : Spanner.float(args.userSessionRenewedTimeMsLt),
    },
    types: {
      userSessionRenewedTimeMsLt: { type: "float64" },
    }
  };
}

export interface ListSessionsByAccountIdRow {
  userSessionSessionId?: string,
}

export let LIST_SESSIONS_BY_ACCOUNT_ID_ROW: MessageDescriptor<ListSessionsByAccountIdRow> = {
  name: 'ListSessionsByAccountIdRow',
  fields: [{
    name: 'userSessionSessionId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listSessionsByAccountId(
  runner: Database | Transaction,
  args: {
    userSessionAccountIdEq?: string,
  }
): Promise<Array<ListSessionsByAccountIdRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.sessionId FROM UserSession WHERE UserSession.accountId = @userSessionAccountIdEq",
    params: {
      userSessionAccountIdEq: args.userSessionAccountIdEq == null ? null : args.userSessionAccountIdEq,
    },
    types: {
      userSessionAccountIdEq: { type: "string" },
    }
  });
  let resRows = new Array<ListSessionsByAccountIdRow>();
  for (let row of rows) {
    resRows.push({
      userSessionSessionId: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface ListExpiredSessionsRow {
  userSessionSessionId?: string,
}

export let LIST_EXPIRED_SESSIONS_ROW: MessageDescriptor<ListExpiredSessionsRow> = {
  name: 'ListExpiredSessionsRow',
  fields: [{
    name: 'userSessionSessionId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listExpiredSessions(
  runner: Database | Transaction,
  args: {
    userSessionRenewedTimeMsLt?: number,
  }
): Promise<Array<ListExpiredSessionsRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.sessionId FROM UserSession WHERE UserSession.renewedTimeMs < @userSessionRenewedTimeMsLt",
    params: {
      userSessionRenewedTimeMsLt: args.userSessionRenewedTimeMsLt == null ? null : Spanner.float(args.userSessionRenewedTimeMsLt),
    },
    types: {
      userSessionRenewedTimeMsLt: { type: "float64" },
    }
  });
  let resRows = new Array<ListExpiredSessionsRow>();
  for (let row of rows) {
    resRows.push({
      userSessionSessionId: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}
