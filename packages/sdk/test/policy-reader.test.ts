import { describe, it, expect, vi } from "vitest";
import { xdr, nativeToScVal, type rpc } from "@stellar/stellar-sdk";
import { PolicyReader, PolicyReaderError } from "../src/policy-reader.js";
import type { SorobanClient } from "../src/soroban-client.js";

const ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function spendingLimitViewScv(): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("cap"),
      val: nativeToScVal(10_000_000n, { type: "i128" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("window_seconds"),
      val: nativeToScVal(17280n, { type: "u64" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("spent_in_window"),
      val: nativeToScVal(5_000_000n, { type: "i128" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("window_started_at"),
      val: nativeToScVal(987654321n, { type: "u64" }),
    }),
  ]);
}

/** Build a mock SorobanClient whose simulateContract returns `response`. */
function mockClient(
  simulateContract: ReturnType<typeof vi.fn>,
): SorobanClient {
  return { simulateContract } as unknown as SorobanClient;
}

describe("PolicyReader.getSpendingLimitState", () => {
  it("decodes a successful simulation into a SpendingLimitState", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: { retval: spendingLimitViewScv() },
      latestLedger: 1234,
    } as unknown as rpc.Api.SimulateTransactionResponse);

    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);
    const state = await reader.getSpendingLimitState(ACCOUNT, 3);

    expect(state).toMatchObject({
      account: ACCOUNT,
      contextRuleId: 3,
      cap: 10_000_000n,
      windowSeconds: 17280n,
      spentInWindow: 5_000_000n,
      windowStartedAt: 987654321n,
      utilizationPct: 50,
    });
    // simulateContract must receive the account + rule args as ScVals
    const [, , fn, args] = simulate.mock.calls[0] as [string, string, string, xdr.ScVal[]];
    expect(fn).toBe("get_spending_limit_state");
    expect(args).toHaveLength(2);
  });

  it("maps RPC failures to PolicyReaderError(RPC_FAILURE)", async () => {
    const simulate = vi.fn().mockRejectedValue(new Error("network down"));
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "RPC_FAILURE",
    });
  });

  it("maps contract errors to PolicyReaderError(CONTRACT_ERROR)", async () => {
    const simulate = vi.fn().mockResolvedValue({
      error: "ContractError(1)",
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "CONTRACT_ERROR",
    });
  });

  it("maps restore-required responses to PolicyReaderError(RESTORE_REQUIRED)", async () => {
    const simulate = vi.fn().mockResolvedValue({
      // No `error` (so not an error) and no `transactionData` (so not a success)
      restorePreamble: {},
      latestLedger: 5,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "RESTORE_REQUIRED",
    });
  });

  it("maps a missing result to PolicyReaderError(NO_RESULT)", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: undefined,
      latestLedger: 5,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "NO_RESULT",
    });
  });

  it("maps a missing retval to PolicyReaderError(NO_RETVAL)", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: {},
      latestLedger: 5,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "NO_RETVAL",
    });
  });

  it("maps a malformed retval to PolicyReaderError(DECODE_ERROR)", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: { retval: nativeToScVal(1n, { type: "i128" }) },
      latestLedger: 5,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getSpendingLimitState(ACCOUNT, 0)).rejects.toMatchObject({
      code: "DECODE_ERROR",
    });
  });

  it("computes utilizationPct as 0 when the cap is zero", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: {
        retval: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("cap"),
            val: nativeToScVal(0n, { type: "i128" }),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("window_seconds"),
            val: nativeToScVal(17280n, { type: "u64" }),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("spent_in_window"),
            val: nativeToScVal(0n, { type: "i128" }),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("window_started_at"),
            val: nativeToScVal(0n, { type: "u64" }),
          }),
        ]),
      },
      latestLedger: 5,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    const state = await reader.getSpendingLimitState(ACCOUNT, 0);
    expect(state.utilizationPct).toBe(0);
  });
});

describe("PolicyReader.getVersion", () => {
  it("decodes a successful version", async () => {
    const simulate = vi.fn().mockResolvedValue({
      transactionData: {},
      result: { retval: nativeToScVal(7, { type: "u32" }) },
      latestLedger: 10,
    } as unknown as rpc.Api.SimulateTransactionResponse);
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getVersion()).resolves.toBe(7);
  });

  it("maps RPC failures to PolicyReaderError(RPC_FAILURE)", async () => {
    const simulate = vi.fn().mockRejectedValue(new Error("boom"));
    const reader = new PolicyReader(mockClient(simulate), CONTRACT, SOURCE);

    await expect(reader.getVersion()).rejects.toMatchObject({ code: "RPC_FAILURE" });
  });
});
