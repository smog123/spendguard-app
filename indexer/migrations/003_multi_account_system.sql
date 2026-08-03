-- 003_multi_account_system.sql
-- Multi-Account Management System tables for SpendGuard.

CREATE TABLE IF NOT EXISTS treasury_accounts (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name            TEXT        NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    address         TEXT        NOT NULL UNIQUE,
    type            TEXT        NOT NULL DEFAULT 'Business' CHECK (type IN ('Personal', 'Business', 'DAO', 'NGO', 'Project')),
    status          TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    context_rule_id INTEGER     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_accounts_status ON treasury_accounts(status);
CREATE INDEX IF NOT EXISTS idx_treasury_accounts_type ON treasury_accounts(type);

CREATE TABLE IF NOT EXISTS account_members (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id  TEXT        NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    email       TEXT        NOT NULL,
    name        TEXT        NOT NULL,
    role        TEXT        NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Owner', 'Admin', 'Finance Manager', 'Approver', 'Viewer')),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, email)
);

CREATE INDEX IF NOT EXISTS idx_account_members_account ON account_members(account_id);

CREATE TABLE IF NOT EXISTS account_spending_policies (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id      TEXT        NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    cap             NUMERIC(39) NOT NULL,
    window_seconds  BIGINT      NOT NULL DEFAULT 86400,
    asset_id        TEXT        NOT NULL DEFAULT 'USDC',
    status          TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spending_policies_account ON account_spending_policies(account_id);

CREATE TABLE IF NOT EXISTS account_budgets (
    id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id       TEXT        NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    name             TEXT        NOT NULL,
    category         TEXT        NOT NULL,
    allocated_amount NUMERIC(39) NOT NULL,
    spent_amount     NUMERIC(39) NOT NULL DEFAULT 0,
    period           TEXT        NOT NULL DEFAULT 'Monthly' CHECK (period IN ('Monthly', 'Quarterly', 'Annual')),
    status           TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Exceeded', 'Closed')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_account ON account_budgets(account_id);

CREATE TABLE IF NOT EXISTS account_multisig_proposals (
    id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id         TEXT        NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    title              TEXT        NOT NULL,
    description        TEXT        NOT NULL DEFAULT '',
    amount             NUMERIC(39) NOT NULL,
    recipient          TEXT        NOT NULL,
    required_approvals INTEGER     NOT NULL DEFAULT 2,
    status             TEXT        NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_by         TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_multisig_proposals_account ON account_multisig_proposals(account_id);

CREATE TABLE IF NOT EXISTS account_multisig_approvals (
    id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    proposal_id    TEXT        NOT NULL REFERENCES account_multisig_proposals(id) ON DELETE CASCADE,
    approver_email TEXT        NOT NULL,
    decision       TEXT        NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
    note           TEXT,
    timestamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (proposal_id, approver_email)
);

CREATE INDEX IF NOT EXISTS idx_multisig_approvals_proposal ON account_multisig_approvals(proposal_id);

CREATE TABLE IF NOT EXISTS account_audit_logs (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id  TEXT        NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    action      TEXT        NOT NULL,
    actor_email TEXT        NOT NULL,
    details     TEXT        NOT NULL,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON account_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON account_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS account_settings (
    account_id              TEXT        PRIMARY KEY REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    webhook_url             TEXT,
    near_miss_threshold_pct INTEGER     NOT NULL DEFAULT 90,
    multisig_threshold      INTEGER     NOT NULL DEFAULT 2,
    notification_email      TEXT,
    auto_lock_on_breach     BOOLEAN     NOT NULL DEFAULT true,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
