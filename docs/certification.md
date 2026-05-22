# SATIM certification & merchant requirements

Before going live, a web merchant must pass **SATIM certification** (via the CIBWEBLab console). This page documents the process, the merchant page (IHM) requirements SATIM checks, and the full certification checklist (cahier de recette). It's a go-live reference — not specific to this SDK, but every SATIM integrator needs it.

> SATIM-IPAY is SATIM's online CIB card acceptance system. It supports **3DSecure** (Verified by Visa / Mastercard SecureCode, static or dynamic OTP) and an anti-fraud rule engine based on transaction filtering and merchant parameters.

## Process

| Step | What |
|------|------|
| **1. Open a slot** | Submit the slot form on the console. A slot grants user + virtual-terminal creation, support, and platform connection URLs. |
| **2. Develop & test** | Integrate against the **certification** environment (`https://test2.satim.dz/payment/rest`). |
| **3. Reserve** | Pick a certification date and wait for SATIM validation. Make sure development is finished first. |
| **4. Certify & validate** | SATIM's support team runs the certification checklist with you; a **PV (procès-verbal)** is issued at the end. You then validate completion. |

**Typical slot:** 25 test days for merchants / 15 for developers + 1 certification day. Extra days are ~5 000 DA/day (test or certification).

## Merchant page (IHM) requirements

SATIM verifies these on the merchant's payment page during certification:

- **Valid SSL** on the merchant site.
- **Final amount** shown prominently before payment — bold / larger / distinct font (e.g. `Montant : 5966.56 DA`).
- **General payment conditions** (agreed with the merchant's bank) **and** the product sale conditions displayed, with the customer explicitly acknowledging acceptance, **before** paying.
- **Captcha** on the page containing the payment button (anti-bot).
- **CIB logo** on the button that redirects to the SATIM payment page.
- Redirect to SATIM's payment page happens in an **independent browser context** (not embedded in the site/app).
- **Consistent language** across the entire flow (order summary, redirect, return page, receipts, error messages).

## Return page

After payment, on the merchant's `returnUrl`:

### Accepted — `respCode: "00"`, `ErrorCode: "0"`, `OrderStatus: "2"`

Display:
- `respCode_desc` (the JSON param)
- `orderId` (SATIM transaction id)
- `orderNumber` (merchant order number)
- `approvalCode` (authorization code)
- transaction date & time
- amount + currency
- payment method: **CIB / Edahabia**
- the SATIM toll-free number **3020**

And allow the customer to **print**, **download as PDF**, and **email** the payment receipt.

### Rejected — `OrderStatus: "3"`

Show "Votre transaction a été rejetée / Your transaction was rejected / تم رفض معاملتك" + the **3020** number.

### Otherwise

Show `respCode_desc`; if empty, show `actionCodeDescription`; + the **3020** number.

## Certification checklist (cahier de recette)

The merchant must demonstrate all of the following:

### Page & UX
| Test | Expected |
|------|----------|
| Valid SSL certificate | OK |
| Total amount highlighted (bold/distinct/larger), e.g. `Montant : 5966.56 DZD` | OK |
| General payment + sale conditions displayed | OK |
| Captcha on the payment-button page | OK |
| CIB/Edahabia logo on the redirect button | OK |
| Uniform language across the whole flow (summary → redirect → return → receipts → errors) | OK |

### Return-page fields
| Test | Expected |
|------|----------|
| Display `respCode_desc` | OK |
| Display `orderId` | OK |
| Display `orderNumber` | OK |
| Display `approvalCode` | OK |
| Payment method CIB/Edahabia | OK |
| Transaction date & time | OK |
| Payment amount | OK |
| SATIM toll-free 3020 shown | OK |
| Fallback to `actionCodeDescription` when `respCode_desc` empty | OK |
| Receipt: print + PDF download + email (PDF) | OK |

### Transaction tests (using the [certification test cards](./satim-gateway.md#test-cards-certification))
| Test | Expected |
|------|----------|
| Server-to-server connectivity check | Connection established |
| Valid CIB card | Payment accepted |
| Temporarily blocked card | Payment refused |
| Lost card | Payment refused |
| Stolen card | Payment refused |
| Wrong expiry entry | Payment refused |
| Card not on issuer server | Payment refused |
| Card limit exceeded | Payment refused |
| Insufficient balance | Payment refused |
| Wrong CVV2 | Payment refused |
| Wrong password | Payment refused |
| Exceeded password attempts (3 wrong) | Payment refused |
| Card not authorized for online payment | Payment refused |
| Card inactive for online payment | Payment refused |
| Terminal amount ceiling exceeded | Payment refused |
| Expired card | Payment refused |
| Refund via SATIM platform | Transaction refunded |
| Cancellation via SATIM platform | Transaction cancelled |

When everything passes, confirm the integration tests in the console to validate certification.

---

Gateway endpoints & responses: **[SATIM gateway reference](./satim-gateway.md)** · SDK usage: **[getting started](./getting-started.md)**.
