/**
 * Policy state reader.
 *
 * Reads spending-limit state from the deployed `policy-view-helper`
 * contract via `simulateTransaction` (read-only — no submission).
 * The contract exposes:
 *   - get_spending_limit_state(account, context_rule_id) -> SpendingLimitView
 *   - get_version() -> u32
 *
 * All calls are read-only simulations; no transactions are signed or
 * submitted to the network.
 */

import { nativeToScVal, scValToNative, rpc } from "@stellar/stellar-sdk";

import { SorobanClient } from "./soroban-client.js";
import { decodeSpendingLimitView } from "./xdr-helpers.js";
import type { SpendingLimitState, SpendingLimitView } from "./types.js";

// ── Errors ────────────────────────────────────────────────────────────

export class PolicyReaderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PolicyReaderError";
  }
}

// ── Reader ────────────────────────────────────────────────────────────

export class PolicyReader {
  private readonly client: SorobanClient;
  private readonly contractId: string;
  /** A known testnet source for read-only simulations. */
  private readonly simulationSource: string;

  constructor(
    client: SorobanClient,
    contractId: string,
    simulationSource: string,
  ) {
    this.client = client;
    this.contractId = contractId;
    this.simulationSource = simulationSource;
  }

  // ── get_spending_limit_state ─────────────────────────────────────────

  /**
   * Fetch the current spending limit state for an account + context rule.
   *
   * @param account       - Smart account address (G…).
   * @param contextRuleId - Context rule ID (u32).
   * @returns The decoded SpendingLimitView from the contract.
   *
   * @throws PolicyReaderError on RPC failure, contract error, or unexpected
   *         response shape.
   */
  async getSpendingLimitState(
    account: string,
    contextRuleId: number,
  ): Promise<SpendingLimitState> {
    const accountArg = nativeToScVal(account, { type: "address" });
    const ruleIdArg = nativeToScVal(contextRuleId, { type: "u32" });

    let response: rpc.Api.SimulateTransactionResponse;
    try {
      response = await this.client.simulateContract(
        this.simulationSource,
        this.contractId,
        "get_spending_limit_state",
        [accountArg, ruleIdArg],
      );
    } catch (err) {
      throw new PolicyReaderError(
        "RPC simulation failed for get_spending_limit_state",
        "RPC_FAILURE",
        err,
      );
    }

    if (rpc.Api.isSimulationError(response)) {
      throw new PolicyReaderError(
        `Contract returned error: ${response.error}`,
        "CONTRACT_ERROR",
        response.error,
      );
    }

    if (!rpc.Api.isSimulationSuccess(response)) {
      throw new PolicyReaderError(
        "Simulation returned restoration required response",
        "RESTORE_REQUIRED",
      );
    }

    const result = response.result;
    if (!result) {
      throw new PolicyReaderError(
        "Simulation returned no result",
        "NO_RESULT",
      );
    }

    const retVal = result.retval;
    if (!retVal) {
      throw new PolicyReaderError(
        "Simulation result has no retval",
        "NO_RETVAL",
      );
    }

    let view: SpendingLimitView;
    try {
      view = decodeSpendingLimitView(retVal);
    } catch (err) {
      throw new PolicyReaderError(
        "Failed to decode SpendingLimitView from ScVal",
        "DECODE_ERROR",
        err,
      );
    }

    const utilizationPct =
      view.cap > 0n
        ? Number((view.spentInWindow * 100n) / view.cap)
        : 0;

    return {
      account,
      contextRuleId,
      cap: view.cap,
      windowSeconds: view.windowSeconds,
      spentInWindow: view.spentInWindow,
      windowStartedAt: view.windowStartedAt,
      utilizationPct,
    };
  }

  // ── get_version ─────────────────────────────────────────────────────

  /**
   * Read the contract version.
   *
   * @returns Version number (u32).
   */
  async getVersion(): Promise<number> {
    let response: rpc.Api.SimulateTransactionResponse;
    try {
      response = await this.client.simulateContract(
        this.simulationSource,
        this.contractId,
        "get_version",
        [],
      );
    } catch (err) {
      throw new PolicyReaderError(
        "RPC simulation failed for get_version",
        "RPC_FAILURE",
        err,
      );
    }

    if (rpc.Api.isSimulationError(response)) {
      throw new PolicyReaderError(
        `Contract returned error: ${response.error}`,
        "CONTRACT_ERROR",
        response.error,
      );
    }

    if (!rpc.Api.isSimulationSuccess(response)) {
      throw new PolicyReaderError(
        "Simulation returned restoration required response",
        "RESTORE_REQUIRED",
      );
    }

    const retVal = response.result?.retval;
    if (!retVal) {
      throw new PolicyReaderError(
        "Simulation result has no retval",
        "NO_RETVAL",
      );
    }

    try {
      return Number(scValToNative(retVal));
    } catch (err) {
      throw new PolicyReaderError(
        "Failed to decode version from ScVal",
        "DECODE_ERROR",
        err,
      );
    }
  }
}
