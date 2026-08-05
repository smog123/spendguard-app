/**
 * Shared environment loader for operational helper scripts.
 *
 * Loads the repo-root .env.local exactly like main.ts does, then returns
 * the variables these scripts need. Scripts run via tsx, so import.meta.url
 * resolution matches main.ts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export interface ScriptEnv {
  sorobanRpcUrl: string;
  networkPassphrase: string;
  x402AssetContractId: string;
  databaseUrl: string;
  simulationSourceAccount: string;
  simulationSourceAccountSecret: string;
}

export function loadScriptEnv(): ScriptEnv {
  const envFilePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    ".env.local",
  );
  dotenv.config({ path: envFilePath, quiet: true });

  const missing = (name: string) => {
    throw new Error(
      `Missing required environment variable "${name}". Check .env.local.`,
    );
  };

  return {
    sorobanRpcUrl: process.env.SOROBAN_RPC_URL ?? missing("SOROBAN_RPC_URL"),
    networkPassphrase:
      process.env.NETWORK_PASSPHRASE ?? missing("NETWORK_PASSPHRASE"),
    x402AssetContractId:
      process.env.X402_ASSET_CONTRACT_ID ?? missing("X402_ASSET_CONTRACT_ID"),
    databaseUrl: process.env.DATABASE_URL ?? missing("DATABASE_URL"),
    simulationSourceAccount:
      process.env.SIMULATION_SOURCE_ACCOUNT ??
      missing("SIMULATION_SOURCE_ACCOUNT"),
    simulationSourceAccountSecret:
      process.env.SIMULATION_SOURCE_ACCOUNT_SECRET ??
      missing("SIMULATION_SOURCE_ACCOUNT_SECRET"),
  };
}