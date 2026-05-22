# Overview & concepts

Background for anyone integrating SATIM payments — what the system is, the players, and the vocabulary — before the [technical reference](./satim-gateway.md). Useful whether or not you use this SDK.

## What is SATIM-IPAY?

**SATIM** (Société d'Automatisation des Transactions Interbancaires et de Monétique) operates Algeria's interbank card network. **SATIM-IPAY** is its online card-acceptance system: it lets web merchants take **CIB** and **Edahabia** card payments over the internet using modern payment standards. It targets merchants selling goods/services online.

- **CIB** — the interbank card scheme issued by Algerian banks.
- **Edahabia** — Algérie Poste's card, also accepted online via the same gateway.
- **3DSecure** — SATIM-IPAY supports the standard cardholder-authentication protocol (Verified by Visa / Mastercard SecureCode), via static or dynamic **OTP**. The cardholder confirms the payment with a one-time code.
- **Anti-fraud** — SATIM applies a rule engine that filters transactions based on merchant parameters (configurable on request).

## How an online payment works

The merchant never touches card data — the customer enters it on SATIM's hosted page.

1. Customer places an order on the merchant site.
2. Merchant **registers** the order with the gateway and receives an `orderId` + a hosted **payment page URL** (`formUrl`).
3. Merchant **redirects** the customer to that page (in an independent browser context).
4. Customer enters CIB/Edahabia details and passes 3DSecure.
5. Gateway redirects the customer back to the merchant's `returnUrl`.
6. Merchant **confirms / fetches the order status** server-side and shows the result.

This SDK turns steps 2 and 6 into `register()` and `getOrderStatus()`. See [getting started](./getting-started.md).

## The merchant journey (slot → production)

Becoming a live SATIM merchant is a process, not just an API key:

1. **Onboarding / slot** — open a test slot on the CIBWEBLab console; SATIM provisions a user + virtual terminal and connection URLs.
2. **Develop & test** on the **certification** environment (`test2.satim.dz`) with the [test cards](./satim-gateway.md#test-cards-certification).
3. **Certification** — SATIM runs a checklist (cahier de recette) covering both your API integration and your payment page; a **PV** is issued. See [certification & requirements](./certification.md).
4. **Production** — switch the base URL to `satim.dz` and go live.

Already-certified merchants get a separate **staging** environment (`test.satim.dz`) for ongoing testing.

## Glossary

| Term | Meaning |
|------|---------|
| **EPG** | E-commerce Payment Gateway — SATIM's payment platform. |
| **orderNumber** | Your merchant-side order id (you generate it; unique per transaction; ≤ 10 chars). |
| **orderId / mdOrder** | The gateway's unique id for the order, returned by `register`. Used to confirm/refund. |
| **terminalId** (`force_terminal_id`) | The terminal the bank assigned to your merchant. One merchant can have several. |
| **formUrl** | The hosted SATIM payment page you redirect the customer to. |
| **jsonParams** | JSON blob of extra fields sent on register (`force_terminal_id`, `udf1`–`udf5`, …). |
| **udf1–udf5** | "User-defined fields" — your own reference values stored with the transaction. |
| **minor units** | Amounts are sent ×100 (5000 DA → `500000`). The SDK does this for you. |
| **approvalCode** | Authorization code from the payments network. |
| **OrderStatus** | Numeric lifecycle status of the order ([codes](./order-status.md)). `2` = paid. |
| **respCode / respCode_desc** | Result code + localized description returned in the confirmation `params`. |
| **3DSecure / OTP** | Cardholder authentication step (one-time password). |
| **PV (procès-verbal)** | The certification report SATIM issues when you pass. |

Next: **[getting started](./getting-started.md)** · **[gateway reference](./satim-gateway.md)** · **[certification](./certification.md)**.
