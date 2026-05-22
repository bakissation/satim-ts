# Getting started

## Install

```bash
npm install @bakissation/satim
```

Requires **Node.js ≥ 18**. No runtime dependencies.

## Configure

Configuration loads from `SATIM_*` environment variables (custom prefix via `fromEnv({ prefix: 'PAYMENT_' })`), or pass it explicitly.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SATIM_USERNAME` | Merchant login from SATIM | `merchant_user` |
| `SATIM_PASSWORD` | Merchant password from SATIM | `secure_password` |
| `SATIM_TERMINAL_ID` | Terminal ID assigned by the bank | `E010XXXXXX` |
| `SATIM_API_URL` | Gateway base URL — see [Environments](#environments) | `https://test2.satim.dz/payment/rest` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SATIM_LANGUAGE` | `fr` · `en` · `ar` | `fr` |
| `SATIM_CURRENCY` | ISO 4217 | `012` (DZD) |
| `SATIM_HTTP_METHOD` | `POST` · `GET` (GET not recommended) | `POST` |
| `SATIM_HTTP_TIMEOUT_MS` | Request timeout (ms) | `30000` |
| `SATIM_HTTP_CONNECT_TIMEOUT_MS` | Connection timeout (ms) | `10000` |
| `SATIM_LOG_LEVEL` | `debug` · `info` · `warn` · `error` | `info` |
| `SATIM_LOG_DEV` | Dev logging | `true` when `NODE_ENV !== production` |

> TLS is always enforced and not configurable.

## Environments

SATIM has three environments — set `SATIM_API_URL` (or `apiBaseUrl`) accordingly:

| Environment | Base URL | Use |
|-------------|----------|-----|
| Certification | `https://test2.satim.dz/payment/rest` | During certification (`API_BASE_URLS.TEST`) |
| Staging | `https://test.satim.dz/payment/rest` | Certified merchants, ongoing tests |
| Production | `https://satim.dz/payment/rest` | Live (`API_BASE_URLS.PRODUCTION`) |

Full gateway behaviour, error codes, and certification steps: **[SATIM gateway reference](./satim-gateway.md)**.

## First payment

```typescript
import { createSatimClient, fromEnv, interpretOrderStatus } from '@bakissation/satim';

const client = createSatimClient(fromEnv());

// 1) register → redirect the customer to order.formUrl
const order = await client.register({
  orderNumber: 'ORD001',
  amount: 5000,                 // 5000 DZD
  returnUrl: 'https://yoursite.com/payment/success',
  failUrl: 'https://yoursite.com/payment/fail',
  udf1: 'INV001',
});

// 2) after redirect, verify server-side
const status = await client.getOrderStatus(order.orderId!);
console.log(status.isPaid() ? 'Paid!' : interpretOrderStatus(status.orderStatus));

// 3) refund if needed
await client.refund(order.orderId!, 5000);
```

### Manual configuration

```typescript
import { createSatimClient, API_BASE_URLS } from '@bakissation/satim';

const client = createSatimClient({
  userName: 'your_username',
  password: 'your_password',
  terminalId: 'E010XXXXXX',
  apiBaseUrl: API_BASE_URLS.PRODUCTION, // or API_BASE_URLS.TEST, or the staging URL
  language: 'fr',
  currency: '012',
  http: { method: 'POST', timeoutMs: 30000 },
});
```

Next: **[API reference](./api-reference.md)** · **[Order status](./order-status.md)** · **[SATIM gateway reference](./satim-gateway.md)**.
