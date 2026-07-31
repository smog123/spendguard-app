import { describe, it, expect } from "vitest";
import { xdr, nativeToScVal, Address } from "@stellar/stellar-sdk";
import {
  decodeSettlementEvent,
  decodeTransferAmount,
  decodeSpendingLimitEnforced,
} from "../src/event-poller.js";
import type { RawContractEvent } from "@spendguard/sdk";

// Real testnet values used across the app.
const USDC_TESTNET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const FROM = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const TO = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHT";
const SMART_ACCOUNT = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABF4";

// ── XDR builders (real encodings via @stellar/stellar-sdk) ────────────

/** SEP-41 transfer event value: single-value i128 amount format. */
function transferAmountI128Scv(amount: bigint): string {
  return nativeToScVal(amount, { type: "i128" }).toXDR("base64");
}

/** SEP-41 transfer event value: map { amount: i128, to_muxed_id } format. */
function transferAmountMapScv(amount: bigint): string {
  const scv = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: nativeToScVal(amount, { type: "i128" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("to_muxed_id"),
      val: xdr.ScVal.scvVoid(),
    }),
  ]);
  return scv.toXDR("base64");
}

/** OZ spending_limit_enforced event value: map with the 4 data fields. */
function spendingLimitEnforcedScv(opts: {
  contextRuleId: number;
  amount: bigint;
  totalSpentInPeriod: bigint;
}): string {
  const scv = xdr.ScVal.scvMap([
    // `context` is a soroban_sdk::auth::Context enum (ContractContext) — the
    // decoder ignores it, so a plausible map stands in for the real value.
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("context"),
      val: xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("contract"),
      // Address.fromString() cannot parse C… contract strkeys in this SDK
      // version; the decoder ignores `context`, so a plain string suffices.
      val: xdr.ScVal.scvString(SMART_ACCOUNT),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("fn_name"),
          val: xdr.ScVal.scvSymbol("spend"),
        }),
      ]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("context_rule_id"),
      val: nativeToScVal(opts.contextRuleId, { type: "u32" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: nativeToScVal(opts.amount, { type: "i128" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("total_spent_in_period"),
      val: nativeToScVal(opts.totalSpentInPeriod, { type: "i128" }),
    }),
  ]);
  return scv.toXDR("base64");
}

function transferEvent(opts: {
  value: string;
  from?: string;
  to?: string;
  contractId?: string;
  id?: string;
}): RawContractEvent {
  return {
    id: opts.id ?? "evt-transfer-1",
    ledger: 12345,
    topic: ["transfer", opts.from ?? FROM, opts.to ?? TO],
    value: opts.value,
    contractId: opts.contractId ?? USDC_TESTNET,
    timestamp: 1700000000,
  };
}

function spendingLimitEvent(opts: {
  value: string;
  smartAccount?: string;
  contractId?: string;
}): RawContractEvent {
  return {
    id: "evt-sl-1",
    ledger: 12346,
    topic: ["spending_limit_enforced", opts.smartAccount ?? SMART_ACCOUNT],
    value: opts.value,
    contractId: opts.contractId ?? SMART_ACCOUNT,
    timestamp: 1700000000,
  };
}

// ── decodeTransferAmount ──────────────────────────────────────────────

describe("decodeTransferAmount", () => {
  it("decodes the SEP-41 single-value i128 format", () => {
    expect(decodeTransferAmount(transferAmountI128Scv(5_000_000n))).toBe(5_000_000n);
  });

  it("decodes the SEP-41 map { amount } format", () => {
    expect(decodeTransferAmount(transferAmountMapScv(12_345_678n))).toBe(12_345_678n);
  });

  it("returns null for empty or invalid XDR", () => {
    expect(decodeTransferAmount("")).toBeNull();
    expect(decodeTransferAmount("not-base64!!")).toBeNull();
  });

  it("returns null for a non-amount ScVal (e.g. an address)", () => {
    const addressScv = Address.fromString(FROM).toScVal().toXDR("base64");
    expect(decodeTransferAmount(addressScv)).toBeNull();
  });
});

// ── decodeSpendingLimitEnforced ───────────────────────────────────────

describe("decodeSpendingLimitEnforced", () => {
  it("decodes context_rule_id and amount from the OZ data map", () => {
    const decoded = decodeSpendingLimitEnforced(
      spendingLimitEnforcedScv({ contextRuleId: 7, amount: 250_000n, totalSpentInPeriod: 250_000n }),
    );
    expect(decoded).toEqual({ contextRuleId: 7, amount: 250_000n });
  });

  it("returns null for non-map values", () => {
    expect(decodeSpendingLimitEnforced(transferAmountI128Scv(1n))).toBeNull();
  });

  it("returns null when required keys are missing", () => {
    const partial = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("amount"),
        val: nativeToScVal(1n, { type: "i128" }),
      }),
    ]).toXDR("base64");
    expect(decodeSpendingLimitEnforced(partial)).toBeNull();
  });
});

// ── decodeSettlementEvent ─────────────────────────────────────────────

