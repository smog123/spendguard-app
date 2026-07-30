/**
 * Alert dispatcher.
 *
 * For each alert that is raised, the dispatcher POSTs the alert payload
 * to each enabled webhook endpoint. Delivery is best-effort: failures are
 * logged but do not block the indexer loop.
 *
 * The webhook payload is a JSON object conforming to SpendAlert.
 */

import type { SpendAlert } from "@spendguard/sdk";
import type { Database } from "./db.js";

// ── Logger ────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [${level}] [AlertDispatcher] ${msg}${metaStr}`);
}

// ── Webhook payload ───────────────────────────────────────────────────

interface WebhookPayload {
  event: "spendguard.alert";
  id: string;
  account: string;
  contextRuleId: number;
  level: string;
  eventAmount: string; // bigint serialised as string
  totalSpentInWindow: string;
  cap: string;
  triggerLedger: number;
  raisedAt: string;
}

function buildPayload(alert: SpendAlert): WebhookPayload {
  return {
    event: "spendguard.alert",
    id: alert.id,
    account: alert.account,
    contextRuleId: alert.contextRuleId,
    level: alert.level,
    eventAmount: alert.eventAmount.toString(),
    totalSpentInWindow: alert.totalSpentInWindow.toString(),
    cap: alert.cap.toString(),
    triggerLedger: alert.triggerLedger,
    raisedAt: alert.raisedAt,
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────

export class AlertDispatcher {
  private readonly db: Database;
  private readonly timeoutMs: number;

  constructor(db: Database, timeoutMs: number) {
    this.db = db;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Dispatch an alert to all enabled webhook endpoints.
   *
   * The `alert.webhookDelivered` field is updated to `true` only if ALL
   * configured webhooks return HTTP 2xx. At-least-once delivery is
   * achieved by retrying on the next poll cycle (the alert is re-fetched
   * from the DB).
   *
   * @returns `true` if the alert was delivered to all webhooks.
   */
  async dispatchAlert(alert: SpendAlert): Promise<boolean> {
    const webhooks = await this.db.getWebhookConfigs();

    if (webhooks.length === 0) {
      log("INFO", "No webhook configs found; alert logged but not dispatched", {
        alertId: alert.id,
      });
      return false;
    }

    const matchingWebhooks = webhooks.filter((wh) =>
      wh.alertLevels.includes(alert.level),
    );

    if (matchingWebhooks.length === 0) {
      log("INFO", "No webhooks match alert level", {
        alertId: alert.id,
        level: alert.level,
      });
      return false;
    }

    const payload = buildPayload(alert);
    let allDelivered = true;

    for (const webhook of matchingWebhooks) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "SpendGuard/0.1",
        };
        if (webhook.secret) {
          headers["Authorization"] = `Bearer ${webhook.secret}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          log("INFO", "Alert dispatched to webhook", {
            alertId: alert.id,
            webhookUrl: webhook.url,
            status: response.status,
          });
        } else {
          log("WARN", "Webhook returned non-2xx", {
            alertId: alert.id,
            webhookUrl: webhook.url,
            status: response.status,
          });
          allDelivered = false;
        }
      } catch (err) {
        log("ERROR", "Failed to POST alert to webhook", {
          alertId: alert.id,
          webhookUrl: webhook.url,
          error: String(err),
        });
        allDelivered = false;
      }
    }

    // Update delivery status if any webhook was called
    if (matchingWebhooks.length > 0 && allDelivered) {
      await this.db.sql`
        UPDATE alerts SET webhook_delivered = true WHERE id = ${alert.id}
      `;
    }

    return allDelivered;
  }
}
