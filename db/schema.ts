import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface UserSessionData {
  userId?: string,
  accountId?: string,
  canPublishShows?: boolean,
  canConsumeShows?: boolean,
}

export let USER_SESSION_DATA: MessageDescriptor<UserSessionData> = {
  name: 'UserSessionData',
  fields: [{
    name: 'userId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'accountId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'canPublishShows',
    index: 3,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'canConsumeShows',
    index: 4,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};
