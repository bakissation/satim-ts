# Security Policy

## Supported versions

This project follows semantic versioning. Security fixes are applied to the **latest released minor version** only. Please upgrade before reporting.

## Reporting a vulnerability

**Do not open a public issue or pull request for security vulnerabilities.**

Report privately via GitHub's **Private Vulnerability Reporting**:

1. Go to the [Security tab](https://github.com/bakissation/satim-ts/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the issue, affected version, and reproduction steps.

You'll get an acknowledgement and can track the fix in the private advisory. Once a fix ships, the advisory is published with credit (unless you prefer to remain anonymous).

## Why this matters here

This SDK handles **real payment flows** for the SATIM gateway — merchant credentials and transaction data pass through it. A vulnerability could expose credentials or enable fraudulent transactions. Of particular interest:

- **Credential & card-data handling** — the SDK must never log merchant credentials, PANs, or CVV/CVC. Sensitive fields are redacted before logging (`src/redact.ts`); regressions that leak them are in scope.
- **Request construction** — credentials default to being sent via **POST** (not in URLs); anything that pushes secrets into query strings, logs, or error messages is in scope.
- **Transport** — SSL verification is on by default; downgrades or bypasses are in scope.
- **Amount / input validation** — bypasses that allow malformed amounts or injection into request parameters.

## Out of scope

- Vulnerabilities requiring an already-compromised machine or a maliciously modified `.env`.
- Issues in SATIM's own gateway/API (report those to SATIM).

## Good hygiene for everyone

Never paste merchant credentials, terminal IDs, card numbers, or `.env` contents into issues, PRs, or logs.
