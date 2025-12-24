import { ConfigError } from './errors.js';
import { API_BASE_URLS, DEFAULTS, ENV_VARS } from './constants.js';
import type { SatimConfig, SatimLanguage, LogLevel, HttpMethod } from './types.js';

/**
 * Options for fromEnv function
 */
export interface FromEnvOptions {
  /** Environment variable prefix (default: 'SATIM_') */
  prefix?: string;
  /** Optional environment object to read from (default: process.env) */
  env?: Record<string, string | undefined>;
}

/**
 * Loads Satim configuration from environment variables
 *
 * Required environment variables (with default prefix SATIM_):
 * - SATIM_USERNAME: Merchant's login
 * - SATIM_PASSWORD: Merchant's password
 * - SATIM_TERMINAL_ID: Terminal ID assigned by bank
 *
 * Optional environment variables:
 * - SATIM_API_URL: API base URL (defaults to test URL)
 * - SATIM_LANGUAGE: Default language (fr, en, ar)
 * - SATIM_CURRENCY: Currency code (default: 012 for DZD)
 * - SATIM_HTTP_METHOD: HTTP method (POST, GET)
 * - SATIM_HTTP_TIMEOUT_MS: Request timeout in ms
 * - SATIM_HTTP_CONNECT_TIMEOUT_MS: Connection timeout in ms
 * - SATIM_HTTP_VERIFY_SSL: SSL verification (true, false)
 * - SATIM_LOG_LEVEL: Log level (debug, info, warn, error)
 * - SATIM_LOG_DEV: Enable dev logging (true, false)
 *
 * @param options - Options for loading environment variables
 * @returns SatimConfig object
 * @throws ConfigError if required variables are missing
 */
export function fromEnv(options: FromEnvOptions = {}): SatimConfig {
  const { prefix = 'SATIM_', env = process.env } = options;

  const getVar = (key: string): string | undefined => env[prefix + key];

  // Check required variables
  const missingKeys: string[] = [];

  const userName = getVar(ENV_VARS.USERNAME);
  if (!userName) {
    missingKeys.push(`${prefix}${ENV_VARS.USERNAME}`);
  }

  const password = getVar(ENV_VARS.PASSWORD);
  if (!password) {
    missingKeys.push(`${prefix}${ENV_VARS.PASSWORD}`);
  }

  const terminalId = getVar(ENV_VARS.TERMINAL_ID);
  if (!terminalId) {
    missingKeys.push(`${prefix}${ENV_VARS.TERMINAL_ID}`);
  }

  if (missingKeys.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
      missingKeys
    );
  }

  // Parse optional variables
  const apiBaseUrl = getVar(ENV_VARS.API_URL) ?? API_BASE_URLS.TEST;
  const language = parseLanguage(getVar(ENV_VARS.LANGUAGE));
  const currency = getVar(ENV_VARS.CURRENCY) ?? DEFAULTS.CURRENCY;

  // Parse HTTP config
  const httpMethod = parseHttpMethod(getVar(ENV_VARS.HTTP_METHOD));
  const timeoutMs = parseNumber(getVar(ENV_VARS.HTTP_TIMEOUT_MS), DEFAULTS.TIMEOUT_MS);
  const connectTimeoutMs = parseNumber(
    getVar(ENV_VARS.HTTP_CONNECT_TIMEOUT_MS),
    DEFAULTS.CONNECT_TIMEOUT_MS
  );
  const verifySSL = parseBoolean(getVar(ENV_VARS.HTTP_VERIFY_SSL), DEFAULTS.VERIFY_SSL);

  // Parse logger config
  const logLevel = parseLogLevel(getVar(ENV_VARS.LOG_LEVEL));
  const enableDevLogging = parseBoolean(
    getVar(ENV_VARS.LOG_DEV),
    process.env['NODE_ENV'] !== 'production'
  );

  return {
    userName: userName!,
    password: password!,
    terminalId: terminalId!,
    apiBaseUrl,
    language,
    currency,
    http: {
      method: httpMethod,
      timeoutMs,
      connectTimeoutMs,
      verifySSL,
    },
    logger: {
      level: logLevel,
      enableDevLogging,
    },
  };
}

/**
 * Parses language string to SatimLanguage
 */
function parseLanguage(value: string | undefined): SatimLanguage {
  if (!value) {
    return DEFAULTS.LANGUAGE;
  }

  const lower = value.toLowerCase();
  if (lower === 'fr' || lower === 'en' || lower === 'ar') {
    return lower;
  }

  return DEFAULTS.LANGUAGE;
}

/**
 * Parses HTTP method string
 */
function parseHttpMethod(value: string | undefined): HttpMethod {
  if (!value) {
    return DEFAULTS.HTTP_METHOD;
  }

  const upper = value.toUpperCase();
  if (upper === 'POST' || upper === 'GET') {
    return upper;
  }

  return DEFAULTS.HTTP_METHOD;
}

/**
 * Parses log level string
 */
function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return DEFAULTS.LOG_LEVEL;
  }

  const lower = value.toLowerCase();
  if (
    lower === 'debug' ||
    lower === 'info' ||
    lower === 'warn' ||
    lower === 'error'
  ) {
    return lower;
  }

  return DEFAULTS.LOG_LEVEL;
}

/**
 * Parses number with default
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parses boolean with default
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }

  return defaultValue;
}
