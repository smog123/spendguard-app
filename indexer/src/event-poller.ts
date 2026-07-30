/**
 * Continuous event polling loop.
 *
 * Polls the Soroban RPC for x402 facilitator contract events at a
 * configurable interval, persists a ledger cursor so it can resume after
 * restarts, and decodes raw events into typed SettlementEvent records.
 *
 * RPC providers have an event retention window of ~7 days. This service
 * MUST run continuously to avoid data loss from downtime exceeding the
 * retention window.
 */

import { SorobanClient, type RawContractEvent, type X402SettlementEvent } from "@spendguard/sdk";
import { xdr, scValToNative } from "@stellar/stellar-sdk";
import type { Database } from "./db.js";

// ── Logger ────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [${level}] [EventPoller] ${msg}${metaStr}`);
}

// ── Event decoder ─────────────────────────────────────────────────────

/**
 * Decode a raw Soroban contract event into a typed X402SettlementEvent.
 *
 * The x402 facilitator contract event topic schema is not finalised; the
 * first segment of the topic array identifies the event type. This decoder
 * recognises the expected settlement event schema. The filter should be
 * narrowed once the real facilitator's event structure is confirmed from
 * a live testnet transaction.
 *
 * Expected topic layout (tentative):
 *   topic[0] -> event type string, e.g. "settlement"
 *   topic[1] -> account address (G…)
 *   topic[2] -> context_rule_id (u32)
 *
 * Expected value -> XDR-encoded ScMap with:
 *   { amount: i128, reference: Symbol/string }
 */
function decodeSettlementEvent(raw: RawContractEvent): X402SettlementEvent | null {
  if (raw.topic.length < 3) {
    log("WARN", "Unexpected event topic length", {
      id: raw.id,
      topicCount: raw.topic.length,
    });
    return null;
  }

  const eventType = raw.topic[0];
  if (!eventType || eventType !== "settlement") {
    // Skip events that are not settlements
    return null;
  }

  const account = raw.topic[1];
  const contextRuleIdStr = raw.topic[2];

  if (!account || !contextRuleIdStr) {
    log("WARN", "Missing account or contextRuleId in event topic", {
      id: raw.id,
    });
    return null;
  }

  const contextRuleId = Number.parseInt(contextRuleIdStr, 10);
  if (Number.isNaN(contextRuleId)) {
    log("WARN", "Invalid contextRuleId in event topic", {
      id: raw.id,
      value: contextRuleIdStr,
    });
    return null;
  }      // Decode the value field — the SDK returns it as a decoded ScVal
  let amountSpent = 0n;
  let reference: string | null = null;

  try {
    if (raw.value) {
      const scv = xdr.ScVal.fromXDR(raw.value, "base64");
      if (scv.switch() === xdr.ScValType.scvMap()) {
        const map = scv.map();
        if (map) {
          const amountEntry = map.find(
            (e: xdr.ScMapEntry) => String(scValToNative(e.key())) === "amount",
          );
          if (amountEntry) {
            amountSpent = BigInt(scValToNative(amountEntry.val()) as number | bigint);
          }
          const refEntry = map.find(
            (e: xdr.ScMapEntry) => String(scValToNative(e.key())) === "reference",
          );
          if (refEntry) {
            reference = String(scValToNative(refEntry.val()));
          }
        }
      }
    }
  } catch {
    log("WARN", "Failed to decode event value", { id: raw.id });
  }

  return {
    id: raw.id,
    ledger: raw.ledger,
    timestamp: raw.timestamp,
    account,
    facilitatorContractId: raw.contractId,
    amountSpent,
    contextRuleId,
    reference,
  };
}

// ── Poller ────────────────────────────────────────────────────────────

export class EventPoller {
  private readonly client: SorobanClient;
  private readonly db: Database;
  private readonly facilitatorContractId: string;
  private readonly pollIntervalMs: number;
  private active = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    client: SorobanClient,
    db: Database,
    facilitatorContractId: string,
    pollIntervalMs: number,
  ) {
    this.client = client;
    this.db = db;
    this.facilitatorContractId = facilitatorContractId;
    this.pollIntervalMs = pollIntervalMs;
  }

  get isActive(): boolean {
    return this.active;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.active) {
      log("WARN", "Poller already running");
      return;
    }
    this.active = true;
    log("INFO", "Starting event poller");

    // Schedule the first poll immediately, then recur at the configured
    // interval from the start of each poll cycle.
    await this.pollCycle();
  }

  stop(): void {
    this.active = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    log("INFO", "Event poller stopped");
  }

  // ── Poll cycle ──────────────────────────────────────────────────────

  private async pollCycle(): Promise<void> {
    if (!this.active) return;

    const cycleStart = Date.now();

    try {
      // Resume from the persisted cursor, or derive a starting ledger
      const cursor = await this.db.getCursor();
      const startLedger: number = cursor
        ? cursor.lastLedger
        : Math.max(0, (await this.client.getLatestLedger()) - 100);

      log("INFO", "Polling events", {
        startLedger,
        cursorEventId: cursor?.lastEventId ?? null,
      });

      const { events, latestLedger } =
        await this.client.getEvents({
          startLedger,
          filters: [
            {
              type: "contract",
              contractIds: [this.facilitatorContractId],
              // Topic filter narrowed once the real facilitator event
              // schema is confirmed from a live testnet transaction.
              topics: [["*"]],
            },
          ],
          maxEvents: 100,
        });

      let decodedCount = 0;

      for (const raw of events) {
        try {
          const settlement = decodeSettlementEvent(raw);
          if (settlement) {
            await this.db.insertSettlementEvent({
              id: settlement.id,
              ledger: settlement.ledger,
              account: settlement.account,
              facilitatorContractId: settlement.facilitatorContractId,
              amountSpent: settlement.amountSpent,
              contextRuleId: settlement.contextRuleId,
              reference: settlement.reference,
            });
            decodedCount++;
          }
        } catch (err) {
          log("ERROR", "Failed to persist settlement event", {
            eventId: raw.id,
            error: String(err),
          });
        }
      }

      // Persist the cursor so we resume from the right place
      const lastEventId =
        events.length > 0 ? (events[events.length - 1]?.id ?? null) : null;
      await this.db.upsertCursor(latestLedger, lastEventId);

      log("INFO", "Poll cycle complete", {
        eventsFetched: events.length,
        decoded: decodedCount,
        newCursorLedger: latestLedger,
      });
    } catch (err) {
      log("ERROR", "Poll cycle failed", { error: String(err) });
      // Continue the loop despite errors — don't crash the indexer
    }

    // Schedule the next cycle
    const elapsed = Date.now() - cycleStart;
    const delay = Math.max(100, this.pollIntervalMs - elapsed);
    this.pollTimeout = setTimeout(() => {
      this.pollCycle().catch((err) => {
        log("ERROR", "Unhandled error in poll cycle", { error: String(err) });
      });
    }, delay);
  }
}
