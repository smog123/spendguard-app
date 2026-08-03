# SpendGuard

**Policy-Aware Multi-Account Treasury Management & Spend Monitoring for Soroban x402 Payments on Stellar.**

SpendGuard watches settled on-chain Stellar transfers and evaluates them against the spending-limit policies agents have declared on-chain (via OpenZeppelin's `stellar-accounts` smart account framework). It provides an enterprise-grade **Multi-Account Treasury Management System** with isolated data domains, role-based access control (RBAC), budgets, audit logs, and multi-signature approval workflows.

> **Companion Contract Repo:**  
> [`spendguard-contract`](https://github.com/Spendguard/spendguard-contract) — The read-only Soroban helper contract queried for on-chain policy state.

---

## 1. Why SpendGuard?

x402 enables autonomous agents to execute payments on Stellar without requiring human intervention for every micro-transaction. While smart contract policies enforce limits on-chain, operators and treasury managers lack an independent, consolidated dashboard and audit trail for monitoring spending limits across multiple accounts.

**SpendGuard adds a passive, non-custodial observability and governance layer:**

- **Continuous Event Indexing:** Ingests and persists real on-chain SEP-41 `transfer` and OpenZeppelin `spending_limit_enforced` events in Postgres, ensuring historical visibility beyond Soroban RPC retention windows.
- **Multi-Account Treasury System:** Allows creation and management of unlimited treasury accounts (Personal, Business, DAO, NGO, Project) with full data isolation.
- **Role-Based Access Control (RBAC):** Strict 5-tier role hierarchy (`Owner`, `Admin`, `Finance Manager`, `Approver`, `Viewer`) protecting operations across APIs and dashboard pages.
- **Multi-Signature Approvals:** Built-in multi-party approval workflow for high-value treasury disbursements with required signer thresholds.
- **Budgets & Policy Tracking:** Real-time tracking of spend caps, period allocations (`Monthly`, `Quarterly`, `Annual`), and near-miss / breach alert dispatch.
- **Zero Custody, Zero Signing in Payments:** SpendGuard operates purely as an observer and manager. It never sits in the payment execution path and never custodies funds.

---

## 2. Monorepo Architecture

The workspace is organized into a clean monorepo architecture:

```
spendguard-app/
├── packages/sdk/           # Core SDK: Soroban RPC client, XDR helpers, RBAC engine, TypeScript types
├── indexer/                # Persistent Soroban RPC event polling service, breach detector, webhook dispatcher
├── apps/web/               # Next.js 15 App Router web application, REST APIs, and UI components
```

### High-Level Architecture Diagram

```
                             ┌───────────────────────────────────┐
                             │       Stellar / Soroban RPC       │
                             └─────────────────┬─────────────────┘
                                               │
                                               │ (Events & Policy Read)
                                               ▼
┌──────────────────────┐             ┌───────────────────┐             ┌──────────────────────┐
│  Next.js 15 Web App  │ ◄────────── │ Postgres Event &  │ ◄────────── │  SpendGuard Indexer  │
│  (Apps / Dashboard)  │   REST API  │ Treasury Store    │   Persist   │  (Polling Service)   │
└──────────────────────┘             └───────────────────┘             └──────────────────────┘
```

---

## 3. Multi-Account Management System

SpendGuard provides isolated governance and reporting per treasury account:

### Treasury Account Metadata
Each treasury account contains:
- **Name & Description:** Human-readable account label and governance metadata.
- **Stellar Wallet Address:** 56-character public key starting with `G` (OpenZeppelin smart account address).
- **Account Type:** Categorized as `Personal`, `Business`, `DAO`, `NGO`, or `Project`.
- **Status:** `Active` or `Archived`.
- **Context Rule ID:** On-chain rule identifier.
- **Timestamps:** ISO-8601 creation and update dates.

### Isolated Data Domains
Every treasury account features complete data isolation:
1. **Transactions:** Account-specific settlement event history, ledgers, amounts, and references.
2. **Spending Policies:** Declared caps, window durations (e.g. 24h), asset IDs, and utilization metrics.
3. **Budgets:** Period allocations (`Monthly`, `Quarterly`, `Annual`) with spent progress tracking and categories (`Operations`, `Security`, `Marketing`, `Grants`, `Infrastructure`).
4. **Members & RBAC:** Role assignment per user email.
5. **Audit Logs:** Immutable trail of account actions (`ACCOUNT_CREATED`, `ACCOUNT_UPDATED`, `MEMBER_ADDED`, `POLICY_CREATED`, `MULTISIG_PROPOSAL_CREATED`, etc.).
6. **Multi-Signature Approvals:** Pending/Approved/Rejected approval queues with voter progress bar.
7. **Settings:** Webhook dispatch URL, near-miss alert %, notification email, auto-lock on breach.

---

## 4. Role-Based Access Control (RBAC) Matrix

SpendGuard enforces strict permissions across API routes and UI actions:

| Permission | Owner | Admin | Finance Manager | Approver | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| `account:create` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `account:edit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `account:archive` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `account:delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `members:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `policies:manage` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `budgets:manage` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `multisig:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `multisig:approve` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `data:view` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Local Setup & Quickstart

### Prerequisites

- **Node.js** `>= 18.18.0` (Node 22 LTS recommended)
- **npm** `>= 9.0.0`
- **PostgreSQL** `15+` (16 recommended for database persistence)

### Installation

```bash
# Clone the repository
git clone https://github.com/Spendguard/spendguard-app.git
cd spendguard-app

# Install all workspace dependencies
npm install

# Build all sub-packages (SDK, Indexer, Web App)
npm run build
```

### Environment Configuration

Create a `.env.local` file in the root directory (or inside `apps/web/.env.local`):

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/spendguard"
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; July 2015"
POLICY_VIEW_HELPER_CONTRACT_ID="CCAM4NRAUB6SO3XLL2SRZQEHSOUYQGDKGNPCUIQ5KKI2S6QKWC2VN6NX"
X402_ASSET_CONTRACT_ID="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
SIMULATION_SOURCE_ACCOUNT="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
NEAR_MISS_THRESHOLD_PCT=90
POLL_INTERVAL_MS=10000
```

### Running Services Locally

```bash
# Run typechecking across all packages
npm run typecheck

# Run unit and integration tests (64 tests across SDK, Indexer, Web)
npm test

# Run Indexer service in watch mode
npm -w @spendguard/indexer run dev

# Run Next.js Dashboard web app (in a separate terminal)
npm -w @spendguard/web run dev
```

Open `http://localhost:3000` in your browser to access the dashboard.

---

## 6. Available Scripts

| Command | Description |
|---|---|
| `npm run build` | Builds `@spendguard/sdk`, `@spendguard/indexer`, and `@spendguard/web` in order |
| `npm run typecheck` | Runs `tsc --noEmit` across all workspace projects |
| `npm run lint` | Runs ESLint across TypeScript and React codebases |
| `npm test` | Runs Vitest suites across SDK, Indexer, and Web app workspaces |
| `npm -w @spendguard/web run dev` | Launches Next.js dev server on port 3000 |
| `npm -w @spendguard/indexer run dev` | Runs the indexer continuous polling loop with tsx |

---

## 7. Web Application Page Routes

- `/` — Main Treasury Dashboard (active context overview, KPI summary, spend chart, alert timeline).
- `/accounts` — Treasury Accounts List (grid/table view, filters by type & status, quick context switch).
- `/accounts/new` — Create Account form (Stellar address validation, type selection, owner assignment).
- `/accounts/[id]` — Account Overview & Isolated Data Sub-tabs (Overview, Transactions, Spending Policies, Budgets, Multi-Sig Approvals, Audit Logs).
- `/accounts/[id]/edit` — Edit Account metadata & status.
- `/accounts/[id]/members` — Account Team Members & RBAC management.
- `/accounts/[id]/settings` — Webhooks, alert thresholds, multi-sig signers count, and account lifecycle.

---

## 8. License

[MIT](LICENSE) © SpendGuard Contributors
