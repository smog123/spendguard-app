# SpendGuard — Spending Limit Monitor

**SpendGuard** is an indexer and dashboard that continuously ingests Soroban events for [x402](https://github.com/stellar/x402) settlements, cross-references them against spending-limit policy state, and raises breach/near-miss alerts via a dashboard and webhook.

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
| `X402_FACILITATOR_CONTRACT_ID` | yes | — | The x402 facilitator contract being monitored |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `NEAR_MISS_THRESHOLD_PCT` | no | `90` | % of cap that triggers a near-miss alert |
| `WEBHOOK_TIMEOUT_MS` | no | `5000` | Timeout for webhook POST requests |
| `POLL_INTERVAL_MS` | no | `10000` | Event polling interval in milliseconds |

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
