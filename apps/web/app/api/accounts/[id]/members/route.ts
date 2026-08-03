import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountRole } from "@spendguard/sdk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const members = await AccountService.getMembers(id);
    return NextResponse.json(members);
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
    const actorRole = (body.actorRole as AccountRole) || "Admin";
    const actorEmail = (body.actorEmail as string) || "admin@spendguard.io";

    if (!body.email || !body.name || !body.role) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role" },
        { status: 400 }
      );
    }

    const member = await AccountService.addMember(
      id,
      { email: body.email, name: body.name, role: body.role as AccountRole },
      actorRole,
      actorEmail
    );

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add member" },
      { status: 400 }
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

    if (!body.memberId || !body.newRole) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, newRole" },
        { status: 400 }
      );
    }

    const updated = await AccountService.updateMemberRole(
      id,
      body.memberId,
      body.newRole as AccountRole,
      actorRole,
      actorEmail
    );

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update member role" },
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
    const memberId = searchParams.get("memberId");
    const actorRole = (searchParams.get("actorRole") as AccountRole) || "Admin";
    const actorEmail = searchParams.get("actorEmail") || "admin@spendguard.io";

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId parameter" }, { status: 400 });
    }

    await AccountService.removeMember(id, memberId, actorRole, actorEmail);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove member" },
      { status: 400 }
    );
  }
}
