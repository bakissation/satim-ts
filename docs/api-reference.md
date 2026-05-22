# API reference

The SDK exposes one factory, `createSatimClient(config)`, returning a client with four methods. For the raw gateway behaviour behind each call see the **[SATIM gateway reference](./satim-gateway.md)**.

## `register(params)`

Creates a payment order and returns a `formUrl` to redirect the customer to.

```typescript
const response = await client.register({
  orderNumber: 'ORD001',      // Required: unique order id (max 10 chars)
  amount: 5000,                // Required: amount in DZD (min 50). number | string | bigint
  returnUrl: 'https://...',    // Required: success redirect URL
  failUrl: 'https://...',      // Optional: failure redirect URL
  description: 'Order desc',   // Optional
  udf1: 'REF001',              // Required: your reference
  udf2: 'Extra1',              // Optional: udf2–udf5
  language: 'fr',              // Optional: override default language
  currency: '012',             // Optional: override default currency
  fundingTypeIndicator: 'CP',  // Optional: 'CP' or '698' (bill payment)
  idempotencyKey: 'uuid-...',  // Optional: prevents duplicate orders (sent as externalRequestId)
  additionalParams: { customField: 'value' }, // Optional: merged into jsonParams
});

if (response.isSuccessful()) {
  console.log(response.orderId, response.formUrl);
}
```

**Idempotency:** pass a unique `idempotencyKey` (e.g. a UUID) per order to avoid duplicate creation on retries.

## `getOrderStatus(orderId, language?)`

Returns the current status/details of an order. Call this **server-side** after the customer redirect.

```typescript
import { interpretOrderStatus } from '@bakissation/satim';

const response = await client.getOrderStatus(orderId);
if (response.isPaid()) {
  console.log(response.amount, response.pan, response.cardholderName, response.approvalCode);
} else {
  console.log(interpretOrderStatus(response.orderStatus));
}
console.log(response.raw); // full gateway payload
```

See **[Order status](./order-status.md)** for the status codes.

## `confirm(orderId, language?)`

Alias of `getOrderStatus()` — same endpoint, identical response. Use whichever name reads better.

## `refund(orderId, amount, language?)`

Refunds a completed transaction (multiple partial refunds allowed, up to the deposited total).

```typescript
const response = await client.refund(orderId, 5000);
if (response.isSuccessful()) console.log('Refunded');
```

## Amount handling

Amounts are in DZD and converted to minor units (×100) automatically. Helpers accept `number`, `string`, or `bigint`.

```typescript
import { toMinorUnits, fromMinorUnits } from '@bakissation/satim';

toMinorUnits(5000);     // "500000"
toMinorUnits('806.5');  // "80650"
toMinorUnits(5000n);    // "500000" (bigint)
fromMinorUnits(80650);  // 806.5

// Rules: min 50 DZD · max 2 decimals · non-negative
```

For large amounts requiring precise integer arithmetic, pass `bigint` directly to `register()` / `refund()`.

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
  if (error instanceof ValidationError)      console.log(error.message, error.code);
  else if (error instanceof SatimApiError)   console.log(mapSatimErrorCode('register', error.satimErrorCode));
  else if (error instanceof TimeoutError)    console.log('Timeout after', error.timeoutMs, 'ms');
  else if (error instanceof HttpError)       console.log('HTTP', error.httpStatus);
  else if (error instanceof ConfigError)     console.log('Missing config:', error.missingKeys);
}
```

Raw gateway error codes per endpoint: **[SATIM gateway reference → error codes](./satim-gateway.md)**.

## TypeScript

```typescript
import type {
  SatimConfig, SatimClient,
  RegisterOrderParams, RegisterOrderResponse,
  ConfirmOrderResponse, RefundOrderResponse,
  SatimLanguage, OrderStatusCode,
} from '@bakissation/satim';
```
