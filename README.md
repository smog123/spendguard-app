# SpendGuard

**Policy-aware spend monitoring for x402 agentic payments on Stellar.**

SpendGuard watches settled on-chain transfers against the spending-limit
policies agents have already declared on-chain (via OpenZeppelin's
`stellar-accounts` smart account framework), and raises breach / near-miss
alerts through a dashboard and webhook. It never sits in the payment path —
it observes and reports, independent of whichever client the agent used to
send the transaction.

> Companion contract repo:
> [spendguard-contract](https://github.com/Spendguard/spendguard-contract) —
> the on-chain read helper this indexer queries for policy state.

---

## 1) Why This Matters

x402 lets autonomous agents move real money without a human approving each
transaction. Spending-limit guardrails already exist at the contract level
(OpenZeppelin's smart account policies), but nobody outside the account
itself can see whether those limits are being approached or broken —
there's no independent audit trail.

SpendGuard adds a passive observation layer:

- Indexes real on-chain transfer events, continuously (Soroban RPC only
  retains ~7 days of history — this service ingests and persists as
  events happen, it does not backfill after downtime)
- Cross-references each transfer against the spending account's own
  declared policy, read live from the deployed
  [policy-view-helper](https://github.com/Spendguard/spendguard-contract)
  contract
- Flags breaches and near-misses (default: 90% of cap) via webhook and
  dashboard
- Never signs, custodies, or blocks anything — if SpendGuard is late or
  wrong, no funds are at risk as a direct result; the real backstop is
  the on-chain policy enforcement it's observing

---

## 2) Current Product Model

1. Operator deploys `policy-view-helper` (see contract repo) and configures
   which smart-account addresses to monitor.
2. The indexer polls Soroban RPC continuously, persisting a ledger cursor
   in Postgres so it never loses history to RPC's retention window.
3. Each ingested transfer event is checked against that account's live
   `spending_limit` policy state.
4. Breaches and near-misses trigger a webhook POST and appear in the
   dashboard's alert timeline.
5. The dashboard shows monitored accounts, spend history, and alerts —
   read-only, no transaction signing anywhere in this repo.

---

## 3) Architecture

```
packages/sdk/       Soroban RPC client, policy reads, XDR helpers
indexer/             Long-running event-ingest service + breach detector
apps/web/            Next.js dashboard (read-only)
```

- **Indexer runs as a persistent process**, not a serverless function —
  Soroban RPC's ~7-day event retention means continuous polling is a hard
  requirement, not an optimization.
- **Postgres** is the event/cursor store; the dashboard's API routes read
  from the same database.
- **No custody, no signing, no transaction submission** anywhere in this
  repo — verified by design, not just by convention (see Known
  Limitations).

---

## 4) Local Setup

### Requirements

- Node.js >= 18.18.0 (npm workspaces; CI runs Node 22 LTS)
- PostgreSQL 15+ (16 used in local development)
- A deployed instance of
  [`policy-view-helper`](https://github.com/Spendguard/spendguard-contract)
  (testnet or mainnet)

### Start

```bash
npm install
# create .env.local from the table in section 5 (no .env.example is shipped)
npm run build
npm -w @spendguard/indexer run dev   # indexer: watch + run via tsx
npm -w @spendguard/web run dev       # dashboard: next dev (separate terminal)
```

---

## 5) Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `SOROBAN_RPC_URL` | yes | e.g. `https://soroban-testnet.stellar.org` |
| `NETWORK_PASSPHRASE` | yes | must match the RPC network exactly |
| `POLICY_VIEW_HELPER_CONTRACT_ID` | yes | from the contract repo's deployment |
| `X402_ASSET_CONTRACT_ID` | yes | the SEP-41 token contract being monitored (e.g. testnet USDC) |
| `DATABASE_URL` | yes | Postgres connection string |
| `SIMULATION_SOURCE_ACCOUNT` | no, defaults to `X402_ASSET_CONTRACT_ID` | funded G… account used for read-only contract simulation calls; a contract ID is not a valid account, so set this for policy reads to work |
| `NEAR_MISS_THRESHOLD_PCT` | no, default `90` | percent of cap that triggers a near-miss alert |
| `WEBHOOK_TIMEOUT_MS` | no, default `5000` | webhook POST timeout |
| `POLL_INTERVAL_MS` | no, default `10000` | event polling interval in milliseconds |
| `X402_SMART_ACCOUNT_CONTRACT_IDS` | no, default (empty) | comma-separated OpenZeppelin smart-account contract IDs monitored for `spending_limit_enforced` events |

---

## 6) Scripts

```
npm run build                          # builds sdk, indexer, web
npm -w @spendguard/indexer run dev     # indexer: tsx watch
npm -w @spendguard/web run dev         # dashboard: next dev
npm run typecheck                      # tsc --noEmit across all three projects
npm run lint                           # eslint (flat config)
npm test --workspaces --if-present     # vitest in workspaces that define tests

# After `npm run build`, run the compiled indexer instead of the watcher:
npm -w @spendguard/indexer run start   # node indexer/dist/main.js
```

---

## 7) API / Module Reference

### SDK (`packages/sdk`)

- `soroban-client.ts` — RPC wrapper (`getEvents`, `getLatestLedger`,
  `simulateContract`)
- `policy-reader.ts` — reads live `spending_limit` policy state from the
  deployed contract via `simulateTransaction`
- `xdr-helpers.ts` — strongly-typed wrappers around `nativeToScVal` /
  `scValToNative`; no hand-rolled XDR byte manipulation

### Indexer (`indexer/`)

- `event-poller.ts` — continuous polling loop, persists ledger cursor
- `breach-detector.ts` — compares transfer events against policy caps
- `alert-dispatcher.ts` — webhook delivery on breach/near-miss

### Web (`apps/web`)

- `/` — monitored accounts overview
- `/accounts/[address]` — per-account spend history and alert timeline
- `/api/accounts` — CRUD for monitored accounts
- `/api/webhooks` — webhook endpoint configuration

---

## 8) Known Limitations (Current)

1. **No real on-chain golden-fixture test yet.** Testnet's monitored asset
   contract has had no transfer activity in the ~7-day RPC retention
   window since this project began — the plan to add one once real
   activity exists is noted in `indexer/test/event-decode.test.ts`.
   Current tests validate the encode/decode round-trip and pin the
   value-decoding path against one captured real on-chain value; they do
   not yet cover a live, full real-chain event end-to-end.
2. **No monitored accounts configured by default.** The indexer runs
   correctly against zero accounts (verified live: cursor advances, no
   errors, zero false alerts) — this is a deliberately empty starting
   state, not a bug.
3. **Only `spending_limit`-policy accounts are supported.** OZ's other
   policy types (`simple_threshold`, `weighted_threshold`) aren't read by
   this indexer in the current MVP.
4. **`spending_limit`'s own scope is transfer-context only** (an upstream
   OpenZeppelin constraint, not a SpendGuard limitation) — non-transfer
   contract calls aren't covered by the policy this tool observes.
5. **`apps/web` has no automated test coverage yet** — SDK and indexer
   are tested; the dashboard is not.

SpendGuard is intentionally scoped to prove policy-aware, real on-chain
observability first, not full production hardening.

---

## 9) Practical Next Steps

- Add the real on-chain golden-fixture test once testnet activity exists.
- Add automated dashboard test coverage.
- Support additional OZ policy types (`simple_threshold`,
  `weighted_threshold`).
- Expand CI to run the workspace build steps (the workflow currently
  covers install, typecheck, lint, and tests, but not the full build).

---

## 10) License

MIT
