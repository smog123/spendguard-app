/**
 * API route for monitored accounts.
 *
 * GET  /api/accounts        — list all monitored accounts
 * GET  /api/accounts?address=G...&alerts=true — get alerts for an account
 * POST /api/accounts        — add a new monitored account
 *
 * Uses a direct Postgres connection. In production, this route and the
 * indexer share the same DATABASE_URL. For Vercel deployments where the
 * indexer runs elsewhere, both point at the same Postgres instance.
 */

import { NextResponse } from "next/server";
import postgres from "postgres";

// ── Helpers ───────────────────────────────────────────────────────────

function getDb(): postgres.Sql {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  return postgres(databaseUrl, { max: 2, idle_timeout: 10 });
}

// ── GET ───────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const includeAlerts = searchParams.get("alerts") === "true";

    const sql = getDb();

    if (address && includeAlerts) {
      // Fetch alerts for a specific account
      const alerts = await sql`
        SELECT id, account, context_rule_id, level,
               event_amount, total_spent_in_window, cap,
               trigger_ledger, raised_at, webhook_delivered
        FROM alerts
        WHERE account = ${address}
        ORDER BY raised_at DESC
        LIMIT 100
      `;

      const mapped = alerts.map((a) => ({
        id: a.id as string,
        account: a.account as string,
        contextRuleId: a.context_rule_id as number,
        level: a.level as string,
        eventAmount: (a.event_amount as string).toString(),
        totalSpentInWindow: (a.total_spent_in_window as string).toString(),
        cap: (a.cap as string).toString(),
        triggerLedger: a.trigger_ledger as number,
        raisedAt: (a.raised_at as Date).toISOString(),
        webhookDelivered: a.webhook_delivered as boolean,
      }));

      return NextResponse.json(mapped);
    }

    // List all monitored accounts
    const accounts = await sql`
      SELECT address, label, context_rule_id, enabled, created_at, updated_at
      FROM monitored_accounts
      ORDER BY created_at DESC
    `;

    const mapped = accounts.map((a) => ({
      address: a.address as string,
      label: (a.label as string | null) ?? null,
      contextRuleId: a.context_rule_id as number,
      enabled: a.enabled as boolean,
      createdAt: (a.created_at as Date).toISOString(),
      updatedAt: (a.updated_at as Date).toISOString(),
    }));

    await sql.end({ timeout: 3 });
    return NextResponse.json(mapped);
  } catch (err) {
    console.error("GET /api/accounts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      address: string;
      label?: string;
      contextRuleId: number;
    };

    if (!body.address || typeof body.contextRuleId !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: address, contextRuleId" },
        { status: 400 },
      );
    }

    // Validate address format — Stellar public key starts with G
    if (!body.address.startsWith("G") || body.address.length !== 56) {
      return NextResponse.json(
        { error: "Invalid Stellar public key format" },
        { status: 400 },
      );
    }

    const sql = getDb();

    const result = await sql`
      INSERT INTO monitored_accounts (address, label, context_rule_id)
      VALUES (${body.address}, ${body.label ?? null}, ${body.contextRuleId})
      ON CONFLICT (address) DO UPDATE SET
        label = EXCLUDED.label,
        context_rule_id = EXCLUDED.context_rule_id,
        updated_at = now()
      RETURNING address, label, context_rule_id, enabled, created_at, updated_at
    `;

    const row = result[0]!;

    await sql.end({ timeout: 3 });

    return NextResponse.json(
      {
        address: row.address as string,
        label: (row.label as string | null) ?? null,
        contextRuleId: row.context_rule_id as number,
        enabled: row.enabled as boolean,
        createdAt: (row.created_at as Date).toISOString(),
        updatedAt: (row.updated_at as Date).toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
