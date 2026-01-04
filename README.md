# @bakissation/satim

Production-grade TypeScript SDK for the Satim (SATIM-IPAY) payment gateway in Algeria.

## Features

- Full TypeScript support with strict types
- ESM and CommonJS builds
- Minimal dependencies (uses native `fetch`)
- Secure by default: credentials never logged, TLS always enforced
- Fully configurable via environment variables
- Comprehensive error handling
- Amount conversion utilities (supports `number`, `string`, and `bigint`)
- Pluggable fetch and middleware hooks for custom integrations
- Idempotency key support to prevent duplicate orders
- Custom logger support for integration with logging frameworks

## Installation

```bash
npm install @bakissation/satim
```

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Satim credentials:

```bash
# Required
SATIM_USERNAME=your_merchant_username
SATIM_PASSWORD=your_merchant_password
SATIM_TERMINAL_ID=E010XXXXXX

# API URL (test or production)
SATIM_API_URL=https://test2.satim.dz/payment/rest
```

### 2. Use the SDK

```typescript
import { createSatimClient, fromEnv } from '@bakissation/satim';

// Load configuration from environment variables
const client = createSatimClient(fromEnv());

// Register an order
const registerResponse = await client.register({
  orderNumber: 'ORD001',
  amount: 5000, // 5000 DZD
  returnUrl: 'https://yoursite.com/payment/success',
  failUrl: 'https://yoursite.com/payment/fail',
  udf1: 'INV001', // Required: your reference
});

if (registerResponse.isSuccessful()) {
  // Redirect customer to payment page
  console.log('Redirect to:', registerResponse.formUrl);
}

// After customer returns, confirm the payment (server-side)
const confirmResponse = await client.confirm(registerResponse.orderId!);

if (confirmResponse.isPaid()) {
  console.log('Payment successful!');
  console.log('Order:', confirmResponse.orderNumber);
}

// Refund a transaction
const refundResponse = await client.refund('ORDER_ID', 5000);

if (refundResponse.isSuccessful()) {
  console.log('Refund processed');
}
```

## Environment Variables Reference

All configuration can be set via environment variables with the `SATIM_` prefix.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SATIM_USERNAME` | Merchant login from Satim | `merchant_user` |
| `SATIM_PASSWORD` | Merchant password from Satim | `secure_password` |
| `SATIM_TERMINAL_ID` | Terminal ID assigned by bank | `E010XXXXXX` |

### API Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SATIM_API_URL` | API base URL | `https://test2.satim.dz/payment/rest` |

**Available API URLs:**
- **Test**: `https://test2.satim.dz/payment/rest`
- **Production**: `https://satim.dz/payment/rest`

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SATIM_LANGUAGE` | Payment page language (`fr`, `en`, `ar`) | `fr` |
| `SATIM_CURRENCY` | Currency code (ISO 4217) | `012` (DZD) |
| `SATIM_HTTP_METHOD` | HTTP method (`POST`, `GET`). **GET not recommended.** | `POST` |
| `SATIM_HTTP_TIMEOUT_MS` | Request timeout (ms) | `30000` |
| `SATIM_HTTP_CONNECT_TIMEOUT_MS` | Connection timeout (ms) | `10000` |
| `SATIM_LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) | `info` |
| `SATIM_LOG_DEV` | Enable dev logging | `true` (if NODE_ENV !== production) |

> **Note:** TLS is always enforced for security. The `SATIM_HTTP_VERIFY_SSL` environment variable has been removed.

### Custom Prefix

You can use a custom prefix for environment variables:

```typescript
// Use PAYMENT_ prefix instead of SATIM_
const config = fromEnv({ prefix: 'PAYMENT_' });
```

## Manual Configuration

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
  http: {
    method: 'POST',
    timeoutMs: 30000,
  },
  logger: {
    enableDevLogging: false,
    level: 'warn',
  },
});
```

## Advanced Configuration

### Custom Fetch Function

Provide a custom fetch function for advanced HTTP handling (e.g., proxies, custom TLS, testing):

```typescript
import { createSatimClient } from '@bakissation/satim';