describe("decodeSettlementEvent", () => {
  it("decodes a transfer from a monitored account with its context rule", () => {
    const raw = transferEvent({ value: transferAmountI128Scv(5_000_000n) });
    const ruleByAccount = new Map<string, number>([[FROM, 3]]);

    const decoded = decodeSettlementEvent(raw, ruleByAccount);

    expect(decoded).toMatchObject({
      id: raw.id,
      ledger: raw.ledger,
      account: FROM,
      sourceContractId: USDC_TESTNET,
      amountSpent: 5_000_000n,
      contextRuleId: 3,
      reference: TO,
    });
  });

  it("decodes a transfer using the map data format", () => {
    const raw = transferEvent({ value: transferAmountMapScv(99_000n) });
    const decoded = decodeSettlementEvent(raw, new Map<string, number>([[FROM, 1]]));
    expect(decoded?.amountSpent).toBe(99_000n);
  });

  it("skips transfers from accounts that are not monitored", () => {
    const raw = transferEvent({ value: transferAmountI128Scv(5_000_000n) });
    expect(decodeSettlementEvent(raw, new Map<string, number>())).toBeNull();
  });

  it("skips transfers whose amount cannot be decoded", () => {
    const raw = transferEvent({ value: "garbage" });
    expect(decodeSettlementEvent(raw, new Map<string, number>([[FROM, 3]]))).toBeNull();
  });

  it("decodes an OZ spending_limit_enforced event directly", () => {
    const raw = spendingLimitEvent({
      value: spendingLimitEnforcedScv({
        contextRuleId: 5,
        amount: 900_000n,
        totalSpentInPeriod: 900_000n,
      }),
    });
    const decoded = decodeSettlementEvent(raw, new Map<string, number>());

    expect(decoded).toMatchObject({
      id: raw.id,
      ledger: raw.ledger,
      account: SMART_ACCOUNT,
      sourceContractId: SMART_ACCOUNT,
      amountSpent: 900_000n,
      contextRuleId: 5,
      reference: null,
    });
  });

  it("skips events that are neither transfer nor spending_limit_enforced", () => {
    const raw: RawContractEvent = {
      id: "evt-approve",
      ledger: 1,
      topic: ["approve", FROM, TO],
      value: transferAmountI128Scv(1n),
      contractId: USDC_TESTNET,
      timestamp: null,
    };
    expect(decodeSettlementEvent(raw, new Map<string, number>([[FROM, 1]]))).toBeNull();
  });

  it("skips transfer events with too few topics", () => {
    const raw: RawContractEvent = {
      id: "evt-short",
      ledger: 1,
      topic: ["transfer", FROM],
      value: transferAmountI128Scv(1n),
      contractId: USDC_TESTNET,
      timestamp: null,
    };
    expect(decodeSettlementEvent(raw, new Map<string, number>([[FROM, 1]]))).toBeNull();
  });

  it("skips spending_limit_enforced events missing the smart_account topic", () => {
    const raw: RawContractEvent = {
      id: "evt-sl-short",
      ledger: 1,
      topic: ["spending_limit_enforced"],
      value: spendingLimitEnforcedScv({ contextRuleId: 1, amount: 1n, totalSpentInPeriod: 1n }),
      contractId: SMART_ACCOUNT,
      timestamp: null,
    };
    expect(decodeSettlementEvent(raw, new Map<string, number>())).toBeNull();
  });
});

// ── Real on-chain golden fixture ──────────────────────────────────────
//
// TODO: golden fixture test against a real on-chain transfer event, once
// testnet USDC has activity.
//
// Why this is a TODO: as of 2026-07-31 the SDF testnet had ZERO
// SEP-41-shaped (topics ["transfer", from, to]) events in the full ~7-day
// RPC retention window. A getEvents scan with topic filter [["transfer"]]
// across ALL contracts returned only single-topic custom events, and both
// officially documented tokens — testnet USDC (CBIELTK6Y…) and the testnet
// XLM SAC (CDLZFC3S…) — were idle. When USDC (or any SEP-41 token) emits a
// real transfer, capture it and swap the fixture below for a real
// 3-topic event to also pin the topic-decoding path against chain data.
//
// The fixture below is the closest real on-chain data currently available:
// a real testnet event (contract CCKRLPKII3U47ACRGYVSNT3ZZ5AA3N63HYDIQE
// FTWSPWLSIAEXI2XPIB, ledger 3781099) captured via
// soroban-testnet.stellar.org getEvents whose VALUE is a real base64 ScVal
// map with an "amount" key — the exact branch decodeTransferAmount uses
// for the SEP-41 map format. Its topic shape is NOT SEP-41 (single
// ["transfer"] topic), so it exercises the value decoder only; the SEP-41
// topic shape is covered by the encoder-built tests above.

const REAL_TESTNET_TRANSFER_VALUE =
  "AAAAEQAAAAEAAAADAAAADwAAAAZhbW91bnQAAAAAAAoAAAAAAAAAAAAAAAAATB62AAAADwAAAARmcm9tAAAAAQAAAA8AAAACdG8AAAAAABIAAAAAAAAAALQ+5OBjUvO04LbH1YkMWDu4sRey2ydDbmscUz4p7ds3";
const REAL_TESTNET_TRANSFER_CONTRACT =
  "CCKRLPKII3U47ACRGYVSNT3ZZ5AA3N63HYDIQEFTWSPWLSIAEXI2XPIB";

// Amount decoded from the real event value by scValToNative (0x4C1EB6).
const REAL_TESTNET_TRANSFER_AMOUNT = 4988598n;

describe("real on-chain golden fixture (testnet RPC)", () => {
  it("decodes a real on-chain transfer VALUE (map format with amount)", () => {
    expect(decodeTransferAmount(REAL_TESTNET_TRANSFER_VALUE)).toBe(
      REAL_TESTNET_TRANSFER_AMOUNT,
    );
  });

  it("rejects the real non-SEP-41-shaped event (single-topic) gracefully", () => {
    const raw: RawContractEvent = {
      id: "evt-real-1",
      ledger: 3781099,
      topic: ["transfer"],
      value: REAL_TESTNET_TRANSFER_VALUE,
      contractId: REAL_TESTNET_TRANSFER_CONTRACT,
      timestamp: null,
    };
    expect(decodeSettlementEvent(raw, new Map<string, number>())).toBeNull();
  });
});
