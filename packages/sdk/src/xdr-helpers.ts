/**
 * XDR encoding / decoding helpers for Soroban contract interactions.
 *
 * This module wraps @stellar/stellar-sdk's nativeToScVal / scValToNative
 * to provide strongly-typed helpers for the SpendGuard domain types.
 * We do NOT hand-roll XDR byte manipulation.
 */

import { nativeToScVal, scValToNative, xdr, Address } from "@stellar/stellar-sdk";
import type { SpendingLimitView } from "./types.js";

// ── Address helpers ───────────────────────────────────────────────────

/** Encode a Stellar public key (G…) as an ScVal address. */
export function addressToScVal(accountId: string): xdr.ScVal {
  return Address.fromString(accountId).toScVal();
}

/** Decode an ScVal address back to a G… string. */
export function scValToAddress(scv: xdr.ScVal): string {
  return Address.fromScVal(scv).toString();
}

// ── u32 helpers ───────────────────────────────────────────────────────

export function u32ToScVal(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" });
}

export function scValToU32(scv: xdr.ScVal): number {
  return Number(scValToNative(scv));
}

// ── i128 helpers ──────────────────────────────────────────────────────

export function i128ToScVal(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "i128" });
}

export function scValToI128(scv: xdr.ScVal): bigint {
  return BigInt(scValToNative(scv) as number | bigint);
}

// ── u64 helpers ───────────────────────────────────────────────────────

export function u64ToScVal(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" });
}

export function scValToU64(scv: xdr.ScVal): bigint {
  return BigInt(scValToNative(scv) as number | bigint);
}

// ── SpendingLimitView decoder ────────────────────────────────────────

/**
 * Decode an ScMap returned by get_spending_limit_state into a typed view.
 *
 * The contract returns a map with keys:
 *   cap (i128), window_seconds (u64), spent_in_window (i128),
 *   window_started_at (u64)
 */
export function decodeSpendingLimitView(scv: xdr.ScVal): SpendingLimitView {
  // Guard on the switch first: calling scv.map() on a non-map ScVal throws
  // a terse SDK error ("map not set") instead of returning undefined.
  if (scv.switch() !== xdr.ScValType.scvMap()) {
    throw new Error("SpendingLimitView ScVal is not a map");
  }
  const map = scv.map();
  if (!map) {
    throw new Error("SpendingLimitView ScVal is not a map");
  }

  const getEntry = (
    key: string,
  ): xdr.ScVal | undefined => {
    return map.find(
      (e: xdr.ScMapEntry) =>
        scValToNative(e.key()) === key,
    )?.val();
  };

  const capEntry = getEntry("cap");
  const windowSecondsEntry = getEntry("window_seconds");
  const spentInWindowEntry = getEntry("spent_in_window");
  const windowStartedAtEntry = getEntry("window_started_at");

  if (!capEntry || !windowSecondsEntry || !spentInWindowEntry || !windowStartedAtEntry) {
    throw new Error(
      "SpendingLimitView ScMap is missing one or more required fields",
    );
  }

  return {
    cap: scValToI128(capEntry),
    windowSeconds: scValToU64(windowSecondsEntry),
    spentInWindow: scValToI128(spentInWindowEntry),
    windowStartedAt: scValToU64(windowStartedAtEntry),
  };
}

// ── Error decoding ────────────────────────────────────────────────────

export type ContractErrorCode =
  | "NoSpendingLimitPolicyInstalled"
  | "AccountNotFound"
  | "UnsupportedContextType"
  | "UnknownContractError";

const ERROR_MAP: Record<number, ContractErrorCode> = {
  1: "NoSpendingLimitPolicyInstalled",
  2: "AccountNotFound",
  3: "UnsupportedContextType",
};

/** Decode a contract error ScVal into a human-readable name. */
export function decodeContractError(scv: xdr.ScVal): ContractErrorCode {
  if (scv.switch() !== xdr.ScValType.scvError()) {
    return "UnknownContractError";
  }
  const scError = scv.value() as xdr.ScError;
  // contractCode() returns the numeric error code for contract errors
  const code = scError.contractCode();
  return ERROR_MAP[code] ?? "UnknownContractError";
}
