# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-04

### Added

- **BigInt support**: `toMinorUnits()` now accepts `bigint` values for precise large amount handling
- **Idempotency key**: New `idempotencyKey` parameter in `register()` to prevent duplicate orders (sent as `externalRequestId`)
- **Additional params**: New `additionalParams` option to include merchant-specific fields in `jsonParams`
- **Pluggable fetch**: Custom `fetch` function support in `HttpConfig` for advanced HTTP handling
- **Middleware hooks**: `onRequest` and `onResponse` hooks for logging, metrics, and debugging
- **Custom logger**: Support for custom `SatimLogger` instance to integrate with logging frameworks (winston, pino, etc.)
- **Extended confirm response**: 11 new fields in `ConfirmOrderResponse`:
  - `authorizationResponseId`
  - `approvalCode`
  - `cardholderName`
  - `depositAmount`
  - `currency`
  - `description`
  - `ip`
  - `clientId`
  - `bindingId`
  - `paymentAccountReference`
  - `params`

### Changed

- **fundingTypeIndicator**: Now passed as a top-level request parameter instead of inside `jsonParams` (per SATIM API spec)
- **TLS enforcement**: SSL/TLS verification is now always enabled and not configurable (removed `verifySSL` option)
- **GET method warning**: Using GET method now logs a security warning recommending POST

### Removed

- `verifySSL` option from `HttpConfig` (TLS is always enforced for security)
- `SATIM_HTTP_VERIFY_SSL` environment variable

## [1.0.0] - 2024-12-24

### Added

- Initial release of `@bakissation/satim` SDK
- Support for Satim payment gateway endpoints:
  - `register.do` - Register new payment orders
  - `public/acknowledgeTransaction.do` - Confirm/acknowledge transactions
  - `refund.do` - Process refunds
- Full TypeScript support with strict types
- Dual build outputs (ESM + CommonJS)
- Environment variable configuration via `fromEnv()`
- Amount conversion utilities (`toMinorUnits`, `fromMinorUnits`)
- Comprehensive error handling with typed errors:
  - `ConfigError` - Configuration issues
  - `ValidationError` - Input validation failures
  - `HttpError` - Network/transport errors
  - `TimeoutError` - Request timeouts
  - `SatimApiError` - Satim API error responses
- Response helper methods (`isSuccessful()`, `isPaid()`)
- Secure logging with automatic credential redaction
- Test suite with 113 passing tests
