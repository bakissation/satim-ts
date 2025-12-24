import type {
  SatimConfig,
  SatimLogger,
  SatimLanguage,
  LogLevel,
  RegisterOrderParams,
  RegisterOrderRawResponse,
  RegisterOrderResponse,
  ConfirmOrderRawResponse,
  ConfirmOrderResponse,
  RefundOrderRawResponse,
  RefundOrderResponse,
  RegisterJsonParams,
} from './types.js';
import { DEFAULTS, ENDPOINTS, VALIDATION } from './constants.js';
import { ValidationError, SatimApiError, mapSatimErrorCode } from './errors.js';
import { toMinorUnits } from './amount.js';
import { makeRequest } from './http.js';

/**
 * Satim client for interacting with the SATIM-IPAY payment gateway
 */
export interface SatimClient {
  /**
   * Registers a new order for payment
   *
   * @param params - Order registration parameters
   * @returns Registration response with orderId and formUrl
   */
  register(params: RegisterOrderParams): Promise<RegisterOrderResponse>;

  /**
   * Confirms/acknowledges a transaction after payment redirect
   *
   * @param mdOrder - Order ID returned from register
   * @param languageOverride - Optional language override
   * @returns Confirmation response with order status
   */
  confirm(
    mdOrder: string,
    languageOverride?: SatimLanguage
  ): Promise<ConfirmOrderResponse>;

  /**
   * Refunds a completed transaction
   *
   * @param orderId - Order ID to refund
   * @param amountDzd - Amount to refund in DZD (required)
   * @param languageOverride - Optional language override
   * @returns Refund response
   */
  refund(
    orderId: string,
    amountDzd: number | string,
    languageOverride?: SatimLanguage
  ): Promise<RefundOrderResponse>;
}

/**
 * Internal resolved configuration
 */
interface ResolvedConfig {
  userName: string;
  password: string;
  terminalId: string;
  apiBaseUrl: string;
  language: SatimLanguage;
  currency: string;
  httpMethod: 'POST' | 'GET';
  timeoutMs: number;
  logger: SatimLogger | null;
}

/**
 * Creates a Satim client instance
 *
 * @param config - Client configuration
 * @returns SatimClient instance
 */
export function createSatimClient(config: SatimConfig): SatimClient {
  const resolved = resolveConfig(config);

  return {
    register: (params) => registerOrder(resolved, params),
    confirm: (mdOrder, lang) => confirmOrder(resolved, mdOrder, lang),
    refund: (orderId, amountDzd, lang) =>
      refundOrder(resolved, orderId, amountDzd, lang),
  };
}

/**
 * Resolves configuration with defaults
 */
function resolveConfig(config: SatimConfig): ResolvedConfig {
  const enableLogging =
    config.logger?.enableDevLogging ??
    process.env['NODE_ENV'] !== 'production';

  return {
    userName: config.userName,
    password: config.password,
    terminalId: config.terminalId,
    apiBaseUrl: config.apiBaseUrl,
    language: config.language ?? DEFAULTS.LANGUAGE,
    currency: config.currency ?? DEFAULTS.CURRENCY,
    httpMethod: config.http?.method ?? DEFAULTS.HTTP_METHOD,
    timeoutMs: config.http?.timeoutMs ?? DEFAULTS.TIMEOUT_MS,
    logger: enableLogging
      ? createLogger(config.logger?.level ?? DEFAULTS.LOG_LEVEL)
      : null,
  };
}

/**
 * Creates a minimal logger implementation
 */
function createLogger(level: LogLevel): SatimLogger {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  const currentLevel = levels[level];

  const log = (
    logLevel: LogLevel,
    obj: Record<string, unknown>,
    msg?: string
  ) => {
    if (levels[logLevel] >= currentLevel) {
      const timestamp = new Date().toISOString();
      const message = msg ? `${msg}: ${JSON.stringify(obj)}` : JSON.stringify(obj);
      console[logLevel === 'debug' ? 'log' : logLevel](
        `[${timestamp}] [satim] [${logLevel.toUpperCase()}] ${message}`
      );
    }
  };

  return {
    debug: (obj, msg) => log('debug', obj, msg),
    info: (obj, msg) => log('info', obj, msg),
    warn: (obj, msg) => log('warn', obj, msg),
    error: (obj, msg) => log('error', obj, msg),
  };
}

/**
 * Registers an order with Satim
 */
