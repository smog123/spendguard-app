import { describe, it, expect } from "vitest";
import { xdr, nativeToScVal, Address } from "@stellar/stellar-sdk";
import {
  addressToScVal,
  scValToAddress,
  u32ToScVal,
  scValToU32,
  i128ToScVal,
  scValToI128,
  u64ToScVal,
  scValToU64,
  decodeSpendingLimitView,
  decodeContractError,
} from "../src/xdr-helpers.js";

// A well-formed testnet public key (G…).
const TEST_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
// A well-formed contract id (C…).
const TEST_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

describe("address helpers", () => {
  it("round-trips an address through ScVal", () => {
    const scv = addressToScVal(TEST_ADDRESS);
    expect(scv.switch()).toBe(xdr.ScValType.scvAddress());
    expect(scValToAddress(scv)).toBe(TEST_ADDRESS);
  });

  it("round-trips a contract address through ScVal", () => {
    const scv = addressToScVal(TEST_CONTRACT);
    expect(scValToAddress(scv)).toBe(TEST_CONTRACT);
  });
});

describe("numeric helpers", () => {
  it("round-trips u32", () => {
    expect(scValToU32(u32ToScVal(42))).toBe(42);
  });

  it("round-trips i128 values beyond Number.MAX_SAFE_INTEGER", () => {
    const big = 9_000_000_000_000_000_000n;
    expect(scValToI128(i128ToScVal(big))).toBe(big);
  });

  it("round-trips u64 values beyond Number.MAX_SAFE_INTEGER", () => {
    const big = 18_000_000_000_000_000_000n;
    expect(scValToU64(u64ToScVal(big))).toBe(big);
  });
});

describe("decodeSpendingLimitView", () => {
  function buildView(cap: bigint, windowSeconds: bigint, spent: bigint, startedAt: bigint): xdr.ScVal {
    return xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("cap"),
        val: nativeToScVal(cap, { type: "i128" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("window_seconds"),
        val: nativeToScVal(windowSeconds, { type: "u64" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("spent_in_window"),
        val: nativeToScVal(spent, { type: "i128" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("window_started_at"),
        val: nativeToScVal(startedAt, { type: "u64" }),
      }),
    ]);
  }

  it("decodes a complete SpendingLimitView map", () => {
    const view = decodeSpendingLimitView(buildView(10_000_000n, 17280n, 2_500_000n, 123456789n));
    expect(view.cap).toBe(10_000_000n);
    expect(view.windowSeconds).toBe(17280n);
    expect(view.spentInWindow).toBe(2_500_000n);
    expect(view.windowStartedAt).toBe(123456789n);
  });

  it("throws when a required key is missing", () => {
    const incomplete = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("cap"),
        val: nativeToScVal(1n, { type: "i128" }),
      }),
    ]);
    expect(() => decodeSpendingLimitView(incomplete)).toThrow(
      /missing one or more required fields/,
    );
  });

  it("throws when the ScVal is not a map", () => {
    expect(() => decodeSpendingLimitView(nativeToScVal(1n, { type: "i128" }))).toThrow(
      /is not a map/,
    );
  });
});

describe("decodeContractError", () => {
  function contractError(code: number): xdr.ScVal {
    // xdr.ScError.sceContract(code) builds a contract error with that code.
    return xdr.ScVal.scvError(xdr.ScError.sceContract(code));
  }

  it("maps known contract error codes", () => {
    expect(decodeContractError(contractError(1))).toBe("NoSpendingLimitPolicyInstalled");
    expect(decodeContractError(contractError(2))).toBe("AccountNotFound");
    expect(decodeContractError(contractError(3))).toBe("UnsupportedContextType");
  });

  it("returns UnknownContractError for unrecognised codes", () => {
    expect(decodeContractError(contractError(99))).toBe("UnknownContractError");
  });

  it("returns UnknownContractError for non-error ScVals", () => {
    expect(decodeContractError(nativeToScVal(1n, { type: "i128" }))).toBe(
      "UnknownContractError",
    );
  });
});
