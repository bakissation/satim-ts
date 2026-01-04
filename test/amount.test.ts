import { describe, it, expect } from 'vitest';
import { toMinorUnits, fromMinorUnits, validateAmount } from '../src/amount.js';
import { ValidationError } from '../src/errors.js';

describe('toMinorUnits', () => {
  describe('valid conversions', () => {
    it('should convert whole number amount', () => {
      expect(toMinorUnits(5000)).toBe('500000');
    });

    it('should convert string whole number', () => {
      expect(toMinorUnits('5000')).toBe('500000');
    });

    it('should convert amount with one decimal', () => {
      expect(toMinorUnits('806.5')).toBe('80650');
    });

    it('should convert amount with two decimals', () => {
      expect(toMinorUnits('806.50')).toBe('80650');
    });

    it('should convert minimum amount (50 DZD)', () => {
      expect(toMinorUnits(50)).toBe('5000');
    });

    it('should convert number with decimals', () => {
      expect(toMinorUnits(100.32)).toBe('10032');
    });

    it('should handle string with trailing zeros', () => {
      expect(toMinorUnits('100.00')).toBe('10000');
    });

    it('should handle large amounts', () => {
      expect(toMinorUnits(999999)).toBe('99999900');
    });

    it('should handle amount with spaces (trimmed)', () => {
      expect(toMinorUnits('  5000  ')).toBe('500000');
    });

    it('should convert 50.01 correctly', () => {
      expect(toMinorUnits('50.01')).toBe('5001');
    });

    it('should handle string number correctly', () => {
      expect(toMinorUnits('1234.56')).toBe('123456');
    });
  });

  describe('validation errors', () => {
    it('should throw for empty string', () => {
      expect(() => toMinorUnits('')).toThrow(ValidationError);
      expect(() => toMinorUnits('')).toThrow('Amount cannot be empty');
    });

    it('should throw for whitespace only', () => {
      expect(() => toMinorUnits('   ')).toThrow(ValidationError);
    });

    it('should throw for negative amount', () => {
      expect(() => toMinorUnits(-100)).toThrow(ValidationError);
      expect(() => toMinorUnits(-100)).toThrow('non-negative');
    });

    it('should throw for negative string amount', () => {
      expect(() => toMinorUnits('-100')).toThrow(ValidationError);
    });

    it('should throw for amount below minimum (50 DZD)', () => {
      expect(() => toMinorUnits(49)).toThrow(ValidationError);
      expect(() => toMinorUnits(49)).toThrow('at least 50 DZD');
    });

    it('should throw for amount with more than 2 decimal places', () => {
      expect(() => toMinorUnits('100.123')).toThrow(ValidationError);
      expect(() => toMinorUnits('100.123')).toThrow('2 decimal places');
    });

    it('should throw for invalid format', () => {
      expect(() => toMinorUnits('abc')).toThrow(ValidationError);
      expect(() => toMinorUnits('abc')).toThrow('valid number');
    });

    it('should throw for amount with multiple decimal points', () => {
      expect(() => toMinorUnits('100.50.25')).toThrow(ValidationError);
    });

    it('should throw for amount with letters mixed', () => {
      expect(() => toMinorUnits('100a50')).toThrow(ValidationError);
    });

    it('should have correct error code', () => {
      try {
        toMinorUnits(-100);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('INVALID_AMOUNT');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle exact minimum amount', () => {
      expect(toMinorUnits(50)).toBe('5000');
    });

    it('should handle amount ending in .0', () => {
      expect(toMinorUnits('100.0')).toBe('10000');
    });

    it('should convert 0.50 DZD (below minimum) correctly and throw', () => {
      expect(() => toMinorUnits('0.50')).toThrow('at least 50 DZD');
    });
  });

  describe('bigint support', () => {
    it('should convert bigint whole number amount', () => {
      expect(toMinorUnits(5000n)).toBe('500000');
    });

    it('should convert minimum bigint amount (50n DZD)', () => {
      expect(toMinorUnits(50n)).toBe('5000');
    });

    it('should convert large bigint amounts', () => {
      expect(toMinorUnits(999999n)).toBe('99999900');
    });

    it('should convert very large bigint amounts', () => {
      expect(toMinorUnits(1000000000n)).toBe('100000000000');
    });

    it('should throw for negative bigint', () => {
      expect(() => toMinorUnits(-100n)).toThrow(ValidationError);
      expect(() => toMinorUnits(-100n)).toThrow('non-negative');
    });

    it('should throw for bigint below minimum (50 DZD)', () => {
      expect(() => toMinorUnits(49n)).toThrow(ValidationError);
      expect(() => toMinorUnits(49n)).toThrow('at least 50 DZD');
    });

    it('should have correct error code for bigint validation', () => {
      try {
        toMinorUnits(-100n);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('INVALID_AMOUNT');
      }
    });
  });
});

describe('fromMinorUnits', () => {
  it('should convert minor units to DZD', () => {
    expect(fromMinorUnits(500000)).toBe(5000);
  });

  it('should convert string minor units', () => {
    expect(fromMinorUnits('80650')).toBe(806.5);
  });

  it('should handle decimal result', () => {
    expect(fromMinorUnits(10032)).toBe(100.32);
  });

  it('should throw for invalid input', () => {
    expect(() => fromMinorUnits('invalid')).toThrow(ValidationError);
  });
});

describe('validateAmount', () => {
  it('should return true for valid amount', () => {
    expect(validateAmount(5000)).toBe(true);
  });

  it('should throw for invalid amount', () => {
    expect(() => validateAmount(-100)).toThrow(ValidationError);
  });

  it('should return true for valid bigint amount', () => {
    expect(validateAmount(5000n)).toBe(true);
  });

  it('should throw for invalid bigint amount', () => {
    expect(() => validateAmount(-100n)).toThrow(ValidationError);
  });
});