async function registerOrder(
  config: ResolvedConfig,
  params: RegisterOrderParams
): Promise<RegisterOrderResponse> {
  // Validate parameters
  validateRegisterParams(params);

  // Convert amount to minor units
  const amountMinor = toMinorUnits(params.amount);

  // Build jsonParams
  const jsonParams: RegisterJsonParams = {
    force_terminal_id: config.terminalId,
    udf1: params.udf1,
  };

  if (params.udf2) jsonParams.udf2 = params.udf2;
  if (params.udf3) jsonParams.udf3 = params.udf3;
  if (params.udf4) jsonParams.udf4 = params.udf4;
  if (params.udf5) jsonParams.udf5 = params.udf5;
  if (params.fundingTypeIndicator) {
    jsonParams.fundingTypeIndicator = params.fundingTypeIndicator;
  }

  const jsonParamsStr = JSON.stringify(jsonParams);

  // Validate jsonParams length
  if (jsonParamsStr.length > VALIDATION.MAX_JSON_PARAMS_LENGTH) {
    throw new ValidationError(
      `jsonParams exceeds maximum length of ${VALIDATION.MAX_JSON_PARAMS_LENGTH}`,
      'INVALID_JSON_PARAMS',
      { length: jsonParamsStr.length, max: VALIDATION.MAX_JSON_PARAMS_LENGTH }
    );
  }

  // Build request parameters
  const requestParams: Record<string, string> = {
    userName: config.userName,
    password: config.password,
    orderNumber: params.orderNumber,
    amount: amountMinor,
    currency: params.currency ?? config.currency,
    returnUrl: params.returnUrl,
    language: params.language ?? config.language,
    jsonParams: jsonParamsStr,
  };

  if (params.failUrl) {
    requestParams['failUrl'] = params.failUrl;
  }
  if (params.description) {
    requestParams['description'] = params.description;
  }

  // Make request
  const response = await makeRequest<RegisterOrderRawResponse>(
    config.apiBaseUrl,
    ENDPOINTS.REGISTER,
    requestParams,
    {
      method: config.httpMethod,
      timeoutMs: config.timeoutMs,
      logger: config.logger ?? undefined,
    }
  );

  const raw = response.data;
  const errorCode = normalizeNumber(raw.errorCode, 0);

  // Check for API error
  if (errorCode !== 0) {
    throw new SatimApiError(
      mapSatimErrorCode('register', errorCode),
      'register',
      errorCode,
      { orderId: raw.orderId }
    );
  }

  const orderId = raw.orderId ?? null;
  const formUrl = raw.formUrl ?? null;
  const isSuccessful = () => errorCode === 0 && !!orderId && !!formUrl;

  return {
    raw,
    errorCode,
    orderId,
    formUrl,
    isSuccessful,
  };
}

/**
 * Confirms/acknowledges a transaction
 */
async function confirmOrder(
  config: ResolvedConfig,
  mdOrder: string,
  languageOverride?: SatimLanguage
): Promise<ConfirmOrderResponse> {
  if (!mdOrder || typeof mdOrder !== 'string') {
    throw new ValidationError(
      'mdOrder is required and must be a string',
      'INVALID_MD_ORDER'
    );
  }

  const requestParams: Record<string, string> = {
    userName: config.userName,
    password: config.password,
    mdOrder,
    language: languageOverride ?? config.language,
  };

  const response = await makeRequest<ConfirmOrderRawResponse>(
    config.apiBaseUrl,
    ENDPOINTS.CONFIRM,
    requestParams,
    {
      method: config.httpMethod,
      timeoutMs: config.timeoutMs,
      logger: config.logger ?? undefined,
    }
  );

  const raw = response.data;
  const errorCode = normalizeNumber(raw.ErrorCode, 0);

  // Check for API error
  if (errorCode !== 0) {
    throw new SatimApiError(
      mapSatimErrorCode('confirm', errorCode),
      'confirm',
      errorCode,
      { orderNumber: raw.OrderNumber }
    );
  }

  const orderStatus = normalizeNumber(raw.OrderStatus, null);
  const amount = normalizeNumber(raw.Amount, null);
  const orderNumber = raw.OrderNumber ?? null;
  const pan = raw.Pan ?? null;
  const actionCodeDescription = raw.actionCodeDescription ?? null;

  const isSuccessful = () => errorCode === 0;
  const isPaid = () => isSuccessful() && orderStatus === 2;

  return {
    raw,
    errorCode,
    orderStatus,
    amount,
    orderNumber,
    pan,
    actionCodeDescription,
    isSuccessful,
    isPaid,
  };
}

