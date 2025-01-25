import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { Capabilities, CAPABILITIES } from '@phading/user_session_service_interface/capabilities';

export interface UserSession {
  sessionId?: string,
  userId?: string,
  accountId?: string,
  version?: number,
  capabilities?: Capabilities,
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
    name: 'version',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'capabilities',
    index: 5,
    messageType: CAPABILITIES,
  }, {
    name: 'createdTimeMs',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'renewedTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
