import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface RequestBody {
  signedSession?: string,
  checkCanConsumeShows?: boolean,
  checkCanPublishShows?: boolean,
}

export let REQUEST_BODY: MessageDescriptor<RequestBody> = {
  name: 'RequestBody',
  fields: [{
    name: 'signedSession',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'checkCanConsumeShows',
    index: 2,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'checkCanPublishShows',
    index: 3,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};

export interface Response {
  sessionId?: string,
  userId?: string,
  accountId?: string,
  canConsumeShows?: boolean,
  canPublishShows?: boolean,
}

export let RESPONSE: MessageDescriptor<Response> = {
  name: 'Response',
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
    name: 'canConsumeShows',
    index: 4,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'canPublishShows',
    index: 5,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};
