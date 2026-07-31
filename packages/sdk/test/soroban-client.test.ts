import { describe, it, expect, vi } from "vitest";
import { nativeToScVal, type rpc } from "@stellar/stellar-sdk";
import { SorobanClient } from "../src/soroban-client.js";
import type { ContractEventFilter } from "../src/soroban-client.js";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const USDC_TESTNET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
// Valid address strkey (parsed by Address.fromString in nativeToScVal).
const FROM = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/** Build a GetEventsResponse the way the RPC returns it (RetentionState fields included). */
function getEventsResponse(
  latestLedger: number,
  events: rpc.Api.EventResponse[] = [],
): rpc.Api.GetEventsResponse {
  return {
    events,
    latestLedger,
    oldestLedger: 1,
    latestLedgerCloseTime: "2026-07-31T00:00:00Z",
    oldestLedgerCloseTime: "2026-07-01T00:00:00Z",
    cursor: "0016740266396352511-4294967295",
  } as rpc.Api.GetEventsResponse;
}

function makeEvent(ledger: number, id: string): rpc.Api.EventResponse {
  return {
    id,
    type: "contract",
    ledger,
    ledgerClosedAt: "2026-07-31T00:00:00Z",
    transactionIndex: 0,
    operationIndex: 0,
    inSuccessfulContractCall: true,
    txHash: "cafebabe",
    contractId: USDC_TESTNET,
    topic: [
      nativeToScVal("transfer", { type: "symbol" }),
      nativeToScVal(FROM, { type: "address" }),
      nativeToScVal(FROM, { type: "address" }),
    ],
    value: nativeToScVal(5_000_000n, { type: "i128" }),
  } as unknown as rpc.Api.EventResponse;
}

describe("SorobanClient.getEvents", () => {
  it("advances the cursor from the RPC latestLedger even when zero events are returned", async () => {
    const client = new SorobanClient({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    const rpcLatestLedger = 3_900_000;
    const getEventsSpy = vi
      .spyOn(client.server, "getEvents")
      .mockResolvedValue(getEventsResponse(rpcLatestLedger));

    const filters: ContractEventFilter[] = [
      { type: "contract", contractIds: [USDC_TESTNET], topics: [["transfer"]] },
    ];

    const result = await client.getEvents({
      startLedger: 3_897_562,
      filters,
      maxEvents: 100,
    });

    expect(getEventsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 3_897_562, limit: 100 }),
    );
    expect(result.events).toEqual([]);
    // The cursor must track the RPC's latest ledger, not the (empty) events
    // array — otherwise the persisted cursor would never advance past
    // startLedger while the contract is idle.
    expect(result.latestLedger).toBe(rpcLatestLedger);
    expect(result.latestLedger).toBeGreaterThan(3_897_562);
    expect(result.cursor).toBe("0016740266396352511-4294967295");
  });

  it("uses the RPC latestLedger even when events are present", async () => {
    const client = new SorobanClient({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    const eventLedger = 3_899_000;
    const rpcLatestLedger = 3_900_000;
    vi.spyOn(client.server, "getEvents").mockResolvedValue(
      getEventsResponse(rpcLatestLedger, [makeEvent(eventLedger, "evt-1")]),
    );

    const result = await client.getEvents({
      startLedger: 3_897_562,
      filters: [{ type: "contract", contractIds: [USDC_TESTNET], topics: [["transfer"]] }],
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.ledger).toBe(eventLedger);
    // Still the RPC's own view of the latest ledger, not the event ledger.
    expect(result.latestLedger).toBe(rpcLatestLedger);
  });
});
