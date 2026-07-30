-- 001_init.sql
-- Initial schema for SpendGuard indexer event store.

-- Tracks the ledger cursor so the poller can resume after restarts.
CREATE TABLE IF NOT EXISTS ingest_cursor (
    id            INTEGER PRIMARY KEY,   -- singleton row (id = 1)
    last_ledger   BIGINT  NOT NULL,
    last_event_id TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decoded x402 settlement events from the facilitator contract.
CREATE TABLE IF NOT EXISTS settlement_events (
    id                      TEXT        PRIMARY KEY,  -- RPC event ID
    ledger                  BIGINT      NOT NULL,
    account                 TEXT        NOT NULL,      -- smart account address (G…)
    facilitator_contract_id TEXT        NOT NULL,      -- facilitator contract ID (C…)
    amount_spent            NUMERIC(39) NOT NULL,      -- i128 in stroops
    context_rule_id         INTEGER     NOT NULL,
    reference               TEXT,                      -- optional invoice / memo
    ingested_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_events_account
    ON settlement_events (account);
CREATE INDEX IF NOT EXISTS idx_settlement_events_ledger
    ON settlement_events (ledger);

-- Alerts raised by the breach detector.
CREATE TABLE IF NOT EXISTS alerts (
    id                    TEXT        PRIMARY KEY,
    account               TEXT        NOT NULL,
    context_rule_id       INTEGER     NOT NULL,
    level                 TEXT        NOT NULL CHECK (level IN ('near_miss', 'breach')),
    event_amount          NUMERIC(39) NOT NULL,       -- i128 in stroops
    total_spent_in_window NUMERIC(39) NOT NULL,
    cap                   NUMERIC(39) NOT NULL,
    trigger_ledger        BIGINT      NOT NULL,
    raised_at             TIMESTAMPTZ NOT NULL,
    webhook_delivered     BOOLEAN     NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_account
    ON alerts (account);
CREATE INDEX IF NOT EXISTS idx_alerts_raised_at
    ON alerts (raised_at DESC);

-- Accounts being monitored for spending limits.
CREATE TABLE IF NOT EXISTS monitored_accounts (
    address         TEXT        PRIMARY KEY,  -- G…
    label           TEXT,                      -- human-readable label
    context_rule_id INTEGER     NOT NULL,
    enabled         BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook configuration for alert dispatch.
CREATE TABLE IF NOT EXISTS webhook_configs (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    url           TEXT        NOT NULL,
    secret        TEXT,                      -- optional bearer token
    alert_levels  TEXT[]      NOT NULL DEFAULT '{near_miss,breach}',
    enabled       BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the cursor table so upserts always work.
INSERT INTO ingest_cursor (id, last_ledger, last_event_id, updated_at)
VALUES (1, 0, NULL, now())
ON CONFLICT (id) DO NOTHING;
