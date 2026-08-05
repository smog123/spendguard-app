/**
 * Shared Horizon helper for operational scripts.
 *
 * The Soroban testnet RPC host (https://soroban-testnet.stellar.org) does
 * NOT serve a Horizon companion endpoint, so rpc.Server#getAccount fails
 * there. Horizon lives on its own host (https://horizon-testnet.stellar.org).
 * TransactionBuilder only needs accountId() + sequenceNumber(), so we load
 * the account JSON from Horizon and expose a duck-typed account object.
 */

export interface HorizonAccount {
  accountId(): string;
  sequenceNumber(): string;
  /** Bump the tracked sequence so consecutive TransactionBuilder builds differ. */
  incrementSequenceNumber(): void;
}

/** Base Horizon URL for the configured network (default: Stellar testnet). */
export function horizonBaseUrl(): string {
  return process.env.HORIZON_URL?.trim() || "https://horizon-testnet.stellar.org";
}

/**
 * Fetch a Stellar account (sequence number etc.) from Horizon and return
 * an object compatible with TransactionBuilder.
 */
export async function loadAccount(address: string): Promise<HorizonAccount> {
  const baseUrl = horizonBaseUrl();
  const res = await fetch(`${baseUrl}/accounts/${address}`);
  if (!res.ok) {
    throw new Error(
      `Horizon account fetch failed for ${address}: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { sequence: string };
  return {
    accountId: () => address,
    sequenceNumber: () => json.sequence,
    incrementSequenceNumber: () => {
      json.sequence = (BigInt(json.sequence) + 1n).toString();
    },
  };
}

/**
 * Fetch the raw balances array for an account from Horizon.
 * Returns [] when the account is unfunded or unreachable.
 */
export async function fetchBalances(address: string): Promise<
  { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[]
> {
  try {
    const baseUrl = horizonBaseUrl();
    const res = await fetch(`${baseUrl}/accounts/${address}`);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      balances?: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[];
    };
    return json.balances ?? [];
  } catch {
    return [];
  }
}
