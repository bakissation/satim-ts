import { HttpError, TimeoutError } from './errors.js';
import type { HttpMethod, SatimLogger } from './types.js';
import { createSafeLogData } from './redact.js';

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /** HTTP method */
  method: HttpMethod;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Logger instance */
  logger?: SatimLogger;
  /** Custom fetch function */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  /** Hook called before request */
  onRequest?: (endpoint: string, params: Record<string, string>) => void;
  /** Hook called after response */
  onResponse?: (endpoint: string, response: unknown) => void;
}

/**
 * HTTP response with parsed data
 */
export interface HttpResponse<T> {
  /** HTTP status code */
  status: number;
  /** Response data */
  data: T;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Joins base URL with path safely
 */
function joinUrl(base: string, path: string): string {
  const baseClean = base.endsWith('/') ? base.slice(0, -1) : base;
  const pathClean = path.startsWith('/') ? path : `/${path}`;
  return baseClean + pathClean;
}

/**
 * Builds query string from parameters
 */
function buildQueryString(params: Record<string, string>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, value);
  }
  return searchParams.toString();
}

/**
 * Makes an HTTP request to the Satim API
 *
 * @param baseUrl - Base URL of the API
 * @param endpoint - Endpoint path
 * @param params - Request parameters
 * @param options - Request options
 * @returns Response with parsed JSON data
 */
export async function makeRequest<T>(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string>,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const startTime = Date.now();
  const { method, timeoutMs, logger, onRequest, onResponse } = options;
  // Use custom fetch if provided, otherwise use global fetch
  const fetchFn = options.fetch ?? fetch;

  let url: string;
  let requestInit: RequestInit;

  if (method === 'GET') {
    // For GET, append params to URL
    const queryString = buildQueryString(params);
    url = joinUrl(baseUrl, endpoint) + '?' + queryString;
    requestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    };
  } else {
    // For POST, send as form-urlencoded body
    url = joinUrl(baseUrl, endpoint);
    const body = new URLSearchParams(params);
    requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    };
  }

  // Create abort controller with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  requestInit.signal = controller.signal;

  try {
    // Call onRequest hook with redacted params
    if (onRequest) {
      const safeParams = createSafeLogData(params) as Record<string, string>;
      onRequest(endpoint, safeParams);
    }

    // Log request start (only endpoint name for safety)
    logger?.debug(
      createSafeLogData({
        endpoint,
        method,
      }),
      'Satim API request started'
    );

    const response = await fetchFn(url, requestInit);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      logger?.warn(
        createSafeLogData({
          endpoint,
          method,
          durationMs,
          statusCode: response.status,
        }),
        'Satim API request failed with HTTP error'
      );

      throw new HttpError(`HTTP error: ${response.status} ${response.statusText}`, {
        httpStatus: response.status,
      });
    }

    // Parse JSON response
    const data = (await response.json()) as T;

    // Call onResponse hook
    if (onResponse) {
      onResponse(endpoint, data);
    }

    // Log successful response (without sensitive data)
    const logData = createSafeLogData({
      endpoint,
      method,
      durationMs,
      statusCode: response.status,
    });

    // Extract error code from response if present
    const dataRecord = data as Record<string, unknown>;
    const errorCode =
      dataRecord?.['errorCode'] ?? dataRecord?.['ErrorCode'];
    if (errorCode !== undefined) {
      logData.satimErrorCode = normalizeErrorCode(errorCode);
    }

    logger?.info(logData, 'Satim API request completed');

    return {
      status: response.status,
      data,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      logger?.error(
        createSafeLogData({
          endpoint,
          method,
          durationMs,
        }),
        'Satim API request timed out'
      );

      throw new TimeoutError(
        `Request timed out after ${timeoutMs}ms`,
        timeoutMs,
        error
      );
    }

    // Re-throw known errors
    if (error instanceof HttpError || error instanceof TimeoutError) {
      throw error;
    }

    // Wrap unknown errors
    logger?.error(
      createSafeLogData({
        endpoint,
        method,
        durationMs,
      }),
      'Satim API request failed with network error'
    );

    throw new HttpError(
      'Network error occurred',
      {
        cause: error instanceof Error ? error : undefined,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normalizes error code to number
 */
function normalizeErrorCode(code: unknown): number {
  if (typeof code === 'number') {
    return code;
  }
  if (typeof code === 'string') {
    const parsed = parseInt(code, 10);
    return isNaN(parsed) ? -1 : parsed;
  }
  return -1;
}
