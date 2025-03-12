import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface UserSession {
  sessionId?: string,
  userId?: string,
  accountId?: string,
  createdTimeMs?: number,
  renewedTimeMs?: number,
}

export let USER_SESSION: MessageDescriptor<UserSession> = {
  name: 'UserSession',
  fields: [{
    name: 'sessionId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'accountId',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'createdTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'renewedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
