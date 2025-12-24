# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
