import type { SatimLanguage } from './types.js';

/**
 * API endpoint paths
 */
export const ENDPOINTS = {
  REGISTER: '/register.do',
  CONFIRM: '/public/acknowledgeTransaction.do',
  REFUND: '/refund.do',
} as const;

/**
 * Default API base URLs
 */
export const API_BASE_URLS = {
  TEST: 'https://test2.satim.dz/payment/rest',
  PRODUCTION: 'https://satim.dz/payment/rest',
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default language */
  LANGUAGE: 'fr' as SatimLanguage,
  /** Default currency (DZD) */
  CURRENCY: '012',
  /** Default HTTP method */
  HTTP_METHOD: 'POST' as const,
  /** Default request timeout in milliseconds */
  TIMEOUT_MS: 30000,
  /** Default connection timeout in milliseconds */
  CONNECT_TIMEOUT_MS: 10000,
  /** Default SSL verification */
  VERIFY_SSL: true,
  /** Default log level */
  LOG_LEVEL: 'info' as const,
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  /** Minimum amount in DZD */
  MIN_AMOUNT_DZD: 50,
  /** Maximum decimal places for amount */
  MAX_DECIMALS: 2,
  /** Maximum length for orderNumber */
  MAX_ORDER_NUMBER_LENGTH: 10,
  /** Maximum length for udf fields */
  MAX_UDF_LENGTH: 20,
  /** Maximum length for description */
  MAX_DESCRIPTION_LENGTH: 512,
  /** Maximum length for jsonParams */
  MAX_JSON_PARAMS_LENGTH: 1024,
} as const;

/**
 * Environment variable names with prefix
 */
export const ENV_VARS = {
  USERNAME: 'USERNAME',
  PASSWORD: 'PASSWORD',
  TERMINAL_ID: 'TERMINAL_ID',
  API_URL: 'API_URL',
  LANGUAGE: 'LANGUAGE',
  CURRENCY: 'CURRENCY',
  HTTP_METHOD: 'HTTP_METHOD',
  HTTP_TIMEOUT_MS: 'HTTP_TIMEOUT_MS',
  HTTP_CONNECT_TIMEOUT_MS: 'HTTP_CONNECT_TIMEOUT_MS',
  HTTP_VERIFY_SSL: 'HTTP_VERIFY_SSL',
  LOG_LEVEL: 'LOG_LEVEL',
  LOG_DEV: 'LOG_DEV',
} as const;
