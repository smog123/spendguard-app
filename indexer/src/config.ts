/**
 * Environment configuration for the SpendGuard indexer.
 *
 * All secrets and connection strings are loaded from environment variables
 * at startup. Validation is strict: the process will exit with a clear
 * error message if any required variable is missing.
 */

// ── Helper ────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    console.error(`FATAL: Required environment variable "${name}" is not set.`);
    process.exit(1);
  }
  return value.trim();
}

function optionalIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(parsed)) {
    console.error(
      `FATAL: Environment variable "${name}" must be an integer. Got: "${raw}"`,
    );
    process.exit(1);
  }
  return parsed;
}

// ── Config shape ──────────────────────────────────────────────────────

export interface IndexerConfig {
  sorobanRpcUrl: string;
  networkPassphrase: string;
  policyViewHelperContractId: string;
  x402FacilitatorContractId: string;
  databaseUrl: string;
  nearMissThresholdPct: number;
  webhookTimeoutMs: number;
  pollIntervalMs: number;
}

// ── Loader ────────────────────────────────────────────────────────────

export function loadConfig(): IndexerConfig {
  return {
    sorobanRpcUrl: requireEnv("SOROBAN_RPC_URL"),
    networkPassphrase: requireEnv("NETWORK_PASSPHRASE"),
    policyViewHelperContractId: requireEnv("POLICY_VIEW_HELPER_CONTRACT_ID"),
    x402FacilitatorContractId: requireEnv("X402_FACILITATOR_CONTRACT_ID"),
    databaseUrl: requireEnv("DATABASE_URL"),
    nearMissThresholdPct: optionalIntEnv("NEAR_MISS_THRESHOLD_PCT", 90),
    webhookTimeoutMs: optionalIntEnv("WEBHOOK_TIMEOUT_MS", 5000),
    pollIntervalMs: optionalIntEnv("POLL_INTERVAL_MS", 10_000),
  };
}
