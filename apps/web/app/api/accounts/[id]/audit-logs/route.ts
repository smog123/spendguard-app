import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const logs = await AccountService.getAuditLogs(id);
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
