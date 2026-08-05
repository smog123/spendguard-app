/**
 * helper: monitor-account
 *
 * Register a Stellar address as a monitored account in Postgres so the
 * indexer attributes its SEP-41 transfer events as x402 settlements.
 *
 * Usage:
 *   npm -w @spendguard/indexer run monitor:account [-- G... [context_rule_id] [label]]
 *
 * Defaults to SIMULATION_SOURCE_ACCOUNT (the funded testnet account) with
 * context_rule_id 1 when no arguments are given.
 */

import postgres from "postgres";
import { loadScriptEnv } from "./env.js";

const [addressArg, ruleArg, labelArg] = process.argv.slice(2);

function log(msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [monitor-account] ${msg}${metaStr}`);
}

async function main(): Promise<void> {
  const env = loadScriptEnv();

  const address = addressArg ?? env.simulationSourceAccount;
  const contextRuleId = ruleArg ? Number.parseInt(ruleArg, 10) : 1;
  const label = labelArg ?? "Live testnet settlement account";

  if (Number.isNaN(contextRuleId)) {
    throw new Error(`Invalid context_rule_id: "${ruleArg}"`);
  }
  if (!address.startsWith("G")) {
    throw new Error(`Address must start with G..., got: "${address}"`);
  }

  const sql = postgres(env.databaseUrl, { max: 2, idle_timeout: 10 });
  try {
    await sql`
      INSERT INTO monitored_accounts (address, label, context_rule_id, enabled)
      VALUES (${address}, ${label}, ${contextRuleId}, true)
      ON CONFLICT (address) DO UPDATE SET
        label = EXCLUDED.label,
        context_rule_id = EXCLUDED.context_rule_id,
        enabled = true,
        updated_at = now()
    `;
    log("Registered monitored account", {
      address,
      contextRuleId,
      label,
    });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  console.error(`[monitor-account] Failed:`, err);
  process.exit(1);
});