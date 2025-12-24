import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import type { SatimConfig } from '../src/types.js';

/**
 * Test configuration factory
 */
export function createTestConfig(overrides: Partial<SatimConfig> = {}): SatimConfig {
  return {
    userName: 'test_user',
    password: 'test_password',
    terminalId: 'E010TEST01',
    apiBaseUrl: 'https://test.satim.dz/payment/rest',
    language: 'fr',
    currency: '012',
    http: {
      method: 'POST',
      timeoutMs: 5000,
    },
    logger: {
      enableDevLogging: false, // Disable logging in tests
    },
    ...overrides,
  };
}

/**
 * Creates a mock agent for testing HTTP requests
 */
export function createMockAgent(): MockAgent {
  const agent = new MockAgent();
  agent.disableNetConnect();
  return agent;
}

/**
 * Sets up mock agent as global dispatcher
 */
export function setupMockAgent(agent: MockAgent): Dispatcher {
  const originalDispatcher = getGlobalDispatcher();
  setGlobalDispatcher(agent);
  return originalDispatcher;
}

/**
 * Restores original dispatcher
 */
export function restoreDispatcher(dispatcher: Dispatcher): void {
  setGlobalDispatcher(dispatcher);
}

/**
 * Helper to create mock pool for a specific origin
 */
export function mockPool(agent: MockAgent, origin: string) {
  return agent.get(origin);
}

/**
 * Standard successful register response
 */
export const MOCK_REGISTER_SUCCESS = {
  errorCode: 0,
  orderId: 'V721uPPfNNofVQAAABL3',
  formUrl: 'https://test.satim.dz/payment/epg/merchants/merchantsatim/payment.html?mdOrder=V721uPPfNNofVQAAABL3&language=fr',
};

/**
 * Standard successful confirm response
 */
export const MOCK_CONFIRM_SUCCESS = {
  expiration: '202701',
  cardholderName: 'TEST USER',
  depositAmount: 100320,
  currency: '012',
  authorizationResponseId: '913180',
  approvalCode: '913180',
  actionCode: 0,
  actionCodeDescription: 'Votre paiement a été accepté',
  ErrorCode: '0',
  ErrorMessage: 'Success',
  OrderStatus: 2,
  OrderNumber: 'CMD0000004',
  Pan: '6280****7215',
  Amount: 100320,
  Ip: '10.12.12.14',
  params: {
    respCode_desc: 'Votre paiement a été accepté',
    udf1: 'Bill00001',
    respCode: '00',
  },
  SvfeResponse: '00',
};

/**
 * Standard successful refund response
 */
export const MOCK_REFUND_SUCCESS = {
  errorCode: 0,
};

/**
 * Parse URL-encoded body from request
 */
export function parseFormBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}
