# `@spendguard/indexer`

**Persistent Soroban RPC Event Ingestion, Breach Detection, and Webhook Dispatch Service.**

The SpendGuard indexer continuously monitors Soroban ledger event logs for x402 settlement activity (SEP-41 token transfers and OpenZeppelin `spending_limit_enforced` events). It cross-references ingested events against on-chain policy caps and dispatches breach / near-miss webhook alerts.

---

## Why a Dedicated Long-Running Indexer Process?

Soroban RPC nodes only retain approximately **7 days of event history**. To maintain a permanent, reliable audit trail and prevent missed alerts during downtime, the indexer operates as a persistent daemon rather than a serverless function. It persists its ledger cursor in PostgreSQL, allowing seamless resumption across restarts.

---

## Service Architecture

```
                    ┌─────────────────────────┐
                    │    Soroban RPC Node     │
                    └────────────┬────────────┘
                                 │
                                 │ getEvents()
                                 ▼
                    ┌─────────────────────────┐
                    │      Event Poller       │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │  PostgreSQL Cursor &    │     │     Breach Detector     │
    │     Events Store        │     └────────────┬────────────┘
    └─────────────────────────┘                  │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │    Alert Dispatcher     │
                                    │    (Webhook Client)     │
                                    └─────────────────────────┘
```

### Components

1. **`EventPoller` (`event-poller.ts`)**: Continuous loop that polls `getEvents` from Soroban RPC, decodes SEP-41 transfer and `spending_limit_enforced` events, and saves the ledger cursor.
2. **`BreachDetector` (`breach-detector.ts`)**: Queries the deployed `policy-view-helper` contract via simulation to check live spent amount vs cap. Raises `near_miss` (e.g. 90% of cap) or `breach` (100%+ of cap) alerts.
3. **`AlertDispatcher` (`alert-dispatcher.ts`)**: Delivers JSON webhook POST notifications with bearer authentication signatures to operator-configured URLs.
4. **`Database` (`db.ts`)**: Database wrapper managing schema migration execution (`migrations/*.sql`), cursor persistence, settlement event storage, and monitored account lists.

---

## Database Migrations

SQL migrations are applied automatically on startup from `migrations/`:

- `001_init.sql`: Base tables (`ingest_cursor`, `settlement_events`, `alerts`, `monitored_accounts`, `webhook_configs`).
- `002_repoint_events.sql`: Repoints event store to real on-chain event source contract IDs.
- `003_multi_account_system.sql`: Multi-account treasury tables (`treasury_accounts`, `account_members`, `account_spending_policies`, `account_budgets`, `account_multisig_proposals`, `account_multisig_approvals`, `account_audit_logs`, `account_settings`).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SOROBAN_RPC_URL` | Yes | Soroban RPC node endpoint |
| `NETWORK_PASSPHRASE` | Yes | Network passphrase matching RPC |
| `POLICY_VIEW_HELPER_CONTRACT_ID` | Yes | Deployed view helper contract ID |
| `X402_ASSET_CONTRACT_ID` | Yes | Monitored SEP-41 token contract ID |
| `SIMULATION_SOURCE_ACCOUNT` | No | Funded G... account for simulation calls |
| `NEAR_MISS_THRESHOLD_PCT` | No | Near-miss alert threshold % (default: `90`) |
| `POLL_INTERVAL_MS` | No | Polling interval in ms (default: `10000`) |

---

## Build & Run

```bash
# Build indexer TypeScript files to dist/
npm run build

# Run indexer in watch mode (development)
npm run dev

# Run compiled indexer process (production)
npm run start

# Run Vitest test suite
npm run test
```

---

## License

[MIT](LICENSE)
