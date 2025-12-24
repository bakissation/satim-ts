/**
 * Error kinds for categorization
 */
export type SatimErrorKind =
  | 'CONFIG_ERROR'
  | 'VALIDATION_ERROR'
  | 'HTTP_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT_ERROR';

/**
 * Base error class for all Satim SDK errors
 */
export class SatimError extends Error {
  readonly kind: SatimErrorKind;
  readonly code?: string;
  readonly httpStatus?: number;
  readonly satimErrorCode?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    kind: SatimErrorKind,
    options?: {
      code?: string;
      httpStatus?: number;
      satimErrorCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SatimError';
    this.kind = kind;
    this.code = options?.code;
    this.httpStatus = options?.httpStatus;
    this.satimErrorCode = options?.satimErrorCode;
    this.details = options?.details;
  }
}

/**
 * Configuration error - thrown when config is invalid or missing
 */
export class ConfigError extends SatimError {
  readonly missingKeys?: string[];

  constructor(message: string, missingKeys?: string[]) {
    super(message, 'CONFIG_ERROR', {
      code: 'CONFIG_INVALID',
      details: missingKeys ? { missingKeys } : undefined,
    });
    this.name = 'ConfigError';
    this.missingKeys = missingKeys;
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends SatimError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { code, details });
    this.name = 'ValidationError';
  }
}

/**
 * HTTP error - thrown for network/transport errors
 */
export class HttpError extends SatimError {
  constructor(
    message: string,
    options?: {
      httpStatus?: number;
      cause?: Error;
    }
  ) {
    super(message, 'HTTP_ERROR', {
      code: 'HTTP_REQUEST_FAILED',
      httpStatus: options?.httpStatus,
      cause: options?.cause,
    });
    this.name = 'HttpError';
  }
}

/**
 * Timeout error - thrown when request times out
 */
export class TimeoutError extends SatimError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', {
      code: 'REQUEST_TIMEOUT',
      details: { timeoutMs },
      cause,
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Satim API error - thrown when Satim returns a non-zero error code
 */
export class SatimApiError extends SatimError {
  readonly endpoint: string;

  constructor(
    message: string,
    endpoint: string,
    satimErrorCode: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'API_ERROR', {
      code: 'SATIM_API_ERROR',
      satimErrorCode,
      details: { ...details, endpoint },
    });
    this.name = 'SatimApiError';
    this.endpoint = endpoint;
  }
}

/**
 * Error code descriptions for register.do endpoint
 */
const REGISTER_ERROR_CODES: Record<number, string> = {
  0: 'No system error',
  1: 'Order with given order number has already been processed',
  3: 'Unknown currency',
  4: 'Required parameter is not specified',
  5: 'Incorrect value of a request parameter',
  7: 'System error',
  14: 'Paymentway is invalid',
};

/**
 * Error code descriptions for confirm endpoint
 */
const CONFIRM_ERROR_CODES: Record<number, string> = {
  0: 'Success',
  2: 'Order is declined because of an error in the payment credentials',
  5: 'Access is denied',
  6: 'Unregistered order Id',
  7: 'System error',
};

/**
 * Error code descriptions for refund endpoint
 */
const REFUND_ERROR_CODES: Record<number, string> = {
  0: 'No system error',
  5: 'Access is denied or invalid amount',
  6: 'Unregistered OrderId',
  7: 'System error or payment in incorrect state',
};

/**
 * Maps a Satim error code to a human-readable label
 */
export function mapSatimErrorCode(
  endpoint: 'register' | 'confirm' | 'refund',
  code: number
): string {
  const codeMaps: Record<string, Record<number, string>> = {
    register: REGISTER_ERROR_CODES,
    confirm: CONFIRM_ERROR_CODES,
    refund: REFUND_ERROR_CODES,
  };

  const map = codeMaps[endpoint];
  return map?.[code] ?? `Unknown error code: ${code}`;
}
