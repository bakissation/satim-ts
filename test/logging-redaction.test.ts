import { describe, it, expect } from 'vitest';
import {
  redactValue,
  redactObject,
  redactUrl,
  createSafeLogData,
} from '../src/redact.js';

describe('redactValue', () => {
  describe('fully redacted keys', () => {
    it('should redact password', () => {
      expect(redactValue('password', 'secret123')).toBe('[REDACTED]');
    });

    it('should redact userName', () => {
      expect(redactValue('userName', 'merchant_user')).toBe('[REDACTED]');
    });

    it('should redact username (lowercase)', () => {
      expect(redactValue('username', 'merchant_user')).toBe('[REDACTED]');
    });

    it('should redact terminalId', () => {
      expect(redactValue('terminalId', 'E010TEST01')).toBe('[REDACTED]');
    });

    it('should redact force_terminal_id', () => {
      expect(redactValue('force_terminal_id', 'E010TEST01')).toBe('[REDACTED]');
    });

    it('should redact cvv', () => {
      expect(redactValue('cvv', '123')).toBe('[REDACTED]');
    });

    it('should redact cvv2', () => {
      expect(redactValue('cvv2', '456')).toBe('[REDACTED]');
    });

    it('should redact pan', () => {
      expect(redactValue('pan', '6280581110007215')).toBe('[REDACTED]');
    });

    it('should redact Pan (capitalized)', () => {
      expect(redactValue('Pan', '6280****7215')).toBe('[REDACTED]');
    });

    it('should redact cardNumber', () => {
      expect(redactValue('cardNumber', '6280581110007215')).toBe('[REDACTED]');
    });

    it('should redact expiration', () => {
      expect(redactValue('expiration', '202701')).toBe('[REDACTED]');
    });
  });

  describe('partially redacted keys', () => {
    it('should partially redact orderId', () => {
      const result = redactValue('orderId', 'V721uPPfNNofVQAAABL3');
      expect(result).toBe('[REDACTED]...AAABL3');
    });

    it('should partially redact mdOrder', () => {
      const result = redactValue('mdOrder', 'V721uPPfNNofVQAAABL3');
      expect(result).toBe('[REDACTED]...AAABL3');
    });

    it('should partially redact OrderNumber', () => {
      const result = redactValue('OrderNumber', 'CMD0000004');
      expect(result).toBe('[REDACTED]...000004');
    });

    it('should fully redact short values', () => {
      const result = redactValue('orderId', 'ABC');
      expect(result).toBe('[REDACTED]');
    });
  });

  describe('non-sensitive keys', () => {
    it('should not redact amount', () => {
      expect(redactValue('amount', 500000)).toBe(500000);
    });

    it('should not redact currency', () => {
      expect(redactValue('currency', '012')).toBe('012');
    });

    it('should not redact language', () => {
      expect(redactValue('language', 'fr')).toBe('fr');
    });

    it('should not redact errorCode', () => {
      expect(redactValue('errorCode', 0)).toBe(0);
    });

    it('should not redact returnUrl', () => {
      expect(redactValue('returnUrl', 'https://merchant.com/success')).toBe(
        'https://merchant.com/success'
      );
    });
  });

  describe('null/undefined handling', () => {
    it('should return null for null value', () => {
      expect(redactValue('password', null)).toBeNull();
    });

    it('should return undefined for undefined value', () => {
      expect(redactValue('password', undefined)).toBeUndefined();
    });
  });
});

describe('redactObject', () => {
  it('should redact sensitive fields in object', () => {
    const input = {
      userName: 'merchant',
      password: 'secret',
      amount: 5000,
    };

    const result = redactObject(input) as Record<string, unknown>;

    expect(result['userName']).toBe('[REDACTED]');
    expect(result['password']).toBe('[REDACTED]');
    expect(result['amount']).toBe(5000);
  });

  it('should handle nested objects', () => {
    const input = {
      request: {
        userName: 'merchant',
        password: 'secret',
      },
      amount: 5000,
    };

    const result = redactObject(input) as Record<string, unknown>;
    const request = result['request'] as Record<string, unknown>;

    expect(request['userName']).toBe('[REDACTED]');
    expect(request['password']).toBe('[REDACTED]');
    expect(result['amount']).toBe(5000);
  });

  it('should handle arrays', () => {
    const input = [
      { userName: 'user1', amount: 100 },
      { userName: 'user2', amount: 200 },
    ];

    const result = redactObject(input) as Array<Record<string, unknown>>;

    expect(result[0]?.['userName']).toBe('[REDACTED]');
    expect(result[0]?.['amount']).toBe(100);
    expect(result[1]?.['userName']).toBe('[REDACTED]');
    expect(result[1]?.['amount']).toBe(200);
  });

  it('should handle null', () => {
    expect(redactObject(null)).toBeNull();
  });

  it('should handle undefined', () => {
    expect(redactObject(undefined)).toBeUndefined();
  });

  it('should handle primitive values', () => {
    expect(redactObject('test')).toBe('test');
    expect(redactObject(123)).toBe(123);
    expect(redactObject(true)).toBe(true);
  });
});

describe('redactUrl', () => {
  it('should redact password in query string', () => {
    const url =
      'https://test.satim.dz/payment/rest/register.do?userName=merchant&password=secret&amount=5000';
    const result = redactUrl(url);
    const decoded = decodeURIComponent(result);

    expect(decoded).toContain('userName=[REDACTED]');
    expect(decoded).toContain('password=[REDACTED]');
    expect(decoded).toContain('amount=5000');
    expect(decoded).not.toContain('merchant');
    expect(decoded).not.toContain('secret');
  });

  it('should handle URL without sensitive params', () => {
    const url =
      'https://test.satim.dz/payment/rest/register.do?amount=5000&currency=012';
    const result = redactUrl(url);

    expect(result).toContain('amount=5000');
    expect(result).toContain('currency=012');
  });

  it('should handle invalid URL', () => {
    const result = redactUrl('not-a-valid-url');
    expect(result).toBe('[INVALID_URL]');
  });
});

describe('createSafeLogData', () => {
  it('should include endpoint and method', () => {
    const result = createSafeLogData({
      endpoint: '/register.do',
      method: 'POST',
    });

    expect(result['endpoint']).toBe('/register.do');
    expect(result['method']).toBe('POST');
  });

  it('should include duration and status', () => {
    const result = createSafeLogData({
      durationMs: 150,
      statusCode: 200,
    });

    expect(result['durationMs']).toBe(150);
    expect(result['statusCode']).toBe(200);
  });

  it('should include error code', () => {
    const result = createSafeLogData({
      errorCode: 6,
    });

    expect(result['errorCode']).toBe(6);
  });

  it('should partially redact orderId', () => {
    const result = createSafeLogData({
      orderId: 'V721uPPfNNofVQAAABL3',
    });

    expect(result['orderId']).toBe('[REDACTED]...AAABL3');
    expect(result['orderId']).not.toContain('V721uPPf');
  });

  it('should partially redact mdOrder', () => {
    const result = createSafeLogData({
      mdOrder: 'V721uPPfNNofVQAAABL3',
    });

    expect(result['mdOrder']).toBe('[REDACTED]...AAABL3');
  });

  it('should not include undefined fields', () => {
    const result = createSafeLogData({
      endpoint: '/register.do',
    });

    expect(result).not.toHaveProperty('method');
    expect(result).not.toHaveProperty('durationMs');
    expect(result).not.toHaveProperty('orderId');
  });

  it('should handle empty object', () => {
    const result = createSafeLogData({});
    expect(result).toEqual({});
  });
});
