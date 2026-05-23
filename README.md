# @bakissation/satim

A **production-grade TypeScript SDK** for the [SATIM](https://www.satim.dz) (SATIM-IPAY) payment gateway — accept **CIB** and **Edahabia** card payments in Algeria with full type safety, a shared `Dinar` money type, and a security-first design.

[![npm](https://img.shields.io/npm/v/@bakissation/satim?label=npm&color=cb3837)](https://www.npmjs.com/package/@bakissation/satim)
[![CI](https://github.com/bakissation/satim-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/bakissation/satim-ts/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@bakissation/satim?color=blue)](./LICENSE)

- 💳 **Full order lifecycle** — register a payment, check its status, and refund — behind one typed client.
- 🔒 **Secure by default** — credentials never logged, TLS always enforced, POST by default, idempotency keys.
- 🧩 **Type-safe & dinar-backed** — strict types for every request/response; native `fetch`; **ESM + CommonJS**.
- 🛠️ **Production-ready** — typed errors, amount precision via [`@bakissation/dinar`](https://www.npmjs.com/package/@bakissation/dinar) (also accepts `number`/`string`/`bigint`), pluggable fetch + middleware hooks, logger adapters.

> 📖 **[Read the case study →](https://berkati.xyz/case-studies/satim-ts-payments-sdk/)** — why this SDK exists, and how it turns SATIM integration from hours of hand-rolled HTTP into minutes.

## Install

```bash
npm install @bakissation/satim
```

Requires **Node.js ≥ 18**. One runtime dependency: [`@bakissation/dinar`](https://www.npmjs.com/package/@bakissation/dinar) (the shared DZD money type), installed automatically.

## Quick start

```typescript
import { createSatimClient, fromEnv, interpretOrderStatus } from '@bakissation/satim';

const client = createSatimClient(fromEnv()); // reads SATIM_* env vars

// 1) register → redirect the customer to the payment page
const order = await client.register({
  orderNumber: 'ORD001',
  amount: 5000,                 // 5000 DZD
  returnUrl: 'https://yoursite.com/payment/success',
  failUrl: 'https://yoursite.com/payment/fail',
  udf1: 'INV001',
});
if (order.isSuccessful()) console.log('Redirect to:', order.formUrl);

// 2) after the customer returns, verify status server-side
const status = await client.getOrderStatus(order.orderId!);
console.log(status.isPaid() ? 'Paid!' : interpretOrderStatus(status.orderStatus));

// 3) refund a completed transaction
await client.refund(order.orderId!, 5000);
```

Configure with `SATIM_USERNAME`, `SATIM_PASSWORD`, `SATIM_TERMINAL_ID`, `SATIM_API_URL` (or pass config explicitly). Full setup → **[docs/getting-started](./docs/getting-started.md)**.

## Documentation

Full docs live in **[`docs/`](./docs/)**:

| | |
|---|---|
| [Overview & concepts](./docs/overview.md) | What SATIM-IPAY is, CIB & Edahabia, 3DSecure, the merchant journey, glossary |
| [Getting started](./docs/getting-started.md) | Install, configuration, environments, first payment |
| [API reference](./docs/api-reference.md) | `register` · `getOrderStatus` · `confirm` · `refund` · amounts · errors · types |
| [Order status](./docs/order-status.md) | Status codes + `interpretOrderStatus()` |
| [SATIM gateway reference](./docs/satim-gateway.md) | The raw REST API: endpoints, params, responses, error codes, environments, test cards |
| [Certification & requirements](./docs/certification.md) | Go-live process, merchant page (IHM) requirements, certification checklist |

## Security

Credentials are never logged, TLS is always enforced, and `POST` is the default. Always verify payments server-side. Found a vulnerability? See [SECURITY.md](./SECURITY.md) — please don't open a public issue.

## Contributing

Issues and PRs welcome — read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md). Releases are automated from [Conventional Commits](https://www.conventionalcommits.org/) via semantic-release; **don't bump the version or edit the changelog by hand**.

## Credits

Built and maintained by **Abdelbaki Berkati** — [berkati.xyz](https://berkati.xyz) · [@bakissation](https://github.com/bakissation).
📖 [Read the case study →](https://berkati.xyz/case-studies/satim-ts-payments-sdk/)

## License

[MIT](./LICENSE)
