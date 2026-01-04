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
  MOCK_CONFIRM_SUCCESS,
  parseFormBody,
} from './helpers.js';

describe('confirm', () => {
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

  describe('successful confirmation', () => {
    it('should confirm an order successfully', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.isPaid()).toBe(true);
      expect(response.errorCode).toBe(0);
      expect(response.orderStatus).toBe(2);
      expect(response.orderNumber).toBe('CMD0000004');
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
      await client.confirm('V721uPPfNNofVQAAABL3', 'en');

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
      await client.confirm('V721uPPfNNofVQAAABL3');

      const params = parseFormBody(capturedBody);
      expect(params['language']).toBe('fr');
    });

    it('should handle string ErrorCode', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ...MOCK_CONFIRM_SUCCESS, ErrorCode: '0' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.errorCode).toBe(0);
    });

    it('should handle string OrderStatus', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, { ...MOCK_CONFIRM_SUCCESS, OrderStatus: '2' }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.orderStatus).toBe(2);
      expect(response.isPaid()).toBe(true);
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
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
        client.confirm('INVALID_ORDER_ID')
      ).rejects.toThrow(SatimApiError);
    });

    it('should include correct error details', async () => {
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

      try {
        await client.confirm('INVALID_ORDER_ID');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SatimApiError);
        expect((error as SatimApiError).satimErrorCode).toBe(6);
        expect((error as SatimApiError).endpoint).toBe('confirm');
      }
    });
  });

  describe('validation', () => {
    it('should throw ValidationError for empty mdOrder', async () => {
      const client = createSatimClient(createTestConfig());

      await expect(client.confirm('')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string mdOrder', async () => {
      const client = createSatimClient(createTestConfig());

      // @ts-expect-error Testing invalid input
      await expect(client.confirm(null)).rejects.toThrow(ValidationError);
    });
  });

  describe('response data', () => {
    it('should expose normalized amount', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.amount).toBe(100320);
    });

    it('should expose masked pan', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.pan).toBe('6280****7215');
    });

    it('should preserve raw response', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.raw).toEqual(MOCK_CONFIRM_SUCCESS);
      expect(response.raw.expiration).toBe('202701');
      expect(response.raw.cardholderName).toBe('TEST USER');
    });
  });

  describe('extended response fields', () => {
    it('should expose authorizationResponseId', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.authorizationResponseId).toBe('913180');
    });

    it('should expose approvalCode', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.approvalCode).toBe('913180');
    });

    it('should expose cardholderName', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.cardholderName).toBe('TEST USER');
    });

    it('should expose depositAmount', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.depositAmount).toBe(100320);
    });

    it('should expose currency', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.currency).toBe('012');
    });

    it('should expose ip', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.ip).toBe('10.12.12.14');
    });

    it('should expose params object', async () => {
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
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.params).toEqual({
        respCode_desc: 'Votre paiement a été accepté',
        udf1: 'Bill00001',
        respCode: '00',
      });
    });

    it('should handle null values for optional fields', async () => {
      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, {
          ErrorCode: 0,
          OrderStatus: 2,
          OrderNumber: 'CMD001',
          Amount: 5000,
        }, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.isSuccessful()).toBe(true);
      expect(response.authorizationResponseId).toBeNull();
      expect(response.approvalCode).toBeNull();
      expect(response.cardholderName).toBeNull();
      expect(response.depositAmount).toBeNull();
      expect(response.currency).toBeNull();
      expect(response.description).toBeNull();
      expect(response.ip).toBeNull();
      expect(response.clientId).toBeNull();
      expect(response.bindingId).toBeNull();
      expect(response.paymentAccountReference).toBeNull();
      expect(response.params).toBeNull();
    });

    it('should expose all extended fields together', async () => {
      const extendedResponse = {
        ...MOCK_CONFIRM_SUCCESS,
        clientId: 'CLIENT123',
        bindingId: 'BINDING456',
        paymentAccountReference: 'PAR789',
        Description: 'Test order description',
      };

      const pool = mockPool(agent, 'https://test.satim.dz');
      pool
        .intercept({
          path: '/payment/rest/public/acknowledgeTransaction.do',
          method: 'POST',
        })
        .reply(200, extendedResponse, {
          headers: { 'content-type': 'application/json' },
        });

      const client = createSatimClient(createTestConfig());
      const response = await client.confirm('V721uPPfNNofVQAAABL3');

      expect(response.clientId).toBe('CLIENT123');
      expect(response.bindingId).toBe('BINDING456');
      expect(response.paymentAccountReference).toBe('PAR789');
      expect(response.description).toBe('Test order description');
    });
  });
});
