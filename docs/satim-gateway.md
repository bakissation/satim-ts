# SATIM-IPAY gateway reference

A self-contained reference for the raw **SATIM-IPAY** REST gateway (CIB / Edahabia online card payments in Algeria). SATIM doesn't publish this openly, so it's mirrored here for integrators. `@bakissation/satim` wraps all of it — you rarely call these endpoints directly, but this explains exactly what the SDK sends and receives.

> Source: SATIM CIBWEBLab merchant console (certification environment). Contact: SATIM Labo de certification, 33 Route de Ouled Fayet, Chéraga — Alger · satim@satim.dz · +213 (21) 99 49 00 · toll-free 3020.

## Environments

SATIM runs three separate environments. Pick the base URL accordingly:

| Environment | Base URL | Who uses it |
|-------------|----------|-------------|
| **Certification** | `https://test2.satim.dz/payment/rest` | Merchants going through the certification process (pre-go-live testing). This is `API_BASE_URLS.TEST` in the SDK. |
| **Staging** | `https://test.satim.dz/payment/rest` | Already-certified merchants, for ongoing testing. Pass it via `apiBaseUrl`. |
| **Production** | `https://satim.dz/payment/rest` | Live transactions (real money). This is `API_BASE_URLS.PRODUCTION`. |

The hosted payment page (`formUrl`) is returned by the gateway and lives under the matching host (e.g. `https://test.satim.dz/payment/epg/...` for the test/staging tier).

## Payment flow

