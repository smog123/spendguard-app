import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountRole } from "@spendguard/sdk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const budgets = await AccountService.getBudgets(id);
    const serialized = budgets.map((b) => ({
      ...b,
      allocatedAmount: b.allocatedAmount.toString(),
      spentAmount: b.spentAmount.toString(),
    }));
    return NextResponse.json(serialized);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const actorRole = (body.actorRole as AccountRole) || "Finance Manager";
    const actorEmail = (body.actorEmail as string) || "finance@spendguard.io";

    if (!body.name || !body.category || !body.allocatedAmount) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, allocatedAmount" },
        { status: 400 }
      );
    }

    const budget = await AccountService.createBudget(
      id,
      {
        name: body.name,
        category: body.category,
        allocatedAmount: BigInt(body.allocatedAmount),
        period: body.period || "Monthly",
      },
      actorRole,
      actorEmail
    );

    return NextResponse.json(
      {
        ...budget,
        allocatedAmount: budget.allocatedAmount.toString(),
        spentAmount: budget.spentAmount.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create budget" },
      { status: 400 }
    );
  }
}
