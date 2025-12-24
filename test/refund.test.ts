import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, type Dispatcher } from 'undici';
import { createSatimClient } from '../src/client.js';
import { ValidationError, SatimApiError } from '../src/errors.js';
import {
  createTestConfig,
  createMockAgent,
  setupMockAgent,
  restoreDispatcher,
  mockPool,
  MOCK_REFUND_SUCCESS,
  parseFormBody,
} from './helpers.js';

describe('refund', () => {
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

  describe('successful refund', () => {
    it('should refund an order successfully', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, MOCK_REFUND_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.refund('V721uPPfNNofVQAAABL3', 5000);

      expect(response.isSuccessful()).toBe(true);
      expect(response.errorCode).toBe(0);
    });

    it('should include correct parameters in request', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_REFUND_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.refund('V721uPPfNNofVQAAABL3', 5000, 'en');

      const params = parseFormBody(capturedBody);
      expect(params['userName']).toBe('test_user');
      expect(params['password']).toBe('test_password');
      expect(params['orderId']).toBe('V721uPPfNNofVQAAABL3');
      expect(params['amount']).toBe('500000'); // 5000 * 100
      expect(params['currency']).toBe('012');
      expect(params['language']).toBe('en');
    });

    it('should convert decimal amounts correctly', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_REFUND_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.refund('V721uPPfNNofVQAAABL3', '806.5');

      const params = parseFormBody(capturedBody);
      expect(params['amount']).toBe('80650');
    });

    it('should use default language', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_REFUND_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.refund('V721uPPfNNofVQAAABL3', 5000);

      const params = parseFormBody(capturedBody);
      expect(params['language']).toBe('fr');
    });
  });

  describe('error handling', () => {
    it('should throw SatimApiError for error response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, { errorCode: 6, errorMessage: 'Unregistered OrderId' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      await expect(
        client.refund('INVALID_ORDER_ID', 5000)
      ).rejects.toThrow(SatimApiError);
    });

    it('should throw SatimApiError with correct error code', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, { errorCode: 7, errorMessage: 'System error' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      try {
        await client.refund('V721uPPfNNofVQAAABL3', 5000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SatimApiError);
        expect((error as SatimApiError).satimErrorCode).toBe(7);
        expect((error as SatimApiError).endpoint).toBe('refund');
      }
    });

    it('should handle string error codes', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, { errorCode: '5', errorMessage: 'Access denied' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      try {
        await client.refund('V721uPPfNNofVQAAABL3', 5000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SatimApiError);
        expect((error as SatimApiError).satimErrorCode).toBe(5);
      }
    });
  });

  describe('validation', () => {
    it('should throw ValidationError for empty orderId', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(client.refund('', 5000)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string orderId', async () => {
      const client = createSatimClient(createTestConfig());

      // @ts-expect-error Testing invalid input
      await expect(client.refund(null, 5000)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing amount', async () => {
      const client = createSatimClient(createTestConfig());

      // @ts-expect-error Testing missing amount
      await expect(client.refund('V721uPPfNNofVQAAABL3')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for null amount', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        // @ts-expect-error Testing null amount
        client.refund('V721uPPfNNofVQAAABL3', null)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for amount below minimum', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.refund('V721uPPfNNofVQAAABL3', 49)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative amount', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.refund('V721uPPfNNofVQAAABL3', -100)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('response data', () => {
    it('should expose error message', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, { errorCode: 0, errorMessage: 'Refund processed' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.refund('V721uPPfNNofVQAAABL3', 5000);

      expect(response.errorMessage).toBe('Refund processed');
    });

    it('should handle missing error message', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, MOCK_REFUND_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.refund('V721uPPfNNofVQAAABL3', 5000);

      expect(response.errorMessage).toBeNull();
    });

    it('should preserve raw response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/refund.do',
          method: 'POST',
        })
        .reply(200, MOCK_REFUND_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.refund('V721uPPfNNofVQAAABL3', 5000);

      expect(response.raw).toEqual(MOCK_REFUND_SUCCESS);
    });
  });
});
