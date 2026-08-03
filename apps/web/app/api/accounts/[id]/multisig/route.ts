import { NextResponse } from "next/server";
import { AccountService } from "@/lib/services/account-service";
import type { AccountRole } from "@spendguard/sdk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const proposals = await AccountService.getMultiSigProposals(id);
    const serialized = proposals.map((p) => ({
      ...p,
      amount: p.amount.toString(),
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

    if (!body.title || !body.amount || !body.recipient) {
      return NextResponse.json(
        { error: "Missing required fields: title, amount, recipient" },
        { status: 400 }
      );
    }

    const proposal = await AccountService.createMultiSigProposal(
      id,
      {
        title: body.title,
        description: body.description,
        amount: BigInt(body.amount),
        recipient: body.recipient,
        requiredApprovals: body.requiredApprovals ? Number(body.requiredApprovals) : 2,
      },
      actorRole,
      actorEmail
    );

    return NextResponse.json(
      {
        ...proposal,
        amount: proposal.amount.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create multi-sig proposal" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as AccountRole) || "Approver";

    if (!body.proposalId || !body.approverEmail || !body.decision) {
      return NextResponse.json(
        { error: "Missing required fields: proposalId, approverEmail, decision" },
        { status: 400 }
      );
    }

    const updatedProposal = await AccountService.submitApproval(
      body.proposalId,
      {
        approverEmail: body.approverEmail,
        decision: body.decision,
        note: body.note,
      },
      actorRole
    );

    return NextResponse.json({
      ...updatedProposal,
      amount: updatedProposal.amount.toString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit approval decision" },
      { status: 400 }
    );
  }
}
