import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, type Dispatcher } from 'undici';
import { createSatimClient } from '../src/client.js';
import { interpretOrderStatus, OrderStatus } from '../src/types.js';
import { ValidationError, SatimApiError } from '../src/errors.js';
import {
  createTestConfig,
  createMockAgent,
  setupMockAgent,
  restoreDispatcher,
  mockPool,
  MOCK_CONFIRM_SUCCESS,
  parseFormBody,
} from './helpers.js';

describe('getOrderStatus', () => {
  let agent: MockAgent;
  let originalDispatcher: Dispatcher;

  beforeEach(() => {
    agent = createMockAgent();
    originalDispatcher = setupMockAgent(agent);
  });

  afterEach(async () => {
    restoreDispatcher(originalDispatcher);
    await agent.close();
  });

  describe('basic functionality', () => {
    it('should get order status successfully', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, MOCK_CONFIRM_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.isPaid()).toBe(true);
      expect(response.orderStatus).toBe(2);
    });

    it('should call the same endpoint as confirm', async () => {
      let capturedPath = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedPath = opts.path as string;
          return MOCK_CONFIRM_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(capturedPath).toBe('/payment/rest/public/acknowledgeTransaction.do');
    });

    it('should include correct parameters in request', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_CONFIRM_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.getOrderStatus('V721uPPfNNofVQAAABL3', 'en');

      const params = parseFormBody(capturedBody);
      expect(params['userName']).toBe('test_user');
      expect(params['password']).toBe('test_password');
      expect(params['mdOrder']).toBe('V721uPPfNNofVQAAABL3');
      expect(params['language']).toBe('en');
    });

    it('should use default language when not overridden', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_CONFIRM_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      const params = parseFormBody(capturedBody);
      expect(params['language']).toBe('fr');
    });
  });

  describe('returns same result as confirm', () => {
    it('should return identical response type', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, MOCK_CONFIRM_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        })
        .times(2);

      const client = createSatimClient(createTestConfig());
      const confirmResponse = await client.confirm('V721uPPfNNofVQAAABL3');
      const statusResponse = await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(statusResponse.errorCode).toBe(confirmResponse.errorCode);
      expect(statusResponse.orderStatus).toBe(confirmResponse.orderStatus);
      expect(statusResponse.orderNumber).toBe(confirmResponse.orderNumber);
      expect(statusResponse.isPaid()).toBe(confirmResponse.isPaid());
      expect(statusResponse.isSuccessful()).toBe(confirmResponse.isSuccessful());
    });
  });

  describe('order status checks', () => {
    it('should identify unpaid order', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ...MOCK_CONFIRM_SUCCESS, OrderStatus: 0 }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.isPaid()).toBe(false);
      expect(response.orderStatus).toBe(0);
    });

    it('should identify declined order', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ...MOCK_CONFIRM_SUCCESS, OrderStatus: 6 }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.isPaid()).toBe(false);
      expect(response.orderStatus).toBe(6);
    });

    it('should identify refunded order', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ...MOCK_CONFIRM_SUCCESS, OrderStatus: 4 }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.getOrderStatus('V721uPPfNNofVQAAABL3');

      expect(response.isPaid()).toBe(false);
      expect(response.orderStatus).toBe(4);
    });
  });

  describe('error handling', () => {
    it('should throw SatimApiError for error response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ErrorCode: 6, ErrorMessage: 'Unregistered order Id' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      await expect(
        client.getOrderStatus('INVALID_ORDER_ID')
      ).rejects.toThrow(SatimApiError);
    });

    it('should throw ValidationError for empty mdOrder', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(client.getOrderStatus('')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string mdOrder', async () => {
      const client = createSatimClient(createTestConfig());

      // @ts-expect-error Testing invalid input
      await expect(client.getOrderStatus(null)).rejects.toThrow(ValidationError);
    });
  });
});

describe('interpretOrderStatus', () => {
  it('should interpret REGISTERED_NOT_PAID (0)', () => {
    expect(interpretOrderStatus(OrderStatus.REGISTERED_NOT_PAID)).toBe('Order registered but not paid');
  });

  it('should interpret UNKNOWN_DECLINE (-1)', () => {
    expect(interpretOrderStatus(OrderStatus.UNKNOWN_DECLINE)).toBe('Unknown decline');
  });

  it('should interpret APPROVED (1)', () => {
    expect(interpretOrderStatus(OrderStatus.APPROVED)).toBe('Approved (pre-authorization held)');
  });

  it('should interpret DEPOSITED (2)', () => {
    expect(interpretOrderStatus(OrderStatus.DEPOSITED)).toBe('Payment completed successfully');
  });

  it('should interpret REVERSED (3)', () => {
    expect(interpretOrderStatus(OrderStatus.REVERSED)).toBe('Authorization reversed');
  });

  it('should interpret REFUNDED (4)', () => {
    expect(interpretOrderStatus(OrderStatus.REFUNDED)).toBe('Transaction refunded');
  });

  it('should interpret DECLINED (6)', () => {
    expect(interpretOrderStatus(OrderStatus.DECLINED)).toBe('Payment declined');
  });

  it('should interpret CARD_ADDED (7)', () => {
    expect(interpretOrderStatus(OrderStatus.CARD_ADDED)).toBe('Card added to binding');
  });

  it('should interpret CARD_UPDATED (8)', () => {
    expect(interpretOrderStatus(OrderStatus.CARD_UPDATED)).toBe('Card binding updated');
  });

  it('should interpret CARD_VERIFIED (9)', () => {
    expect(interpretOrderStatus(OrderStatus.CARD_VERIFIED)).toBe('Card verified');
  });

  it('should interpret RECURRING_ADDED (10)', () => {
    expect(interpretOrderStatus(OrderStatus.RECURRING_ADDED)).toBe('Recurring payment added');
  });

  it('should interpret DEBITED (11)', () => {
    expect(interpretOrderStatus(OrderStatus.DEBITED)).toBe('Amount debited');
  });

  it('should handle null status', () => {
    expect(interpretOrderStatus(null)).toBe('Unknown status');
  });

  it('should handle unknown status code', () => {
    expect(interpretOrderStatus(999)).toBe('Unknown status code: 999');
  });

  it('should handle status code 5 (not in enum)', () => {
    expect(interpretOrderStatus(5)).toBe('Unknown status code: 5');
  });
});
