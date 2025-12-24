/**
 * Keys that should always be fully redacted (never shown)
 */
const FULLY_REDACTED_KEYS = new Set([
  'password',
  'userName',
  'username',
  'terminalId',
  'terminal_id',
  'force_terminal_id',
  'cvv',
  'cvv2',
  'cvc',
  'cardNumber',
  'pan',
  'Pin',
  'expiration',
]);

/**
 * Keys that should be partially shown (last N characters)
 */
const PARTIALLY_REDACTED_KEYS = new Set(['orderId', 'mdOrder', 'OrderNumber']);

/**
 * Number of characters to show for partially redacted values
 */
const PARTIAL_SHOW_CHARS = 6;

/**
 * Redacts a value based on its key
 *
 * @param key - The key name
 * @param value - The value to potentially redact
 * @returns Redacted or original value
 */
export function redactValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const keyLower = key.toLowerCase();

  // Check if fully redacted
  for (const redactedKey of FULLY_REDACTED_KEYS) {
    if (keyLower === redactedKey.toLowerCase()) {
      return '[REDACTED]';
    }
  }

  // Check if partially redacted
  for (const partialKey of PARTIALLY_REDACTED_KEYS) {
    if (keyLower === partialKey.toLowerCase()) {
      return redactPartial(value);
    }
  }

  return value;
}

/**
 * Shows only the last N characters of a value
 */
function redactPartial(value: unknown): string {
  const str = String(value);
  if (str.length <= PARTIAL_SHOW_CHARS) {
    return '[REDACTED]';
  }
  return `[REDACTED]...${str.slice(-PARTIAL_SHOW_CHARS)}`;
}

/**
 * Redacts an entire object, processing nested objects and arrays
 *
 * @param obj - Object to redact
 * @returns New object with sensitive values redacted
 */
export function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item));
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value);
    } else {
      result[key] = redactValue(key, value);
    }
  }

  return result;
}

/**
 * Redacts a URL by removing query parameters that contain sensitive data
 *
 * @param url - URL to redact
 * @returns URL with sensitive query params redacted
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Redact sensitive query parameters
    for (const key of parsed.searchParams.keys()) {
      const keyLower = key.toLowerCase();
      for (const redactedKey of FULLY_REDACTED_KEYS) {
        if (keyLower === redactedKey.toLowerCase()) {
          parsed.searchParams.set(key, '[REDACTED]');
        }
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return a safe fallback
    return '[INVALID_URL]';
  }
}

/**
 * Creates a safe log object from request/response data
 *
 * @param data - Data to make safe for logging
 * @returns Safe object for logging
 */
export function createSafeLogData(data: {
  endpoint?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: number;
  orderId?: string;
  mdOrder?: string;
}): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  if (data.endpoint) {
    safe.endpoint = data.endpoint;
  }
  if (data.method) {
    safe.method = data.method;
  }
  if (data.durationMs !== undefined) {
    safe.durationMs = data.durationMs;
  }
  if (data.statusCode !== undefined) {
    safe.statusCode = data.statusCode;
  }
  if (data.errorCode !== undefined) {
    safe.errorCode = data.errorCode;
  }

  // Partially redact order IDs
  if (data.orderId) {
    safe.orderId = redactPartial(data.orderId);
  }
  if (data.mdOrder) {
    safe.mdOrder = redactPartial(data.mdOrder);
  }

  return safe;
}
