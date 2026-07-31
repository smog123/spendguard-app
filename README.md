# SpendGuard — Spending Limit Monitor

**SpendGuard** is an indexer and dashboard that continuously ingests Soroban events for [x402](https://github.com/stellar/x402-stellar) settlements, cross-references them against spending-limit policy state, and raises breach/near-miss alerts via a dashboard and webhook.

## What this repo is NOT

SpendGuard is **not** a policy engine. It is **not** an enforcement layer. It does **not** hold keys, sign transactions, or move funds. It reads public on-chain data and computes whether a spend pattern is approaching or has crossed a limit that is *already enforced on-chain* by [OpenZeppelin's smart account](https://docs.openzeppelin.com/contracts-stellar). If SpendGuard's alert is late or wrong, no funds are at risk as a direct result — the on-chain enforcement is the actual backstop.

## Architecture

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│  Soroban RPC  │────▶│  Indexer        │────▶│  Postgres        │
│  (getEvents)  │     │  (poll loop)    │     │  (event store)   │
└──────────────┘     └────────────────┘     └──────────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐        ┌──────────────┐
                     │ Policy       │        │ Next.js       │
                     │ View Helper  │        │ Dashboard     │
                     │ (read-only)  │        │ + API Routes  │
                     └──────────────┘        └──────────────┘
```

### Components

| Package | Description |
|---|---|
| `@spendguard/sdk` | Shared types, Soroban RPC client, policy reader, XDR helpers |
| `@spendguard/indexer` | Long-running ingest loop: polls events, decodes settlements, detects breaches, dispatches webhooks |
| `@spendguard/web` | Next.js 15 dashboard: monitored accounts list, per-account detail, spend chart, alert history |

## Prerequisites

- **Node.js** >= 18.18.0
- **npm** >= 9
- **Postgres** >= 15 (for the indexer event store)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> spendguard-app
cd spendguard-app
npm install

# 2. Set environment variables
# Copy the example below and fill in your values

# 3. Run the indexer (long-running process)
npm -w @spendguard/indexer run dev

# 4. Run the web dashboard (in another terminal)
npm -w @spendguard/web run dev
```

## Environment Variables

Create a `.env.local` file in the project root (or set on your hosting platform):

| Variable | Required | Default | Description |
|---|---|---|---|
| `SOROBAN_RPC_URL` | yes | — | Soroban RPC endpoint (testnet/mainnet) |
| `NETWORK_PASSPHRASE` | yes | — | Stellar network passphrase, e.g. `Test SDF Network ; September 2015` |
| `POLICY_VIEW_HELPER_CONTRACT_ID` | yes | — | Deployed policy-view-helper contract ID |
| `X402_ASSET_CONTRACT_ID` | yes | — | SEP-41 asset contract carrying x402 settlements (testnet USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`) |
| `X402_SMART_ACCOUNT_CONTRACT_IDS` | no | (empty) | Comma-separated OpenZeppelin smart-account contract IDs monitored for `spending_limit_enforced` events (per-user deployments) |
| `SIMULATION_SOURCE_ACCOUNT` | no | asset contract ID | Funded G… account used as the source for read-only policy simulations (must exist on the network; a contract ID is not a valid account) |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `NEAR_MISS_THRESHOLD_PCT` | no | `90` | % of cap that triggers a near-miss alert |
| `WEBHOOK_TIMEOUT_MS` | no | `5000` | Timeout for webhook POST requests |
| `POLL_INTERVAL_MS` | no | `10000` | Event polling interval in milliseconds |

## A note on the x402 facilitator

There is **no on-chain "x402 facilitator contract"**. The Built-on-Stellar x402
facilitator is an off-chain HTTP service (OpenZeppelin Relayer + x402
Facilitator Plugin) at `https://channels.openzeppelin.com/x402/testnet`.

SpendGuard therefore monitors the real on-chain events that make up an x402
settlement instead:

1. **SEP-41 `transfer` events** on the configured asset contract
   (topics `["transfer", from, to]`, data = amount) — the actual payment.
   Testnet USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
2. **OpenZeppelin smart-account `spending_limit_enforced` events**
   (topics `["spending_limit_enforced", smart_account]`, data map with
   `context_rule_id`, `amount`, `total_spent_in_period`) — the
   policy-enforcing spend. Smart accounts are per-user deployments, so
   there is no single public testnet address; supply your own via
   `X402_SMART_ACCOUNT_CONTRACT_IDS`.

## Testing note: real on-chain golden fixture

The indexer's event-decoder tests (`indexer/test/event-decode.test.ts`)
include a real on-chain golden fixture captured from the testnet RPC, so
the XDR value decoder is exercised against actual chain bytes, not just
SDK-encoder-generated XDR.

**TODO: golden fixture test against a real on-chain transfer event, once
testnet USDC has activity.** As of 2026-07-31 the SDF testnet had no
SEP-41-shaped (`["transfer", from, to]`) transfer events in the ~7-day RPC
retention window — USDC (`CBIELTK6Y…`) and the XLM SAC (`CDLZFC3S…`) were
both idle — so the current fixture is the closest real event available
(single-topic, map-formatted value) and only pins the value-decoding path.
When testnet USDC (or any SEP-41 token) emits a real transfer, replace it
with a full 3-topic event to also pin topic decoding against chain data.

## Deployment

### Indexer (long-running process)

The indexer is **not** a serverless function — it holds an open polling loop and a persistent DB connection. Deploy it to:

- [Render](https://render.com) (Web Service)
- [Railway](https://railway.app)
- A VPS / dedicated host

### Web Dashboard

The Next.js app can be deployed to:

- [Vercel](https://vercel.com) (recommended)
- [Netlify](https://netlify.com)
- Any Node.js host

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT
