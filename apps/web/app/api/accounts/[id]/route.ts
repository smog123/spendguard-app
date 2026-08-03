/**
 * API route for individual account details, updates, and archiving/deletion.
 *
 * GET    /api/accounts/[id] — fetch details for account
 * PATCH  /api/accounts/[id] — update account
 * DELETE /api/accounts/[id] — archive or delete account
 */

import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountRole } from "@spendguard/sdk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const account = await AccountService.getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const [members, settings] = await Promise.all([
      AccountService.getMembers(account.id),
      AccountService.getSettings(account.id),
    ]);

    return NextResponse.json({ ...account, members, settings });
  } catch (err) {
    console.error("GET /api/accounts/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const actorRole = (body.actorRole as AccountRole) || "Admin";
    const actorEmail = (body.actorEmail as string) || "admin@spendguard.io";

    const updated = await AccountService.updateAccount(
      id,
      {
        name: body.name,
        description: body.description,
        type: body.type,
        status: body.status,
        contextRuleId: body.contextRuleId ? Number(body.contextRuleId) : undefined,
      },
      actorRole,
      actorEmail
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/accounts/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update account" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") === "delete" ? "delete" : "archive";
    const actorRole = (searchParams.get("actorRole") as AccountRole) || "Owner";
    const actorEmail = searchParams.get("actorEmail") || "owner@spendguard.io";

    await AccountService.archiveOrDeleteAccount(id, action, actorRole, actorEmail);
    return NextResponse.json({ success: true, action });
  } catch (err) {
    console.error("DELETE /api/accounts/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to archive/delete account" },
      { status: 400 }
    );
  }
}