1. Customer places an order on the merchant site.
2. Merchant registers the order with the gateway → [`register.do`](#1-register-an-order).
3. Gateway returns a unique `orderId` and a `formUrl` (hosted payment page).
4. Merchant redirects the customer to `formUrl`.
5. Customer enters CIB/Edahabia card details on SATIM's page.
6. Gateway redirects the customer back to the merchant's `returnUrl`.
7. Merchant asks the gateway for the result → [`acknowledgeTransaction.do`](#2-confirm--get-order-status). **If no confirmation is requested, the order is auto-cancelled after a timeout.**
8. Merchant displays the result.

## HTTP method

Endpoints accept **GET**, but **POST is strongly recommended** for every request — it keeps credentials and transaction data out of URLs, logs, and browser history. The SDK uses POST by default.

## 1. Register an order

`POST /register.do`

### Request

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userName` | AN..30 | yes | Merchant login. |
| `password` | AN..30 | yes | Merchant password. |
| `orderNumber` | AN..10 | yes | Merchant-side order id; unique per transaction. |
| `amount` | N..20 | yes | Minimum 50 DA. **In minor units** — multiply DA by 100 (5000 DA → `500000`; 806.5 DA → `80650`). |
| `currency` | N3 | yes | ISO 4217 (`012` = DZD). |
| `returnUrl` | AN..512 | yes | Redirect URL after a successful payment. |
| `failUrl` | AN..512 | no | Redirect URL after a failed payment. |
| `description` | AN..512 | no | Free-form order description. |
| `language` | A2 | yes | ISO 639-1 (`AR`, `FR`, `EN`). |
| `jsonParams` | AN..1024 | yes | JSON object of additional fields (see below). |

#### `jsonParams` fields

| Field | Format | Example | Required | Description |
|-------|--------|---------|----------|-------------|
| `force_terminal_id` | AN..16 | `E0123456789` | yes | Terminal ID assigned by the bank. One merchant may have several terminals. |
| `udf1` | AN..20 | `Cmd123456` | yes | Merchant-useful value (invoice/order number, etc.). |
| `udf2`–`udf5` | AN..20 | — | no | Up to 4 more merchant-specific values. |
| `fundingTypeIndicator` | String | `CP` or `698` | no | Payment transaction type indicator. `CP`/`698` = bill payment. |

### Response

| Name | Type | Description |
|------|------|-------------|
| `errorCode` | N3 | `0` on success; otherwise an error (see below). |
| `orderId` | ANS20 | Unique gateway order id (= `mdOrder`). Absent on failure. |
| `formUrl` | AN..512 | Hosted payment page URL to redirect to. Absent on failure. |

```json
{ "errorCode": 0, "orderId": "V721uPPfNNofVQAAABL3", "formUrl": "https://test.satim.dz/payment/epg/merchants/merchantsatim/payment.html?mdOrder=V721uPPfNNofVQAAABL3&language=fr" }
```

### Error codes

| Code | Meaning |
|------|---------|
| 0 | No system error. |
| 1 | Order number already processed / wrong childId; or registered-but-not-paid; or submerchant blocked/deleted. |
| 3 | Unknown currency. |
| 4 | Missing required field (order number / user name / amount / return URL / password). |
| 5 | Incorrect request parameter; bad language; access denied; password change required; invalid `jsonParams`. |
| 7 | System error. |
| 14 | Invalid paymentway. |

## 2. Confirm / get order status

`POST /public/acknowledgeTransaction.do`

Used to confirm the merchant handled the customer redirect, and to read the order's status/details. (`getOrderStatus()` and `confirm()` in the SDK both call this.)

### Request

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userName` | AN..30 | yes | Merchant login. |
| `password` | AN..30 | yes | Merchant password. |
| `mdOrder` | ANS20 | yes | Gateway order id from `register.do`. |
| `language` | A2 | yes | ISO 639-1 (`AR`, `FR`, `EN`). |

### Response (selected fields)

| Name | Type | Description |
|------|------|-------------|
| `OrderStatus` | N2 | Order status — see [values](#order-status-values). Absent if the order id isn't found. |
| `ErrorCode` | N3 | Error code (see below). |
| `ErrorMessage` | AN..512 | Localized error description. |
| `OrderNumber` | AN..20 | Merchant-side order number. |
| `Amount` | N..20 | Amount in minor units (×100). |
| `Pan` | N..19 | Masked card number (paid orders only), e.g. `6280****7215`. |
| `expiration` | N6 | Card expiry `YYYYMM` (paid orders only). |
| `cardholderName` | AN..26 | Cardholder name. |
| `approvalCode` / `authorizationResponseId` | AN6 | IPS / network authorization code. |
| `actionCode` / `actionCodeDescription` | N3 / AN..512 | Processing system code + localized description. |
| `depositAmount` | N5 | Amount debited in order currency. |
| `currency` | N3 | ISO 4217. |
| `Ip` | AN..20 | Customer IP. |
| `clientId` / `bindingId` | AN..255 | Customer / binding identifiers (when bindings are enabled). |
| `params` | object | Extra fields, e.g. `respCode`, `respCode_desc`, `udf1`. |

```json
{
  "expiration": "202701", "cardholderName": "cardholder Name", "depositAmount": 100320,
  "currency": "012", "approvalCode": "913180", "actionCode": 0,
  "actionCodeDescription": "Votre paiement a été accepté", "ErrorCode": "0", "ErrorMessage": "Success",
  "OrderStatus": 2, "OrderNumber": "CMD0000004", "Pan": "6280****7215", "Amount": 100320,
  "Ip": "10.12.12.14", "params": { "respCode": "00", "respCode_desc": "Votre paiement a été accepté", "udf1": "Bill00001" }, "SvfeResponse": "00"
}
```

### Error codes

| Code | Meaning |
|------|---------|
| 0 | Success. |
| 2 | Order declined — error in payment credentials. |
| 5 | Access denied / password change required / empty `orderId`. |
| 6 | Unregistered order id. |
| 7 | System error. |

### Order status values

| Code | Description |
|------|-------------|
| 0 | Registered, not paid. |
| -1 | Decline placeholder (no specific status matched). |
| 1 | Approved (one-phase) / preauthorization on hold (two-phase). |
| 2 | **Deposited successfully (paid).** |
| 3 | Authorization reversed. |
| 4 | Refunded. |
| 6 | Authorization declined. |
| 7 | Card added. |
| 8 | Card updated. |
| 9 | Card verified. |
| 10 | Recurring template added. |
| 11 | Debited. |

## 3. Refund

`POST /refund.do`

Refunds deposited money. Multiple refunds are allowed, but their total can't exceed the deposited amount. Fails if the customer was never charged.

### Request

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userName` | AN..30 | yes | Merchant login. |
| `password` | AN..30 | yes | Merchant password. |
| `orderId` | ANS20 | yes | Gateway order id (= `mdOrder`). |
| `amount` | N..20 | yes | Minimum 50 DA, in minor units (×100). |

### Response

| Name | Type | Description |
|------|------|-------------|
| `errorCode` | N3 | `0` on success; otherwise an error. |
| `errorMessage` | AN..512 | Result/error message. |

```json
{ "errorCode": 0 }
```

### Error codes

| Code | Meaning |
|------|---------|
| 0 | No system error. |
| 5 | Access denied / password change required / invalid amount / deposit-amount rule / duplicate `externalRefundId`. |
| 6 | Unregistered order id. |
| 7 | System error / payment not in a refundable state. |

## Test cards (certification)

| Card | Exp | CVV2 | Password | Status |
|------|-----|------|----------|--------|
| 6280581110007215 | 01/2027 | 373 | 123456 | Valid |
| 6280581110006712 | 01/2027 | 897 | 123456 | Temporarily blocked |
| 6280581110006316 | 01/2027 | 657 | 123456 | Lost |
| 6280581110006415 | 01/2027 | 958 | 123456 | Stolen |
| 6280581110006613 | 08/2027 | 411 | 123456 | Incorrect expiration entry |
| 6280581110003927 | 01/2025 | 834 | 123456 | Card no longer on issuer server |
| 6280580610061219 | 01/2027 | 049 | 123456 | Card limit exceeded |
| 6280580610061110 | 01/2027 | 260 | 123456 | Insufficient balance |
| 6280581110006514 | 01/2027 | 205 | 123456 | Incorrect CVV2 |
| 6280580610061318 | 01/2027 | 930 | 666666 | Exceeded password attempts (3 wrong) |
| 6280581110007017 | 01/2027 | 632 | 123456 | Not authorized for online payment |
| 6280581110007116 | 01/2027 | 040 | 123456 | Not active for online payment |
| 6280581110007314 | 01/2027 | 821 | 123456 | Terminal/transaction amount limit exceeded |
| 6280580610056615 | 12/2022 | 428 | 123456 | Expired card |
| 6280580610061011 | 01/2027 | 992 | 123456 | Valid credit |

## Certification & go-live

Going live requires passing SATIM certification, which checks both these endpoints and a set of merchant-page (IHM) requirements (SSL, prominent amount, captcha, CIB logo, receipt handling, return-page fields, …). The full process, requirements, and test checklist live in **[SATIM certification & merchant requirements](./certification.md)**.
