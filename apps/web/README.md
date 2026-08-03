# `@spendguard/web`

**Next.js 15 Web Application & REST API Layer for SpendGuard.**

This package contains the user-facing web dashboard and REST API backend powering the SpendGuard Multi-Account Treasury Management System. It features interactive account switching, role-based access control simulation, spend limit visualizations, multi-sig governance workflows, and isolated sub-domain data views.

---

## Features & Architecture

### 1. Interactive Account Context Provider
- Client-side `AccountProvider` context (`context/AccountContext.tsx`) managing current active treasury account.
- Dynamic `AccountSwitcher` dropdown in the top header bar featuring quick search, status indicators, and account type badges.
- Remembers active account selection via `localStorage`.

### 2. Role-Based Access Control (RBAC)
- 5-tier role system (`Owner`, `Admin`, `Finance Manager`, `Approver`, `Viewer`).
- Built-in **Role Simulator dropdown** in the header navigation to test permissions live across all dashboard pages.
- Action authorization checks protecting budget creation, policy configuration, member invites, and multi-sig voting.

### 3. Responsive UI Pages
- **`/` (Dashboard)**: Overview of active treasury context, KPI summary cards, spend progression chart, recent alerts, and treasury context quick-switch grid.
- **`/accounts`**: Complete treasury accounts directory with live search and filtering by account status (`Active`/`Archived`) and type (`Personal`, `Business`, `DAO`, `NGO`, `Project`).
- **`/accounts/new`**: Create Treasury Account form with Stellar wallet address format validation (`G...` 56 chars), owner setup, and initial policy caps.
- **`/accounts/[id]`**: Detailed Treasury Overview with tabbed navigation:
  - **Overview**: Spend chart & alert timeline.
  - **Transactions**: Account-isolated settlement event history.
  - **Spending Policies**: Account-isolated limit rules and cap utilization.
  - **Budgets**: Category financial allocations and spent progress bars.
  - **Multi-Sig Approvals**: Multi-party approval proposals queue, creation modal, and vote submission buttons.
  - **Audit Logs**: Security and operational audit trail.
- **`/accounts/[id]/edit`**: Metadata editing, type updates, and status toggles.
- **`/accounts/[id]/members`**: Team member directory, invite modal, role assignment selector, and member removal.
- **`/accounts/[id]/settings`**: Webhook URL configuration, alert thresholds (%), multi-sig required signers count, notification preferences, and danger zone archiving.

---

## REST API Endpoints

All endpoints support JSON request and response payloads with clean error formatting:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/accounts` | List treasury accounts (supports `status`, `type`, `search` filters) or alerts |
| `POST` | `/api/accounts` | Create a new treasury account with owner & initial policy |
| `GET` | `/api/accounts/[id]` | Fetch account details, members, and settings |
| `PATCH` | `/api/accounts/[id]` | Update account name, description, type, or status |
| `DELETE` | `/api/accounts/[id]` | Archive or delete treasury account |
| `GET` | `/api/accounts/[id]/members` | List account members |
| `POST` | `/api/accounts/[id]/members` | Add a new member to account with assigned role |
| `PATCH` | `/api/accounts/[id]/members` | Update a member's role |
| `DELETE` | `/api/accounts/[id]/members` | Remove a member from account |
| `GET` | `/api/accounts/[id]/policies` | List isolated spending policies |
| `POST` | `/api/accounts/[id]/policies` | Create a spending policy for account |
| `GET` | `/api/accounts/[id]/budgets` | List isolated account budgets |
| `POST` | `/api/accounts/[id]/budgets` | Create a budget allocation |
| `GET` | `/api/accounts/[id]/multisig` | List multi-sig approval proposals |
| `POST` | `/api/accounts/[id]/multisig` | Create a multi-sig proposal |
| `PATCH` | `/api/accounts/[id]/multisig` | Submit approval/rejection vote on a proposal |
| `GET` | `/api/accounts/[id]/audit-logs` | Fetch account security audit trail |
| `GET` | `/api/accounts/[id]/settings` | Fetch account settings |
| `PUT` | `/api/accounts/[id]/settings` | Update webhook URL, thresholds, and notifications |

---

## Technical Stack

- **Framework:** Next.js 15 (App Router) & React 19
- **Styling:** Vanilla CSS & Tailwind CSS with curated dark mode palette (Emerald, Zinc, HSL tailoring)
- **Database Layer:** `AccountService` with dual-mode PostgreSQL connection pool & memory fallback store
- **Testing:** Vitest with automated unit & integration test suite

---

## Build & Local Development

```bash
# Run Next.js dev server on http://localhost:3000
npm run dev

# Run Next.js production build compilation
npm run build

# Run Vitest test suite
npm run test
```

---

## License

[MIT](LICENSE)
