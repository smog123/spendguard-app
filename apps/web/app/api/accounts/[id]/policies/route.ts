import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountRole } from "@spendguard/sdk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const policies = await AccountService.getPolicies(id);
    const serialized = policies.map((p) => ({
      ...p,
      cap: p.cap.toString(),
      windowSeconds: p.windowSeconds.toString(),
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

    if (!body.name || !body.cap) {
      return NextResponse.json(
        { error: "Missing required fields: name, cap" },
        { status: 400 }
      );
    }

    const policy = await AccountService.createPolicy(
      id,
      {
        name: body.name,
        cap: BigInt(body.cap),
        windowSeconds: body.windowSeconds ? BigInt(body.windowSeconds) : 86400n,
        assetId: body.assetId || "USDC",
      },
      actorRole,
      actorEmail
    );

    return NextResponse.json(
      {
        ...policy,
        cap: policy.cap.toString(),
        windowSeconds: policy.windowSeconds.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create policy" },
      { status: 400 }
    );
  }
}
