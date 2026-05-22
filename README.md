# @bakissation/satim

A **production-grade TypeScript SDK** for the [SATIM](https://www.satim.dz) (SATIM-IPAY) payment gateway — accept **CIB** and **Edahabia** card payments in Algeria with full type safety, zero runtime dependencies, and a security-first design.

[![npm](https://img.shields.io/npm/v/@bakissation/satim?label=npm&color=cb3837)](https://www.npmjs.com/package/@bakissation/satim)
[![CI](https://github.com/bakissation/satim-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/bakissation/satim-ts/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@bakissation/satim?color=blue)](./LICENSE)

- 💳 **CIB & Edahabia** — register a payment, check its status, and refund — the full SATIM order lifecycle behind one typed client.
- 🔒 **Secure by default** — credentials are never logged, TLS is always enforced, requests go over **POST**, and idempotency keys prevent double charges.
- 🧩 **Type-safe & zero-dependency** — strict TypeScript types for every request and response; uses native `fetch`; ships both **ESM and CommonJS**.
- 🛠️ **Production-ready** — typed error classes, amount precision (`number` / `string` / `bigint`), pluggable fetch + middleware hooks, and adapters for any logger.

> 📖 **[Read the case study →](https://berkati.xyz/case-studies/satim-ts-payments-sdk/)** — why this SDK exists, and how it turns SATIM integration from hours of hand-rolled HTTP into minutes.

## Installation

```bash
npm install @bakissation/satim
```

Requires **Node.js ≥ 18**. No runtime dependencies.

## Quick start

```typescript
import { createSatimClient, fromEnv, interpretOrderStatus } from '@bakissation/satim';

// Load configuration from SATIM_* environment variables
const client = createSatimClient(fromEnv());

// 1) Register an order — redirect the customer to the returned payment page
const order = await client.register({
  orderNumber: 'ORD001',
  amount: 5000,                 // 5000 DZD
  returnUrl: 'https://yoursite.com/payment/success',
  failUrl: 'https://yoursite.com/payment/fail',
  udf1: 'INV001',               // your reference (required)
});

if (order.isSuccessful()) {
  console.log('Redirect to:', order.formUrl);
}

// 2) After the customer returns, check the status — ALWAYS server-side
const status = await client.getOrderStatus(order.orderId!);

if (status.isPaid()) {
  console.log('Payment successful!', status.orderNumber);
} else {
  console.log('Status:', interpretOrderStatus(status.orderStatus));
}

// 3) Refund a completed transaction
const refund = await client.refund(order.orderId!, 5000);
if (refund.isSuccessful()) console.log('Refund processed');
```

> Configure via environment variables (recommended) or pass config explicitly — see [Configuration](#configuration). Never hardcode merchant credentials.

## Configuration

All configuration can be loaded from environment variables (the `SATIM_` prefix is the default; pass a custom one to `fromEnv({ prefix: 'PAYMENT_' })`).

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SATIM_USERNAME` | Merchant login from SATIM | `merchant_user` |
| `SATIM_PASSWORD` | Merchant password from SATIM | `secure_password` |
| `SATIM_TERMINAL_ID` | Terminal ID assigned by the bank | `E010XXXXXX` |

### API endpoint

| Variable | Description | Default |
|----------|-------------|---------|
| `SATIM_API_URL` | API base URL | `https://test2.satim.dz/payment/rest` |

- **Test**: `https://test2.satim.dz/payment/rest`
- **Production**: `https://satim.dz/payment/rest`

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SATIM_LANGUAGE` | Payment page language (`fr`, `en`, `ar`) | `fr` |
| `SATIM_CURRENCY` | Currency code (ISO 4217) | `012` (DZD) |
| `SATIM_HTTP_METHOD` | HTTP method (`POST`, `GET`). **GET not recommended.** | `POST` |
| `SATIM_HTTP_TIMEOUT_MS` | Request timeout (ms) | `30000` |
| `SATIM_HTTP_CONNECT_TIMEOUT_MS` | Connection timeout (ms) | `10000` |
| `SATIM_LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) | `info` |
| `SATIM_LOG_DEV` | Enable dev logging | `true` (when `NODE_ENV !== production`) |

> **TLS is always enforced** for security and is not configurable.

### Manual configuration

For cases where environment variables aren't suitable:

```typescript
import { createSatimClient, API_BASE_URLS } from '@bakissation/satim';

const client = createSatimClient({
  userName: 'your_username',
  password: 'your_password',
  terminalId: 'E010XXXXXX',
  apiBaseUrl: API_BASE_URLS.PRODUCTION, // or API_BASE_URLS.TEST
  language: 'fr',
  currency: '012',
  http: { method: 'POST', timeoutMs: 30000 },
  logger: { enableDevLogging: false, level: 'warn' },
});
```

## API reference

### Register order

Creates a new payment order.

```typescript
const response = await client.register({
  orderNumber: 'ORD001',      // Required: unique order ID (max 10 chars)
  amount: 5000,                // Required: amount in DZD (min 50). Accepts number, string, or bigint
  returnUrl: 'https://...',    // Required: success redirect URL
  failUrl: 'https://...',      // Optional: failure redirect URL
  description: 'Order desc',   // Optional: order description
  udf1: 'REF001',              // Required: your reference
  udf2: 'Extra1',              // Optional: additional data (udf2–udf5)
  language: 'fr',              // Optional: override default language
  currency: '012',             // Optional: override default currency
  fundingTypeIndicator: 'CP',  // Optional: 'CP' or '698' (bill payment)
  idempotencyKey: 'uuid-...',  // Optional: prevents duplicate orders (sent as externalRequestId)
  additionalParams: {          // Optional: custom fields merged into jsonParams
    customField: 'value',
  },
});

if (response.isSuccessful()) {
  console.log('Order ID:', response.orderId);
  console.log('Payment URL:', response.formUrl);
}
```

#### Idempotency key

Pass a unique `idempotencyKey` (e.g. a UUID) per order to prevent duplicate creation on retries. The SDK forwards it to SATIM as `externalRequestId`.

```typescript
import { randomUUID } from 'node:crypto';

await client.register({
  orderNumber: 'ORD001',
  amount: 5000,
  returnUrl: 'https://yoursite.com/success',
  udf1: 'INV001',
  idempotencyKey: randomUUID(),
});
```

### Get order status

Checks the current status of an order — use this after the customer redirect to verify payment. **Always call this server-side.**

```typescript
import { interpretOrderStatus } from '@bakissation/satim';

const response = await client.getOrderStatus(orderId, 'fr');

if (response.isSuccessful()) {
  console.log('Status:', interpretOrderStatus(response.orderStatus));

  if (response.isPaid()) {
    console.log('Order Status:', response.orderStatus); // 2 = paid
    console.log('Amount:', response.amount);
    console.log('Card:', response.pan);                 // Masked: 6280****7215
    console.log('Cardholder:', response.cardholderName);
    console.log('Approval Code:', response.approvalCode);
  }
}

// Full raw payload is always available
console.log(response.raw);
```

`interpretOrderStatus(code)` converts any SATIM order status code into a human-readable description (and handles `null` / unknown codes gracefully).

#### Confirm order (alias)

`client.confirm()` is an alias of `getOrderStatus()` — both call the same SATIM endpoint (`acknowledgeTransaction.do`) and return identical responses. Use whichever name reads better in your code.

```typescript
const response = await client.confirm(orderId, 'fr');
if (response.isPaid()) console.log('Payment successful!');
```

### Refund order

Refunds a completed transaction.

```typescript
const response = await client.refund(orderId, 5000, 'fr');
if (response.isSuccessful()) console.log('Refund successful');
```

## Amount handling

Amounts are given in DZD and converted to minor units (×100) automatically. Helpers accept `number`, `string`, or `bigint`.

```typescript
import { toMinorUnits, fromMinorUnits } from '@bakissation/satim';

toMinorUnits(5000);     // "500000"
toMinorUnits('806.5');  // "80650"
toMinorUnits(5000n);    // "500000" (bigint)
fromMinorUnits(80650);  // 806.5

// Rules: min 50 DZD · max 2 decimal places · non-negative
```

For large amounts requiring precise integer arithmetic, pass `bigint` directly to `register()` / `refund()`.

## Order status codes

```typescript
import { OrderStatus, interpretOrderStatus } from '@bakissation/satim';

if (response.orderStatus === OrderStatus.DEPOSITED) {
  // Payment completed
}

interpretOrderStatus(2); // "Payment completed successfully"

// OrderStatus.REGISTERED_NOT_PAID (0) · UNKNOWN_DECLINE (-1) · APPROVED (1)
// DEPOSITED (2, paid) · REVERSED (3) · REFUNDED (4) · DECLINED (6) · …
```

## Error handling

Every failure throws a typed error extending `SatimError`:

```typescript
import {
  SatimError, ConfigError, ValidationError,
  HttpError, TimeoutError, SatimApiError, mapSatimErrorCode,
} from '@bakissation/satim';

try {
  await client.register({ /* ... */ });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message, error.code);
  } else if (error instanceof SatimApiError) {
    console.log('API error:', mapSatimErrorCode('register', error.satimErrorCode));
  } else if (error instanceof TimeoutError) {
    console.log('Timeout after', error.timeoutMs, 'ms');
  } else if (error instanceof HttpError) {
    console.log('HTTP error:', error.httpStatus);
  } else if (error instanceof ConfigError) {
    console.log('Missing config:', error.missingKeys);
  }
}
```

### SATIM error codes

| Code | Register | Confirm / Status | Refund |
|------|----------|------------------|--------|
| 0 | Success | Success | Success |
| 1 | Order already processed | – | – |
| 2 | – | Payment credentials error | – |
| 3 | Unknown currency | – | – |
| 4 | Required param missing | – | – |
| 5 | Invalid parameter | Access denied | Access denied / Invalid amount |
| 6 | – | Unregistered order | Unregistered order |
| 7 | System error | System error | System error |
| 14 | Invalid paymentway | – | – |

## Advanced configuration

<details>
<summary><strong>Custom fetch, middleware hooks, and loggers</strong></summary>

### Custom fetch

```typescript
const client = createSatimClient({
  userName, password, terminalId, apiBaseUrl,
  http: {
    fetch: async (url, init) => fetch(url, { ...init /* proxy, custom TLS, etc. */ }),
  },
});
```

### Middleware hooks

```typescript
const client = createSatimClient({
  userName, password, terminalId, apiBaseUrl,
  http: {
    onRequest: (endpoint, params) => console.log(`[REQ] ${endpoint}`, params),  // sensitive data is auto-redacted
    onResponse: (endpoint, response) => console.log(`[RES] ${endpoint}`, response),
  },
});
```

### Custom logger (pino / winston / …)

```typescript
import { createSatimClient, SatimLogger } from '@bakissation/satim';
import pino from 'pino';

const log = pino({ level: 'debug' });
const customLogger: SatimLogger = {
  debug: (o, m) => log.debug(o, m),
  info: (o, m) => log.info(o, m),
  warn: (o, m) => log.warn(o, m),
  error: (o, m) => log.error(o, m),
};

const client = createSatimClient({ userName, password, terminalId, apiBaseUrl, logger: { customLogger } });
```

</details>

## Security best practices

1. **Verify server-side** — never trust client-side callbacks; always call `getOrderStatus()` / `confirm()` from your server.
2. **Keep POST** — the default keeps credentials out of URLs and logs (`GET` logs a warning).
3. **Credentials in env, never in code** — see [`.env.example`](./.env.example), and never commit `.env`.
4. **Use idempotency keys** to avoid double charges on retries.
5. **Disable dev logging in production** — set `NODE_ENV=production` or `SATIM_LOG_DEV=false`.

The SDK never logs passwords, usernames, terminal IDs, or card data, and always enforces TLS. Found a vulnerability? See [SECURITY.md](./SECURITY.md) — please don't open a public issue.

## Test cards

For the sandbox environment (`test2.satim.dz`):

| Card Number | CVV2 | Expiry | Password | Status |
|-------------|------|--------|----------|--------|
| 6280581110007215 | 373 | 01/2027 | 123456 | Valid |
| 6280581110006712 | 897 | 01/2027 | 123456 | Temporarily blocked |
| 6280580610061110 | 260 | 01/2027 | 123456 | Insufficient balance |
| 6280580610061219 | 049 | 01/2027 | 123456 | Limit exceeded |
| 6280581110006514 | 205 | 01/2027 | 123456 | Incorrect CVV2 |
| 6280580610061011 | 992 | 01/2027 | 123456 | Valid credit card |

## TypeScript

Full type definitions are bundled:

```typescript
import type {
  SatimConfig, SatimClient,
  RegisterOrderParams, RegisterOrderResponse,
  ConfirmOrderResponse, RefundOrderResponse,
  SatimLanguage, OrderStatusCode,
} from '@bakissation/satim';
```

## Contributing

Issues and PRs are welcome — please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md) first. Releases are automated from [Conventional Commits](https://www.conventionalcommits.org/) via semantic-release; **don't bump the version or edit the changelog by hand**.

## Credits

Built and maintained by **Abdelbaki Berkati** — [berkati.xyz](https://berkati.xyz) · [@bakissation](https://github.com/bakissation).
📖 [Read the case study →](https://berkati.xyz/case-studies/satim-ts-payments-sdk/)

## License

[MIT](./LICENSE)
