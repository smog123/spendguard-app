/**
 * helper: trustline-usdc
 *
 * Add a testnet USDC trustline to a Stellar account so it can hold and
 * receive SEP-41 SAC USDC (testnet USDC issuer GBBD47IF…).
 *
 * SEP-41 SAC transfers require the *receiver* to hold a trustline to the
 * underlying classic asset — without one, `transfer` traps with
 * "has no trustline". Run this for any account you want to be able to
 * send or receive the monitored asset.
 *
 * Usage:
 *   npm -w @spendguard/indexer run trustline:usdc [-- G...]
 *
 * Defaults to SIMULATION_SOURCE_ACCOUNT (the funded testnet account).
 */

import { Keypair, Asset, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { loadScriptEnv } from "./env.js";
import { loadAccount, fetchBalances } from "./horizon.js";

/**
 * Issuer of the monitored asset, read lazily so env vars loaded by
 * loadScriptEnv() (after module import) are honoured.
 */
function usdcIssuer(): string {
  return (
    process.env.X402_ASSET_ISSUER?.trim() ||
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
  );
}

const addressArg = process.argv.slice(2)[0];

function log(msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [trustline-usdc] ${msg}${metaStr}`);
}

async function main(): Promise<void> {
  const env = loadScriptEnv();

  const keypair = addressArg
    ? Keypair.fromPublicKey(addressArg)
    : Keypair.fromSecret(env.simulationSourceAccountSecret);
  const address = keypair.publicKey();

  const server = new rpc.Server(env.sorobanRpcUrl, {
    allowHttp: env.sorobanRpcUrl.startsWith("http://"),
  });

  const usdcAsset = new Asset("USDC", usdcIssuer());

  // Skip if the trustline already exists
  const balances = await fetchBalances(address);
  const hasTrustline = balances.some(
    (b) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer(),
  );
  if (hasTrustline) {
    log("USDC trustline already exists", { address });
    return;
  }

  const account = await loadAccount(address);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: env.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(30)
    .build();
  tx.sign(keypair);

  const send = await server.sendTransaction(tx);
  log("Submitted ChangeTrust", { status: send.status, hash: send.hash });

  if (send.status === "ERROR") {
    throw new Error(`Trustline rejected: ${JSON.stringify(send)}`);
  }

  const deadline = Date.now() + 30_000;
  let result = await server.getTransaction(send.hash);
  while (result.status === "NOT_FOUND" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    result = await server.getTransaction(send.hash);
  }
  if (result.status !== "SUCCESS") {
    throw new Error(
      `Trustline transaction failed: ${result.status} — ${JSON.stringify(result)}`,
    );
  }

  log("USDC trustline established", { address });
}

main().catch((err) => {
  console.error(`[trustline-usdc] Failed:`, err);
  process.exit(1);
});
