/**
 * @bakissation/satim - Production-grade TypeScript SDK for Satim (SATIM-IPAY) payment gateway
 *
 * @packageDocumentation
 */

// Main client
export { createSatimClient } from './client.js';
export type { SatimClient } from './client.js';

// Environment configuration
export { fromEnv } from './env.js';
export type { FromEnvOptions } from './env.js';

// Types
export type {
  SatimConfig,
  SatimLanguage,
  HttpMethod,
  HttpConfig,
  LoggerConfig,
  LogLevel,
  SatimLogger,
  RegisterOrderParams,
  RegisterJsonParams,
  RegisterOrderRawResponse,
  RegisterOrderResponse,
  ConfirmOrderRawResponse,
  ConfirmOrderResponse,
  RefundOrderRawResponse,
  RefundOrderResponse,
  OrderStatusCode,
} from './types.js';

export { OrderStatus } from './types.js';

// Errors
export {
  SatimError,
  ConfigError,
  ValidationError,
  HttpError,
  TimeoutError,
  SatimApiError,
  mapSatimErrorCode,
} from './errors.js';
export type { SatimErrorKind } from './errors.js';

// Amount utilities
export { toMinorUnits, fromMinorUnits, validateAmount } from './amount.js';

// Constants
export { API_BASE_URLS, ENDPOINTS, DEFAULTS, VALIDATION } from './constants.js';

// Redaction utilities (for advanced use cases)
export { redactObject, redactValue, redactUrl, createSafeLogData } from './redact.js';
