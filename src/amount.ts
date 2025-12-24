import { ValidationError } from './errors.js';
import { VALIDATION } from './constants.js';

/**
 * Converts an amount in DZD to minor units (multiply by 100)
 * Uses string-based parsing to avoid floating-point errors
 *
 * @param amount - Amount in DZD (e.g., 806.5, "5000", "806.50")
 * @returns Amount in minor units as string
 * @throws ValidationError if amount is invalid
 *
 * @example
 * toMinorUnits(5000) => "500000"
 * toMinorUnits("806.5") => "80650"
 * toMinorUnits("806.50") => "80650"
 * toMinorUnits(50) => "5000"
 */
export function toMinorUnits(amount: number | string): string {
  // Convert to string for consistent parsing
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;

  // Validate input is not empty
  if (!amountStr || amountStr.trim() === '') {
    throw new ValidationError('Amount cannot be empty', 'INVALID_AMOUNT', {
      value: amount,
    });
  }

  // Trim whitespace
  const trimmed = amountStr.trim();

  // Validate format: optional negative, digits, optional decimal with digits
  const validFormat = /^-?\d+(\.\d+)?$/;
  if (!validFormat.test(trimmed)) {
    throw new ValidationError(
      'Amount must be a valid number',
      'INVALID_AMOUNT',
      { value: amount }
    );
  }

  // Parse and validate the amount
  const parsed = parseFloat(trimmed);

  // Check for negative amounts
  if (parsed < 0) {
    throw new ValidationError(
      'Amount must be non-negative',
      'INVALID_AMOUNT',
      { value: amount }
    );
  }

  // Check minimum amount (50 DZD)
  if (parsed < VALIDATION.MIN_AMOUNT_DZD) {
    throw new ValidationError(
      `Amount must be at least ${VALIDATION.MIN_AMOUNT_DZD} DZD`,
      'INVALID_AMOUNT',
      { value: amount, minimum: VALIDATION.MIN_AMOUNT_DZD }
    );
  }

  // Check decimal places
  const decimalIndex = trimmed.indexOf('.');
  if (decimalIndex !== -1) {
    const decimals = trimmed.length - decimalIndex - 1;
    if (decimals > VALIDATION.MAX_DECIMALS) {
      throw new ValidationError(
        `Amount cannot have more than ${VALIDATION.MAX_DECIMALS} decimal places`,
        'INVALID_AMOUNT',
        { value: amount, maxDecimals: VALIDATION.MAX_DECIMALS }
      );
    }
  }

  // Convert to minor units using string manipulation to avoid floating-point issues
  const minorUnits = convertToMinorUnits(trimmed);

  return minorUnits;
}

/**
 * Convert a numeric string to minor units (multiply by 100)
 * using string manipulation to avoid floating-point errors
 */
function convertToMinorUnits(amountStr: string): string {
  const decimalIndex = amountStr.indexOf('.');

  if (decimalIndex === -1) {
    // No decimal point: append "00"
    return amountStr + '00';
  }

  const integerPart = amountStr.substring(0, decimalIndex);
  let decimalPart = amountStr.substring(decimalIndex + 1);

  // Pad decimal part to 2 digits
  if (decimalPart.length === 1) {
    decimalPart += '0';
  } else if (decimalPart.length === 2) {
    // Already 2 digits
  } else {
    // Truncate to 2 digits (should not happen due to validation)
    decimalPart = decimalPart.substring(0, 2);
  }

  // Combine and remove leading zeros (except for "0")
  const combined = integerPart + decimalPart;
  const result = combined.replace(/^0+/, '') || '0';

  return result;
}

/**
 * Converts minor units back to DZD
 *
 * @param minorUnits - Amount in minor units
 * @returns Amount in DZD as number
 *
 * @example
 * fromMinorUnits(500000) => 5000
 * fromMinorUnits("80650") => 806.5
 */
export function fromMinorUnits(minorUnits: number | string): number {
  const value =
    typeof minorUnits === 'string' ? parseInt(minorUnits, 10) : minorUnits;

  if (isNaN(value)) {
    throw new ValidationError(
      'Minor units must be a valid number',
      'INVALID_AMOUNT',
      { value: minorUnits }
    );
  }

  return value / 100;
}

/**
 * Validates an amount without converting
 *
 * @param amount - Amount to validate
 * @returns true if valid, throws otherwise
 */
export function validateAmount(amount: number | string): boolean {
  toMinorUnits(amount); // Will throw if invalid
  return true;
}