const client = createSatimClient({
  userName: 'your_username',
  password: 'your_password',
  terminalId: 'E010XXXXXX',
  apiBaseUrl: 'https://satim.dz/payment/rest',
  http: {
    fetch: async (url, init) => {
      // Custom fetch implementation
      console.log('Requesting:', url);
      return fetch(url, {
        ...init,
        // Add custom headers, proxy settings, etc.
      });
    },
  },
});
```

### Middleware Hooks

Use `onRequest` and `onResponse` hooks for logging, metrics, or debugging:

```typescript
const client = createSatimClient({
  userName: 'your_username',
  password: 'your_password',
  terminalId: 'E010XXXXXX',
  apiBaseUrl: 'https://satim.dz/payment/rest',
  http: {
    onRequest: (endpoint, params) => {
      console.log(`[REQUEST] ${endpoint}`, params);
      // Note: sensitive data is automatically redacted
    },
    onResponse: (endpoint, response) => {
      console.log(`[RESPONSE] ${endpoint}`, response);
    },
  },
});
```

### Custom Logger

Integrate with your logging framework (winston, pino, bunyan, etc.):

```typescript
import { createSatimClient, SatimLogger } from '@bakissation/satim';
import pino from 'pino';

const pinoLogger = pino({ level: 'debug' });

// Create a SatimLogger adapter
const customLogger: SatimLogger = {
  debug: (obj, msg) => pinoLogger.debug(obj, msg),
  info: (obj, msg) => pinoLogger.info(obj, msg),
  warn: (obj, msg) => pinoLogger.warn(obj, msg),
  error: (obj, msg) => pinoLogger.error(obj, msg),
};

const client = createSatimClient({
  userName: 'your_username',
  password: 'your_password',
  terminalId: 'E010XXXXXX',
  apiBaseUrl: 'https://satim.dz/payment/rest',
  logger: {
    customLogger,
  },
});
```

#### Rotating Logger Example

For production environments with log rotation:

```typescript
import { createSatimClient, SatimLogger } from '@bakissation/satim';
import winston from 'winston';
import 'winston-daily-rotate-file';

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/satim-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

const winstonLogger = winston.createLogger({
  transports: [transport],
});

const customLogger: SatimLogger = {
  debug: (obj, msg) => winstonLogger.debug(msg || '', obj),
  info: (obj, msg) => winstonLogger.info(msg || '', obj),
  warn: (obj, msg) => winstonLogger.warn(msg || '', obj),
  error: (obj, msg) => winstonLogger.error(msg || '', obj),
};

const client = createSatimClient({
  userName: process.env.SATIM_USERNAME!,
  password: process.env.SATIM_PASSWORD!,
  terminalId: process.env.SATIM_TERMINAL_ID!,
  apiBaseUrl: 'https://satim.dz/payment/rest',
  logger: { customLogger },
});
```

## API Reference

### Register Order

Creates a new payment order.

```typescript
const response = await client.register({
  orderNumber: 'ORD001',     // Required: unique order ID (max 10 chars)
  amount: 5000,               // Required: amount in DZD (min 50 DZD). Also accepts string or bigint (e.g., 5000n)
  returnUrl: 'https://...',   // Required: success redirect URL
  failUrl: 'https://...',     // Optional: failure redirect URL
  description: 'Order desc',  // Optional: order description
  udf1: 'REF001',            // Required: your reference
  udf2: 'Extra1',            // Optional: additional data
  udf3: 'Extra2',            // Optional
  udf4: 'Extra3',            // Optional
  udf5: 'Extra4',            // Optional
  language: 'fr',            // Optional: override default language
  currency: '012',           // Optional: override default currency
  fundingTypeIndicator: 'CP', // Optional: 'CP' or '698' for bill payment (top-level param)
  idempotencyKey: 'uuid-...',  // Optional: unique key to prevent duplicate orders
  additionalParams: {         // Optional: custom params for jsonParams
    customField: 'value',
  },
});

