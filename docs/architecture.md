# Architecture & internals

How the SDK is built — for contributors and the curious. Usage lives in [api-reference](./api-reference.md).

## Module map

```
src/
├── index.ts      # Public barrel — re-exports the supported surface only
├── client.ts     # createSatimClient + resolveConfig + register/confirm/getOrderStatus/refund + default logger
├── http.ts       # makeRequest<T>() — the single fetch wrapper (timeout, POST/GET, hooks)
├── amount.ts     # toMinorUnits / fromMinorUnits / validateAmount
├── errors.ts     # SatimError hierarchy + mapSatimErrorCode
├── redact.ts     # redactValue / redactObject / redactUrl / createSafeLogData (log-safety)
├── env.ts        # fromEnv() — build SatimConfig from SATIM_* env vars
├── constants.ts  # ENDPOINTS · API_BASE_URLS · DEFAULTS · VALIDATION · ENV_VARS
└── types.ts      # All types + OrderStatus enum + interpretOrderStatus
```

Design constraints: **zero runtime dependencies** (native `fetch`), **strict TypeScript**, **ESM + CJS** output via tsup, and **no secret leakage** in logs or errors.

## Request lifecycle

`createSatimClient(config)` resolves config once (applies defaults, builds the logger) and returns a client whose methods are thin wrappers over per-operation functions in `client.ts`. A `register` call flows:

```
client.register(params)
  → validate params (ValidationError on bad input)
  → toMinorUnits(amount)                        # amount.ts — DZD × 100, bigint-safe
  → build jsonParams { force_terminal_id, udf1..udf5, ...additionalParams }
  → build request body { userName, password, orderNumber, amount, currency, returnUrl, ... }
  → makeRequest('register.do', body)            # http.ts
       → POST (default) with timeout + connect timeout
       → onRequest hook (redacted)              # redact.ts
       → parse JSON; onResponse hook
  → normalize raw → RegisterOrderResponse       # adds isSuccessful(), exposes orderId/formUrl, keeps .raw
  → throw typed error on transport/API failure  # errors.ts
```

`confirm` / `getOrderStatus` (same endpoint, `acknowledgeTransaction.do`) and `refund` (`refund.do`) follow the same shape. Endpoint paths come from `constants.ts` (`ENDPOINTS`).

## HTTP layer (`http.ts`)

`makeRequest<T>(baseUrl, endpoint, params, options)` is the only place that touches the network:
- Defaults to **POST** (credentials stay out of URLs/logs); `GET` is supported but logs a warning.
- Enforces request + connection **timeouts** (→ `TimeoutError`).
- Invokes `onRequest` / `onResponse` middleware hooks; sensitive fields are redacted via `redact.ts`.
- Returns a typed `HttpResponse<T>`; non-OK HTTP → `HttpError`.

## Errors (`errors.ts`)

All errors extend **`SatimError`** (which carries a `kind: SatimErrorKind`):

| Class | When |
|-------|------|
| `ConfigError` | Missing/invalid configuration (e.g. required env vars) — carries `missingKeys` |
| `ValidationError` | Bad input before any request — carries `code` |
| `HttpError` | Non-OK HTTP response — carries `httpStatus` |
| `TimeoutError` | Request/connection timeout — carries `timeoutMs` |
| `SatimApiError` | Gateway returned a non-zero `errorCode` — carries `satimErrorCode` |

`mapSatimErrorCode(operation, code)` turns a numeric gateway code into a human-readable message per operation (register / confirm / refund).

## Log safety (`redact.ts`)

`redactObject` / `redactValue` mask sensitive keys (passwords, PAN, credentials); `redactUrl` strips secrets from query strings; `createSafeLogData` assembles a safe payload for the logger. The SDK never logs raw credentials or card data.

## Configuration (`env.ts`, `constants.ts`)

`fromEnv(options)` reads `SATIM_*` (custom prefix supported), validates required keys (throws `ConfigError`), and returns a `SatimConfig`. `constants.ts` holds endpoint paths, base URLs (`API_BASE_URLS`), defaults, validation limits, and env-var names.

## Tests

`vitest`, network mocked with `undici`'s `MockAgent` — no credentials or live calls. Run `npm test`. See [CONTRIBUTING](../CONTRIBUTING.md) for the full gate (lint, typecheck, build, test).
