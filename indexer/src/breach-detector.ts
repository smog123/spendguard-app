/**
 * Breach detector.
 *
 * After a settlement event has been ingested, the breach detector reads
 * the account's current spending-limit state from the policy-view-helper
 * contract and compares the window spend against the cap. If the post-event
 * spend exceeds the cap, a "breach" alert is raised. If it exceeds the
 * near-miss threshold (configurable, default 90% of cap), a "near_miss"
 * alert is raised.
 *
 * Alerts are deduplicated: the same event never triggers more than one
 * alert, and alerts are idempotent in the DB (ON CONFLICT DO NOTHING).
 */

import { PolicyReader } from "@spendguard/sdk";
import type { SpendAlert, AlertLevel } from "@spendguard/sdk";
import type { Database } from "./db.js";
import crypto from "node:crypto";

// ── Logger ────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [${level}] [BreachDetector] ${msg}${metaStr}`);
}

// ── Alert ID generation ───────────────────────────────────────────────

/**
 * Deterministic alert ID so the same event+account+rule never creates
 * duplicate alert rows.
 */
function alertId(
  account: string,
  contextRuleId: number,
  ledger: number,
  level: AlertLevel,
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${account}:${contextRuleId}:${ledger}:${level}`)
    .digest("hex")
    .slice(0, 16);
  return `alert_${hash}`;
}

// ── Detector ──────────────────────────────────────────────────────────

export class BreachDetector {
  private readonly policyReader: PolicyReader;
  private readonly db: Database;
  private readonly nearMissThresholdPct: number;

  constructor(
    policyReader: PolicyReader,
    db: Database,
    nearMissThresholdPct: number,
  ) {
    this.policyReader = policyReader;
    this.db = db;
    this.nearMissThresholdPct = nearMissThresholdPct;
  }

  /**
   * Evaluate a settlement event against the spending limit policy and
   * raise alerts if thresholds are crossed.
   *
   * @returns Array of alerts generated (possibly empty).
   */
  async evaluateEvent(event: {
    account: string;
    contextRuleId: number;
    amountSpent: bigint;
    triggerLedger: number;
  }): Promise<SpendAlert[]> {
    const alerts: SpendAlert[] = [];

    try {
      // Fetch current spending limit state from the policy contract
      const state = await this.policyReader.getSpendingLimitState(
        event.account,
        event.contextRuleId,
      );

      log("INFO", "Policy state fetched", {
        account: event.account,
        contextRuleId: event.contextRuleId,
        spentInWindow: state.spentInWindow.toString(),
        cap: state.cap.toString(),
        utilizationPct: state.utilizationPct,
      });

      const raisedAt = new Date().toISOString();

      // Check for breach (spent >= cap). A cap of 0 means no limit is
      // configured, so it can never be breached (mirrors the near-miss
      // guard below).
      if (state.cap > 0n && state.spentInWindow >= state.cap) {
        const alert: SpendAlert = {
          id: alertId(event.account, event.contextRuleId, event.triggerLedger, "breach"),
          account: event.account,
          contextRuleId: event.contextRuleId,
          level: "breach",
          eventAmount: event.amountSpent,
          totalSpentInWindow: state.spentInWindow,
          cap: state.cap,
          triggerLedger: event.triggerLedger,
          raisedAt,
          webhookDelivered: false,
        };

        await this.db.insertAlert({
          id: alert.id,
          account: alert.account,
          contextRuleId: alert.contextRuleId,
          level: alert.level,
          eventAmount: alert.eventAmount,
          totalSpentInWindow: alert.totalSpentInWindow,
          cap: alert.cap,
          triggerLedger: alert.triggerLedger,
          raisedAt: alert.raisedAt,
          webhookDelivered: alert.webhookDelivered,
        });

        alerts.push(alert);
        log("WARN", "Breach alert raised", {
          account: event.account,
          cap: state.cap.toString(),
          spent: state.spentInWindow.toString(),
        });
      }
      // Check for near-miss (spent >= cap * threshold%)
      else if (
        state.cap > 0n &&
        state.spentInWindow * 100n >= state.cap * BigInt(this.nearMissThresholdPct)
      ) {
        const alert: SpendAlert = {
          id: alertId(event.account, event.contextRuleId, event.triggerLedger, "near_miss"),
          account: event.account,
          contextRuleId: event.contextRuleId,
          level: "near_miss",
          eventAmount: event.amountSpent,
          totalSpentInWindow: state.spentInWindow,
          cap: state.cap,
          triggerLedger: event.triggerLedger,
          raisedAt,
          webhookDelivered: false,
        };

        await this.db.insertAlert({
          id: alert.id,
          account: alert.account,
          contextRuleId: alert.contextRuleId,
          level: alert.level,
          eventAmount: alert.eventAmount,
          totalSpentInWindow: alert.totalSpentInWindow,
          cap: alert.cap,
          triggerLedger: alert.triggerLedger,
          raisedAt: alert.raisedAt,
          webhookDelivered: alert.webhookDelivered,
        });

        alerts.push(alert);
        log("INFO", "Near-miss alert raised", {
          account: event.account,
          thresholdPct: this.nearMissThresholdPct,
          spent: state.spentInWindow.toString(),
          cap: state.cap.toString(),
        });
      }
    } catch (err) {
      log("ERROR", "Failed to evaluate event against policy", {
        account: event.account,
        contextRuleId: event.contextRuleId,
        error: String(err),
      });
      // Do not crash the indexer on policy-read failures; the next event
      // will re-evaluate.
    }

    return alerts;
  }
}
