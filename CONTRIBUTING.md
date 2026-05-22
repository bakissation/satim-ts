# Contributing to @bakissation/satim

Thanks for your interest! This is a production-grade TypeScript SDK for the **SATIM (SATIM-IPAY)** payment gateway in Algeria — it's a real dependency for projects handling money, so correctness and backward compatibility matter.

> **This project is maintainer-led.** **Bug reports and security reports are very welcome** (open an issue for bugs; see [SECURITY.md](./SECURITY.md) for vulnerabilities). If you'd like to contribute a fix or feature, please **open an issue first** so we can agree on the approach. The branching/PR mechanics below apply to changes that have been agreed.

## Branching model

This repo uses a three-tier promotion flow:

```
your fork ──PR──▶ dev ──▶ staging ──▶ main (releases tagged here)
                  ▲         (maintainer-promoted)
            contributors
            target dev
```

- **Open all PRs against `dev`.** PRs to `staging` or `main` from contributors will be redirected.
- The maintainer promotes `dev → staging → main` and cuts releases from `main`.
- `dev`, `staging`, and `main` are all protected: CI must pass and changes land via pull request.
- **Merges use merge commits** (squash & rebase are disabled), so keep each branch's commits clean Conventional Commits — they land individually and drive the release version.

## Dev setup

```bash
git clone https://github.com/bakissation/satim-ts.git
cd satim-ts
npm install
cp .env.example .env   # only needed to run live calls against the SATIM test endpoint
npm run build
npm test
```

The unit tests mock the network (via `undici`'s `MockAgent`), so no credentials are needed to run them.

**Never commit `.env` or `.npmrc`** (both are gitignored). Don't paste merchant credentials, terminal IDs, or card numbers into issues or PRs.

## Before you open a PR

All of these must pass (this is exactly what CI runs):

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Conventions

- **Backward compatibility is sacred.** Never remove/rename exports, change signatures, or change response shapes without a **major** version bump. Add new optional params/fields and new functions alongside existing ones. New behaviour is opt-in.
- **Type safety:** strict TypeScript, explicit return types on public APIs.
- **Errors:** throw typed errors (extend `SatimError`); never leak credentials or card data in messages.
- **Security:** redact sensitive data before logging (`src/redact.ts`); default to POST + SSL verification.
- **Tests:** cover success, error responses, validation errors, and helpers. Tests must be deterministic.
- **One concern per file**; public API is re-exported from `src/index.ts`.

## Commits & versioning

Versioning and releases are **fully automated** by [semantic-release](https://semantic-release.gitbook.io/) from your commit messages — **do not bump `package.json` or edit `CHANGELOG.md` by hand.** Just write good [Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE:` → major. `docs:`/`chore:`/`refactor:`/`test:` don't trigger a release.
- On merge, a release is cut automatically per channel: **`dev` → `x.y.z-alpha.n`**, **`staging` → `x.y.z-beta.n`**, **`main` → `x.y.z`** (stable). Release notes are generated into [GitHub Releases](https://github.com/bakissation/satim-ts/releases).
- `package.json` `version` is a managed placeholder (`0.0.0-semantically-released`) — the git tag / GitHub Release is the source of truth. `CHANGELOG.md` is frozen at the pre-automation history.

## PR checklist

- [ ] Targets `dev`
- [ ] `lint`, `typecheck`, `build`, `test` all pass
- [ ] Conventional commit messages
- [ ] Backward compatibility maintained (or a `feat!:` major is intended)
- [ ] No manual version bump / CHANGELOG edit (automated from your commits)
- [ ] No secrets, credentials, or `.env`/`.npmrc` committed

## Security

Do **not** report vulnerabilities in public issues. See [`SECURITY.md`](./SECURITY.md).