if (response.isSuccessful()) {
  console.log('Order ID:', response.orderId);
  console.log('Payment URL:', response.formUrl);
}
```

#### Idempotency Key

Use `idempotencyKey` to prevent duplicate order creation. Pass a unique value (e.g., UUID) for each order request. The SDK sends this as `externalRequestId` to the Satim API.

```typescript
import { randomUUID } from 'crypto';

const response = await client.register({
  orderNumber: 'ORD001',
  amount: 5000,
  returnUrl: 'https://yoursite.com/success',
  udf1: 'INV001',
  idempotencyKey: randomUUID(), // Prevents duplicate orders on retry
});
```

#### Additional Parameters

Use `additionalParams` to include merchant-specific fields in the `jsonParams` payload:

```typescript
const response = await client.register({
  orderNumber: 'ORD001',
  amount: 5000,
  returnUrl: 'https://yoursite.com/success',
  udf1: 'INV001',
  additionalParams: {
    merchantRef: 'M123',
    customerId: 'C456',
  },
});
```

### Confirm Order

Confirms a payment after customer redirect. **Always call this server-side.**

```typescript
const response = await client.confirm(orderId, 'fr');

if (response.isSuccessful()) {
  console.log('Confirmation successful');

  if (response.isPaid()) {
    console.log('Order Status:', response.orderStatus); // 2 = paid
    console.log('Amount:', response.amount);
    console.log('Card:', response.pan); // Masked: 6280****7215

    // Additional fields available in normalized response
    console.log('Cardholder:', response.cardholderName);
    console.log('Approval Code:', response.approvalCode);
    console.log('Authorization ID:', response.authorizationResponseId);
    console.log('Deposit Amount:', response.depositAmount);
    console.log('Currency:', response.currency);
    console.log('Description:', response.description);
    console.log('Client IP:', response.ip);
    console.log('Client ID:', response.clientId);
    console.log('Binding ID:', response.bindingId);
    console.log('Payment Account Ref:', response.paymentAccountReference);
    console.log('Extra Params:', response.params);
  }
}

// Access raw response for all fields
console.log(response.raw);
```

### Refund Order

Refunds a completed transaction.

```typescript
const response = await client.refund(orderId, 5000, 'fr');

if (response.isSuccessful()) {
  console.log('Refund successful');
}
```

## Amount Handling

Amounts are provided in DZD and automatically converted to minor units (x100). The SDK accepts `number`, `string`, or `bigint` values.

```typescript
import { toMinorUnits, fromMinorUnits } from '@bakissation/satim';

// Conversion utilities - supports number, string, and bigint
toMinorUnits(5000);     // "500000"
toMinorUnits('806.5');  // "80650"
toMinorUnits('50.01');  // "5001"
toMinorUnits(5000n);    // "500000" (bigint support)

fromMinorUnits(500000); // 5000
fromMinorUnits(80650);  // 806.5

// Validation rules:
// - Minimum: 50 DZD
// - Maximum 2 decimal places (for number/string)
// - Non-negative
```

### BigInt Support

For applications dealing with large amounts or requiring precise integer arithmetic, use `bigint`:

```typescript
// Register with bigint amount
const response = await client.register({
  orderNumber: 'ORD001',
  amount: 1000000n, // 1,000,000 DZD as bigint
  returnUrl: 'https://yoursite.com/success',
  udf1: 'LARGE_ORDER',
});

// Refund with bigint
await client.refund(orderId, 500000n); // 500,000 DZD as bigint
```

## Error Handling

```typescript
import {
  createSatimClient,
  SatimError,
  ConfigError,
  ValidationError,
  HttpError,
  TimeoutError,
  SatimApiError,
  mapSatimErrorCode,
} from '@bakissation/satim';

