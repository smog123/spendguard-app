/**
 * API route for treasury accounts management.
 *
 * GET  /api/accounts — list all treasury accounts (supports status, type, search filters)
 * POST /api/accounts — create a new treasury account
 */

import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountType, AccountStatus } from "@spendguard/sdk";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as AccountStatus) || undefined;
    const type = (searchParams.get("type") as AccountType) || undefined;
    const search = searchParams.get("search") || undefined;

    const accounts = await AccountService.listAccounts({ status, type, search });
    return NextResponse.json(accounts);
  } catch (err) {
    console.error("GET /api/accounts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.name || !body.address || !body.ownerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: name, address, ownerEmail" },
        { status: 400 }
      );
    }

    const initialCap = body.initialCap ? BigInt(body.initialCap) : undefined;

    const account = await AccountService.createAccount({
      name: body.name,
      description: body.description,
      address: body.address,
      type: body.type || "Business",
      contextRuleId: body.contextRuleId ? Number(body.contextRuleId) : 1,
      ownerEmail: body.ownerEmail,
      ownerName: body.ownerName || "Account Owner",
      initialCap,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account" },
      { status: 400 }
    );
  }
}
