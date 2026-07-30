// ── On-chain event types ──────────────────────────────────────────────

/** Raw Soroban event as returned by getEvents, before decoding. */
export interface RawContractEvent {
  id: string;
  ledger: number;
  topic: string[];
  value: string;
  contractId: string;
  timestamp: number | null;
}

/** Decoded x402 settlement event produced by the facilitator contract. */
export interface X402SettlementEvent {
  /** Unique event identifier (RPC-provided). */
  id: string;
  /** Stellar ledger sequence where this event was emitted. */
  ledger: number;
  /** Unix timestamp (seconds) if the RPC provider includes it, else null. */
  timestamp: number | null;
  /** The smart account address that authorised the spend. */
  account: string;
  /** The x402 facilitator contract that processed the settlement. */
  facilitatorContractId: string;
  /** Amount of the native asset spent, in stroops (1 XLM = 10^7 stroops). */
  amountSpent: bigint;
  /** Context rule ID this spend was matched against. */
  contextRuleId: number;
  /** Optional invoice / memo reference. */
  reference: string | null;
}

// ── Policy ────────────────────────────────────────────────────────────

/** View returned by the policy-view-helper contract. */
export interface SpendingLimitView {
  cap: bigint;
  windowSeconds: bigint;
  spentInWindow: bigint;
  windowStartedAt: bigint;
}

export interface SpendingLimitState {
  account: string;
  contextRuleId: number;
  cap: bigint;
  windowSeconds: bigint;
  spentInWindow: bigint;
  windowStartedAt: bigint;
  /** Percentage of cap consumed (0-100). */
  utilizationPct: number;
}

// ── Indexer cursor ────────────────────────────────────────────────────

export interface Cursor {
  lastLedger: number;
  lastEventId: string | null;
  updatedAt: Date;
}

// ── Breach / alert types ──────────────────────────────────────────────

export type AlertLevel = "near_miss" | "breach";

export interface SpendAlert {
  id: string;
  account: string;
  contextRuleId: number;
  level: AlertLevel;
  /** The amount that caused the alert. */
  eventAmount: bigint;
  /** Total spent in window after this event. */
  totalSpentInWindow: bigint;
  /** Cap for the policy. */
  cap: bigint;
  /** Ledger at which the triggering event was observed. */
  triggerLedger: number;
  /** ISO-8601 timestamp when the alert was raised. */
  raisedAt: string;
  /** Whether the webhook notification was successfully delivered. */
  webhookDelivered: boolean;
}

// ── Webhook configuration ─────────────────────────────────────────────

export interface WebhookConfig {
  id: string;
  url: string;
  /** Optional bearer token sent as Authorization header. */
  secret: string | null;
  /** Alert levels to dispatch. */
  alertLevels: AlertLevel[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Monitored account ─────────────────────────────────────────────────

export interface MonitoredAccount {
  address: string;
  label: string | null;
  contextRuleId: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
