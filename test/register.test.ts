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
  MOCK_REGISTER_SUCCESS,
  parseFormBody,
} from './helpers.js';

describe('register', () => {
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

  describe('successful registration', () => {
    it('should register an order successfully', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, MOCK_REGISTER_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.register({
        orderNumber: 'ORD001',
        amount: 5000,
        returnUrl: 'https://merchant.com/success',
        udf1: 'INV001',
      });

      expect(response.isSuccessful()).toBe(true);
      expect(response.errorCode).toBe(0);
      expect(response.orderId).toBe('V721uPPfNNofVQAAABL3');
      expect(response.formUrl).toContain('payment.html');
    });

    it('should include all required parameters in request', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_REGISTER_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.register({
        orderNumber: 'ORD001',
        amount: 5000,
        returnUrl: 'https://merchant.com/success',
        failUrl: 'https://merchant.com/fail',
        description: 'Test order',
        udf1: 'INV001',
        udf2: 'Extra1',
      });

      const params = parseFormBody(capturedBody);
      expect(params['userName']).toBe('test_user');
      expect(params['password']).toBe('test_password');
      expect(params['orderNumber']).toBe('ORD001');
      expect(params['amount']).toBe('500000'); // 5000 * 100
      expect(params['currency']).toBe('012');
      expect(params['returnUrl']).toBe('https://merchant.com/success');
      expect(params['failUrl']).toBe('https://merchant.com/fail');
      expect(params['description']).toBe('Test order');
      expect(params['language']).toBe('fr');

      const jsonParams = JSON.parse(params['jsonParams'] ?? '{}');
      expect(jsonParams.force_terminal_id).toBe('E010TEST01');
      expect(jsonParams.udf1).toBe('INV001');
      expect(jsonParams.udf2).toBe('Extra1');
    });

    it('should use GET method when configured', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: /^\/payment\/rest\/register\.do\?/,
          method: 'GET',
        })
        .reply(200, MOCK_REGISTER_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(
        createTestConfig({
          http: { method: 'GET' },
        })
      );

      const response = await client.register({
        orderNumber: 'ORD001',
        amount: 5000,
        returnUrl: 'https://merchant.com/success',
        udf1: 'INV001',
      });

      expect(response.isSuccessful()).toBe(true);
    });

    it('should convert decimal amounts correctly', async () => {
      let capturedBody = '';
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, (opts) => {
          capturedBody = opts.body as string;
          return MOCK_REGISTER_SUCCESS;
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      await client.register({
        orderNumber: 'ORD001',
        amount: '806.5',
        returnUrl: 'https://merchant.com/success',
        udf1: 'INV001',
      });

      const params = parseFormBody(capturedBody);
      expect(params['amount']).toBe('80650');
    });
  });

  describe('error handling', () => {
    it('should throw SatimApiError for error response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, { errorCode: 1 }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORD001',
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: 'INV001',
        })
      ).rejects.toThrow(SatimApiError);
    });

    it('should handle string error codes', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, { errorCode: '3' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());

      try {
        await client.register({
          orderNumber: 'ORD001',
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: 'INV001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SatimApiError);
        expect((error as SatimApiError).satimErrorCode).toBe(3);
      }
    });
  });

  describe('validation', () => {
    it('should throw ValidationError for missing orderNumber', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: '',
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: 'INV001',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for orderNumber too long', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORDER123456', // 11 chars, max is 10
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: 'INV001',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing returnUrl', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORD001',
          amount: 5000,
          returnUrl: '',
          udf1: 'INV001',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing udf1', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORD001',
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for udf1 too long', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORD001',
          amount: 5000,
          returnUrl: 'https://merchant.com/success',
          udf1: 'A'.repeat(21), // 21 chars, max is 20
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for amount below minimum', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(
        client.register({
          orderNumber: 'ORD001',
          amount: 49,
          returnUrl: 'https://merchant.com/success',
          udf1: 'INV001',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('response helpers', () => {
    it('should correctly identify successful response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, MOCK_REGISTER_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.register({
        orderNumber: 'ORD001',
        amount: 5000,
        returnUrl: 'https://merchant.com/success',
        udf1: 'INV001',
      });

      expect(response.isSuccessful()).toBe(true);
      expect(response.raw.errorCode).toBe(0);
    });

    it('should preserve raw response', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/register.do',
          method: 'POST',
        })
        .reply(200, MOCK_REGISTER_SUCCESS, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.register({
        orderNumber: 'ORD001',
        amount: 5000,
        returnUrl: 'https://merchant.com/success',
        udf1: 'INV001',
      });

      expect(response.raw).toEqual(MOCK_REGISTER_SUCCESS);
    });
  });
});
