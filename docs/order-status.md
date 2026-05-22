# Order status

After `getOrderStatus()` / `confirm()`, the `orderStatus` field carries the gateway's numeric status code. The SDK ships an enum and a human-readable mapper.

```typescript
import { OrderStatus, interpretOrderStatus } from '@bakissation/satim';

const response = await client.getOrderStatus(orderId);

if (response.orderStatus === OrderStatus.DEPOSITED) {
  // Payment completed (code 2)
}

interpretOrderStatus(response.orderStatus); // e.g. "Payment completed successfully"
interpretOrderStatus(null);                 // "Unknown status"
interpretOrderStatus(999);                  // "Unknown status code: 999"
```

## Codes

| Constant | Code | Meaning |
|----------|------|---------|
| `REGISTERED_NOT_PAID` | 0 | Order registered but not paid |
| `UNKNOWN_DECLINE` | -1 | Decline placeholder (no specific status matched) |
| `APPROVED` | 1 | Approved (one-phase) / preauth on hold (two-phase) |
| `DEPOSITED` | 2 | **Payment completed (paid)** |
| `REVERSED` | 3 | Authorization reversed |
| `REFUNDED` | 4 | Transaction refunded |
| `DECLINED` | 6 | Payment declined |
| `CARD_ADDED` | 7 | Card added to binding |
| `CARD_UPDATED` | 8 | Card binding updated |
| `CARD_VERIFIED` | 9 | Card verified |
| `RECURRING_ADDED` | 10 | Recurring template added |
| `DEBITED` | 11 | Amount debited |

`response.isPaid()` is a convenience for `orderStatus === 2`. See the **[SATIM gateway reference](./satim-gateway.md)** for the raw response fields.
