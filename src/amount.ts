import { Dinar, MoneyError } from '@bakissation/dinar';
import { ValidationError } from './errors.js';
import { VALIDATION } from './constants.js';

/**
 * Coerce a supported amount input into a {@link Dinar}. DZD amounts are parsed by
 * `@bakissation/dinar` (the canonical money type for the family); a `Dinar` is
 * returned as-is; a bigint is treated as whole DZD. Unparseable input becomes a
 * {@link ValidationError} so satim's error contract is preserved.
 */
function coerceDinar(amount: number | string | bigint | Dinar): Dinar {
  if (amount instanceof Dinar) return amount;
  try {
    if (typeof amount === 'bigint') return Dinar.fromCentimes(Number(amount * 100n));
    if (typeof amount === 'number') return Dinar.fromDinars(amount);
    return Dinar.fromString(amount);
  } catch (error) {
    if (error instanceof MoneyError) {
      throw new ValidationError('Amount must be a valid number', 'INVALID_AMOUNT', {
        value: String(amount),
      });
    }
    throw error;
  }
}

/**
 * Converts a DZD amount to minor units (centimes) as a string — the form the
 * SATIM API expects. Parsing and conversion are delegated to `@bakissation/dinar`.
 *
 * @param amount - DZD amount as number, string, bigint, or a `Dinar`
 * @returns minor units (centimes) as a string
 * @throws ValidationError if invalid or below {@link VALIDATION.MIN_AMOUNT_DZD}
 *
 * @example
 * toMinorUnits(5000)                    // "500000"
 * toMinorUnits("806.5")                 // "80650"
 * toMinorUnits(Dinar.fromDinars(5000))  // "500000"
 */
export function toMinorUnits(amount: number | string | bigint | Dinar): string {
  const centimes = coerceDinar(amount).toCentimes();
  if (centimes < 0) {
    throw new ValidationError('Amount must be non-negative', 'INVALID_AMOUNT', {
      value: String(amount),
    });
  }
  if (centimes < VALIDATION.MIN_AMOUNT_DZD * 100) {
    throw new ValidationError(
      `Amount must be at least ${VALIDATION.MIN_AMOUNT_DZD} DZD`,
      'INVALID_AMOUNT',
      { value: String(amount), minimum: VALIDATION.MIN_AMOUNT_DZD }
    );
  }
  return String(centimes);
}

/**
 * Converts minor units (centimes) back to DZD, via dinar.
 *
 * @example
 * fromMinorUnits("80650") // 806.5
 */
export function fromMinorUnits(minorUnits: number | string): number {
  const value = typeof minorUnits === 'string' ? parseInt(minorUnits, 10) : minorUnits;
  if (!Number.isFinite(value)) {
    throw new ValidationError('Minor units must be a valid number', 'INVALID_AMOUNT', {
      value: minorUnits,
    });
  }
  return Dinar.fromCentimes(value).toDinars();
}

/**
 * Validates an amount without converting.
 *
 * @returns true if valid, throws {@link ValidationError} otherwise
 */
export function validateAmount(amount: number | string | bigint | Dinar): boolean {
  toMinorUnits(amount);
  return true;
}
