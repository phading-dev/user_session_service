import { UserSessionData, USER_SESSION_DATA } from './schema';
import { deserializeMessage, serializeMessage } from '@selfage/message/serializer';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';

export interface GetSessionRow {
  userSessionData: UserSessionData,
  userSessionRenewedTimestamp: number,
}

export let GET_SESSION_ROW: MessageDescriptor<GetSessionRow> = {
  name: 'GetSessionRow',
  fields: [{
    name: 'userSessionData',
    index: 1,
    messageType: USER_SESSION_DATA,
  }, {
    name: 'userSessionRenewedTimestamp',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSession(
  runner: Database | Transaction,
  userSessionSessionIdEq: string,
): Promise<Array<GetSessionRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserSession.data, UserSession.renewedTimestamp FROM UserSession WHERE UserSession.sessionId = @userSessionSessionIdEq",
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
      userSessionData: deserializeMessage(row.at(0).value, USER_SESSION_DATA),
      userSessionRenewedTimestamp: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function insertSessionStatement(
  sessionId: string,
  data: UserSessionData,
  createdTimestamp: number,
  renewedTimestamp: number,
): Statement {
  return {
    sql: "INSERT UserSession (sessionId, data, createdTimestamp, renewedTimestamp) VALUES (@sessionId, @data, @createdTimestamp, @renewedTimestamp)",
    params: {
      sessionId: sessionId,
      data: Buffer.from(serializeMessage(data, USER_SESSION_DATA).buffer),
      createdTimestamp: new Date(createdTimestamp).toISOString(),
      renewedTimestamp: new Date(renewedTimestamp).toISOString(),
    },
    types: {
      sessionId: { type: "string" },
      data: { type: "bytes" },
      createdTimestamp: { type: "timestamp" },
      renewedTimestamp: { type: "timestamp" },
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