try {
  const response = await client.register({...});
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message);
    console.log('Code:', error.code); // e.g., 'INVALID_AMOUNT'
  } else if (error instanceof SatimApiError) {
    console.log('API error:', error.message);
    console.log('Satim code:', error.satimErrorCode);
    console.log('Description:', mapSatimErrorCode('register', error.satimErrorCode));
  } else if (error instanceof TimeoutError) {
    console.log('Timeout after:', error.timeoutMs, 'ms');
  } else if (error instanceof HttpError) {
    console.log('HTTP error:', error.httpStatus);
  } else if (error instanceof ConfigError) {
    console.log('Missing config:', error.missingKeys);
  }
}
```

### Satim Error Codes

| Code | Register | Confirm | Refund |
|------|----------|---------|--------|
| 0 | Success | Success | Success |
| 1 | Order already processed | - | - |
| 2 | - | Payment credentials error | - |
| 3 | Unknown currency | - | - |
| 4 | Required param missing | - | - |
| 5 | Invalid parameter | Access denied | Access denied/Invalid amount |
| 6 | - | Unregistered order | Unregistered order |
| 7 | System error | System error | System error |
| 14 | Invalid paymentway | - | - |

## Order Status Codes

```typescript
import { OrderStatus } from '@bakissation/satim';

if (response.orderStatus === OrderStatus.DEPOSITED) {
  // Payment completed
}

// Available statuses:
OrderStatus.REGISTERED_NOT_PAID  // 0
OrderStatus.UNKNOWN_DECLINE      // -1
OrderStatus.APPROVED             // 1
OrderStatus.DEPOSITED            // 2 (payment successful)
OrderStatus.REVERSED             // 3
OrderStatus.REFUNDED             // 4
OrderStatus.DECLINED             // 6
```

## Security Best Practices

1. **Never log credentials**: The SDK never logs passwords, usernames, terminal IDs, or card data.

2. **Always verify server-side**: Never trust client-side payment callbacks. Always call `confirm()` from your server.

3. **Use POST method**: The default `POST` method prevents credentials from appearing in URLs and logs. Using `GET` will log a warning.

4. **TLS always enforced**: The SDK always verifies TLS certificates. This is not configurable for security reasons.

5. **Environment variables**: Store credentials in environment variables, never in code. See `.env.example`.

6. **Never commit `.env`**: Add `.env` to your `.gitignore`.

7. **Disable dev logging in production**: Set `NODE_ENV=production` or `SATIM_LOG_DEV=false`.

8. **Use idempotency keys**: Use `idempotencyKey` in `register()` to prevent duplicate orders on retries.

## Test Cards

For testing in the sandbox environment (`test2.satim.dz`):

| Card Number | CVV2 | Expiry | Password | Status |
|-------------|------|--------|----------|--------|
| 6280581110007215 | 373 | 01/2027 | 123456 | Valid |
| 6280581110006712 | 897 | 01/2027 | 123456 | Temporarily blocked |
| 6280580610061110 | 260 | 01/2027 | 123456 | Insufficient balance |
| 6280580610061219 | 049 | 01/2027 | 123456 | Limit exceeded |
| 6280581110006514 | 205 | 01/2027 | 123456 | Incorrect CVV2 |
| 6280580610061011 | 992 | 01/2027 | 123456 | Valid credit card |

## TypeScript Support

Full type definitions are included:

```typescript
import type {
  SatimConfig,
  SatimClient,
  RegisterOrderParams,
  RegisterOrderResponse,
  ConfirmOrderResponse,
  RefundOrderResponse,
  SatimLanguage,
  OrderStatusCode,
} from '@bakissation/satim';
```

## Requirements

- Node.js >= 18
- TypeScript >= 5 (for development)

## License

MIT - Abdelbaki Berkati

## Contributing

Contributions are welcome! Please ensure tests pass:

```bash
npm test
npm run build
```

## Author

**Abdelbaki Berkati** ([@bakissation](https://github.com/bakissation))