/**
 * Refunds a transaction
 */
async function refundOrder(
  config: ResolvedConfig,
  orderId: string,
  amountDzd: number | string,
  languageOverride?: SatimLanguage
): Promise<RefundOrderResponse> {
  if (!orderId || typeof orderId !== 'string') {
    throw new ValidationError(
      'orderId is required and must be a string',
      'INVALID_ORDER_ID'
    );
  }

  if (amountDzd === undefined || amountDzd === null) {
    throw new ValidationError(
      'amountDzd is required for refund',
      'INVALID_AMOUNT',
      { hint: 'Provide the amount to refund in DZD' }
    );
  }

  // Convert amount to minor units
  const amountMinor = toMinorUnits(amountDzd);

  const requestParams: Record<string, string> = {
    userName: config.userName,
    password: config.password,
    orderId,
    amount: amountMinor,
    currency: config.currency,
    language: languageOverride ?? config.language,
  };

  const response = await makeRequest<RefundOrderRawResponse>(
    config.apiBaseUrl,
    ENDPOINTS.REFUND,
    requestParams,
    {
      method: config.httpMethod,
      timeoutMs: config.timeoutMs,
      logger: config.logger ?? undefined,
    }
  );

  const raw = response.data;
  const errorCode = normalizeNumber(raw.errorCode, 0);

  // Check for API error
  if (errorCode !== 0) {
    throw new SatimApiError(
      mapSatimErrorCode('refund', errorCode),
      'refund',
      errorCode,
      { errorMessage: raw.errorMessage }
    );
  }

  const errorMessage = raw.errorMessage ?? null;
  const isSuccessful = () => errorCode === 0;

  return {
    raw,
    errorCode,
    errorMessage,
    isSuccessful,
  };
}

/**
 * Validates register parameters
 */
function validateRegisterParams(params: RegisterOrderParams): void {
  // Validate orderNumber
  if (!params.orderNumber || typeof params.orderNumber !== 'string') {
    throw new ValidationError(
      'orderNumber is required',
      'INVALID_ORDER_NUMBER'
    );
  }
  if (params.orderNumber.length > VALIDATION.MAX_ORDER_NUMBER_LENGTH) {
    throw new ValidationError(
      `orderNumber exceeds maximum length of ${VALIDATION.MAX_ORDER_NUMBER_LENGTH}`,
      'INVALID_ORDER_NUMBER',
      { length: params.orderNumber.length, max: VALIDATION.MAX_ORDER_NUMBER_LENGTH }
    );
  }

  // Validate returnUrl
  if (!params.returnUrl || typeof params.returnUrl !== 'string') {
    throw new ValidationError('returnUrl is required', 'INVALID_RETURN_URL');
  }

  // Validate udf1
  if (!params.udf1 || typeof params.udf1 !== 'string') {
    throw new ValidationError('udf1 is required', 'INVALID_UDF1');
  }
  if (params.udf1.length > VALIDATION.MAX_UDF_LENGTH) {
    throw new ValidationError(
      `udf1 exceeds maximum length of ${VALIDATION.MAX_UDF_LENGTH}`,
      'INVALID_UDF1',
      { length: params.udf1.length, max: VALIDATION.MAX_UDF_LENGTH }
    );
  }

  // Validate optional udf fields
  const udfFields = ['udf2', 'udf3', 'udf4', 'udf5'] as const;
  for (const field of udfFields) {
    const value = params[field];
    if (value && value.length > VALIDATION.MAX_UDF_LENGTH) {
      throw new ValidationError(
        `${field} exceeds maximum length of ${VALIDATION.MAX_UDF_LENGTH}`,
        `INVALID_${field.toUpperCase()}`,
        { length: value.length, max: VALIDATION.MAX_UDF_LENGTH }
      );
    }
  }

  // Validate description if provided
  if (
    params.description &&
    params.description.length > VALIDATION.MAX_DESCRIPTION_LENGTH
  ) {
    throw new ValidationError(
      `description exceeds maximum length of ${VALIDATION.MAX_DESCRIPTION_LENGTH}`,
      'INVALID_DESCRIPTION',
      { length: params.description.length, max: VALIDATION.MAX_DESCRIPTION_LENGTH }
    );
  }
}

/**
 * Normalizes a value to number
 */
function normalizeNumber(value: unknown, defaultValue: number): number;
function normalizeNumber(value: unknown, defaultValue: null): number | null;
function normalizeNumber(
  value: unknown,
  defaultValue: number | null
): number | null {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}
