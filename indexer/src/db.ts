/**
 * Postgres database layer for the SpendGuard indexer.
 *
 * Uses the `postgres` (porsager) library — a fast, lightweight Postgres
 * client with tagged-template queries and built-in connection pooling.
 *
 * The migration runner applies SQL files from the `migrations/` directory
 * in order, tracking applied migrations in a `_migrations` table.
 */

import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

// ── Logger ────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [${level}] [DB] ${msg}${metaStr}`);
}

// ── Client ────────────────────────────────────────────────────────────

export class Database {
  readonly sql: postgres.Sql;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      max: 10, // connection pool size
      idle_timeout: 30,
      connect_timeout: 15,
    });
  }

  // ── Migration runner ────────────────────────────────────────────────

  async runMigrations(): Promise<void> {
    // Ensure the tracking table exists
    await this.sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await this.sql`
        SELECT 1 FROM _migrations WHERE name = ${file}
      `;
      if (alreadyApplied.length > 0) {
        log("INFO", `Migration already applied: ${file}`);
        continue;
      }

      const sqlPath = join(MIGRATIONS_DIR, file);
      const sqlContent = readFileSync(sqlPath, "utf-8");

      log("INFO", `Applying migration: ${file}`);

      try {
        // Run the migration in a transaction
        await this.sql.begin(async (tx) => {
          // Split multi-statement SQL safely — postgres handles this
          // per execute, but we need to run it as raw SQL.
          await tx.unsafe(sqlContent);
          await tx`
            INSERT INTO _migrations (name) VALUES (${file})
          `;
        });
        log("INFO", `Migration applied: ${file}`);
      } catch (err) {
        log("ERROR", `Migration failed: ${file}`, { error: String(err) });
        throw err;
      }
    }

    log("INFO", "All migrations up to date");
  }

  // ── Cursor persistence ──────────────────────────────────────────────

  async getCursor(): Promise<{ lastLedger: number; lastEventId: string | null } | null> {
    const rows = await this.sql`
      SELECT last_ledger, last_event_id FROM ingest_cursor
      WHERE id = 1
    `;
    if (rows.length === 0) return null;
    // BIGINT columns come back from postgres.js as strings (to preserve
    // precision); convert to number or the RPC rejects the startLedger
    // with "cannot unmarshal string ... of type uint32".
    return {
      lastLedger: Number(rows[0]!.last_ledger),
      lastEventId: (rows[0]!.last_event_id as string | null) ?? null,
    };
  }

  async upsertCursor(
    lastLedger: number,
    lastEventId: string | null,
  ): Promise<void> {
    await this.sql`
      INSERT INTO ingest_cursor (id, last_ledger, last_event_id, updated_at)
      VALUES (1, ${lastLedger}, ${lastEventId}, now())
      ON CONFLICT (id) DO UPDATE SET
        last_ledger = EXCLUDED.last_ledger,
        last_event_id = EXCLUDED.last_event_id,
        updated_at = now()
    `;
  }

  // ── Events ──────────────────────────────────────────────────────────

  async insertSettlementEvent(event: {
    id: string;
    ledger: number;
    account: string;
    sourceContractId: string;
    amountSpent: bigint;
    contextRuleId: number;
    reference: string | null;
  }): Promise<void> {
    await this.sql`
      INSERT INTO settlement_events (
        id, ledger, account, source_contract_id,
        amount_spent, context_rule_id, reference, ingested_at
      ) VALUES (
        ${event.id}, ${event.ledger}, ${event.account},
        ${event.sourceContractId}, ${event.amountSpent.toString()},
        ${event.contextRuleId}, ${event.reference}, now()
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // ── Alerts ──────────────────────────────────────────────────────────

  async insertAlert(alert: {
    id: string;
    account: string;
    contextRuleId: number;
    level: string;
    eventAmount: bigint;
    totalSpentInWindow: bigint;
    cap: bigint;
    triggerLedger: number;
    raisedAt: string;
    webhookDelivered: boolean;
  }): Promise<void> {
    await this.sql`
      INSERT INTO alerts (
        id, account, context_rule_id, level,
        event_amount, total_spent_in_window, cap,
        trigger_ledger, raised_at, webhook_delivered
      ) VALUES (
        ${alert.id}, ${alert.account}, ${alert.contextRuleId},
        ${alert.level}, ${alert.eventAmount.toString()},
        ${alert.totalSpentInWindow.toString()}, ${alert.cap.toString()},
        ${alert.triggerLedger},
        ${alert.raisedAt}, ${alert.webhookDelivered}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // ── Monitored accounts ──────────────────────────────────────────────

  async getMonitoredAccounts(): Promise<
    { address: string; contextRuleId: number; enabled: boolean }[]
  > {
    const rows = await this.sql`
      SELECT address, context_rule_id, enabled
      FROM monitored_accounts
      WHERE enabled = true
    `;
    return rows.map((r) => ({
      address: r.address as string,
      contextRuleId: r.context_rule_id as number,
      enabled: r.enabled as boolean,
    }));
  }

  // ── Webhook configs ─────────────────────────────────────────────────

  async getWebhookConfigs(): Promise<
    { url: string; secret: string | null; alertLevels: string[]; enabled: boolean }[]
  > {
    const rows = await this.sql`
      SELECT url, secret, alert_levels, enabled
      FROM webhook_configs
      WHERE enabled = true
    `;
    return rows.map((r) => ({
      url: r.url as string,
      secret: (r.secret as string | null) ?? null,
      alertLevels: r.alert_levels as string[],
      enabled: r.enabled as boolean,
    }));
  }

  // ── Health ──────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /** Gracefully close the connection pool. */
  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
