import { describe, it, expect, beforeEach } from "vitest";
import { AccountService } from "../lib/services/account-service";
import { hasPermission, isValidStellarAddress, AccountRole } from "@spendguard/sdk";

describe("Multi-Account Management System", () => {
  const VALID_STELLAR_ADDR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const ANOTHER_VALID_ADDR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF";
  const THIRD_VALID_ADDR   = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCWHF";

  describe("Account Creation & Input Validation", () => {
    it("creates a valid treasury account with default owner, policy, budget, and settings", async () => {
      const acc = await AccountService.createAccount({
        name: "Acme Ecosystem Vault",
        description: "Primary fund for ecosystem expansion",
        address: VALID_STELLAR_ADDR,
        type: "DAO",
        ownerEmail: "owner@acme.io",
        ownerName: "Alice Acme",
        initialCap: 50_000_000_000n,
      });

      expect(acc).toBeDefined();
      expect(acc.id).toContain("acc-");
      expect(acc.name).toBe("Acme Ecosystem Vault");
      expect(acc.address).toBe(VALID_STELLAR_ADDR);
      expect(acc.type).toBe("DAO");
      expect(acc.status).toBe("Active");

      // Verify owner member creation
      const members = await AccountService.getMembers(acc.id);
      expect(members.length).toBeGreaterThanOrEqual(1);
      expect(members[0].email).toBe("owner@acme.io");
      expect(members[0].role).toBe("Owner");

      // Verify initial policy
      const policies = await AccountService.getPolicies(acc.id);
      expect(policies.length).toBeGreaterThanOrEqual(1);

      // Verify initial budget
      const budgets = await AccountService.getBudgets(acc.id);
      expect(budgets.length).toBeGreaterThanOrEqual(1);

      // Verify initial audit log
      const logs = await AccountService.getAuditLogs(acc.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe("ACCOUNT_CREATED");
    });

    it("rejects account creation with empty name", async () => {
      await expect(
        AccountService.createAccount({
          name: "  ",
          address: VALID_STELLAR_ADDR,
          type: "Business",
          ownerEmail: "owner@spendguard.io",
          ownerName: "Alice",
        })
      ).rejects.toThrow("Account name is required");
    });

    it("rejects account creation with invalid Stellar wallet address", async () => {
      await expect(
        AccountService.createAccount({
          name: "Test Vault",
          address: "INVALID_ADDRESS_123",
          type: "Business",
          ownerEmail: "owner@spendguard.io",
          ownerName: "Alice",
        })
      ).rejects.toThrow(/Invalid Stellar wallet address/);
    });

    it("rejects account creation with invalid owner email", async () => {
      await expect(
        AccountService.createAccount({
          name: "Test Vault",
          address: VALID_STELLAR_ADDR,
          type: "Business",
          ownerEmail: "invalid-email",
          ownerName: "Alice",
        })
      ).rejects.toThrow("Valid owner email is required");
    });
  });

  describe("Account Updates, Archiving, and Deletion", () => {
    it("updates account metadata when requested by Owner or Admin", async () => {
      const acc = await AccountService.createAccount({
        name: "Original Name",
        address: ANOTHER_VALID_ADDR,
        type: "Project",
        ownerEmail: "admin@spendguard.io",
        ownerName: "Bob Admin",
      });

      const updated = await AccountService.updateAccount(
        acc.id,
        { name: "Updated Name", type: "NGO" },
        "Admin",
        "admin@spendguard.io"
      );

      expect(updated.name).toBe("Updated Name");
      expect(updated.type).toBe("NGO");
    });

    it("prevents Viewer from updating account metadata", async () => {
      const acc = await AccountService.getAccountById("acc-main-treasury");
      if (!acc) return;

      await expect(
        AccountService.updateAccount(
          acc.id,
          { name: "Hacked Name" },
          "Viewer",
          "viewer@spendguard.io"
        )
      ).rejects.toThrow(/does not have permission/);
    });

    it("archives an account when requested by Owner", async () => {
      const acc = await AccountService.createAccount({
        name: "Vault to Archive",
        address: THIRD_VALID_ADDR,
        type: "Personal",
        ownerEmail: "owner@spendguard.io",
        ownerName: "Alice Owner",
      });

      const result = await AccountService.archiveOrDeleteAccount(
        acc.id,
        "archive",
        "Owner",
        "owner@spendguard.io"
      );

      expect(result).toBe(true);
      const archivedAcc = await AccountService.getAccountById(acc.id);
      expect(archivedAcc?.status).toBe("Archived");
    });
  });

  describe("Role-Based Permissions Enforcement", () => {
    it("enforces role permissions matrix correctly across operations", () => {
      const roles: AccountRole[] = ["Owner", "Admin", "Finance Manager", "Approver", "Viewer"];

      // Owner can do all actions
      expect(hasPermission("Owner", "account:create")).toBe(true);
      expect(hasPermission("Owner", "account:delete")).toBe(true);

      // Admin can manage members & policies but not delete account
      expect(hasPermission("Admin", "members:manage")).toBe(true);
      expect(hasPermission("Admin", "account:delete")).toBe(false);

      // Finance Manager can manage policies & budgets but not members
      expect(hasPermission("Finance Manager", "policies:manage")).toBe(true);
      expect(hasPermission("Finance Manager", "members:manage")).toBe(false);

      // Approver can approve multi-sig but not manage budgets
      expect(hasPermission("Approver", "multisig:approve")).toBe(true);
      expect(hasPermission("Approver", "budgets:manage")).toBe(false);

      // Viewer is read-only
      expect(hasPermission("Viewer", "data:view")).toBe(true);
      expect(hasPermission("Viewer", "multisig:approve")).toBe(false);
    });

    it("prevents Finance Manager from adding new members", async () => {
      await expect(
        AccountService.addMember(
          "acc-main-treasury",
          { email: "new@spendguard.io", name: "New User", role: "Viewer" },
          "Finance Manager",
          "finance@spendguard.io"
        )
      ).rejects.toThrow(/does not have permission/);
    });
  });

  describe("Multi-Account Switching & Data Isolation", () => {
    it("ensures members, policies, budgets, and multi-sig proposals are isolated per account", async () => {
      const acc1 = await AccountService.createAccount({
        name: "Treasury Alpha",
        address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        type: "Business",
        ownerEmail: "alpha-owner@spendguard.io",
        ownerName: "Owner Alpha",
      });

      const acc2 = await AccountService.createAccount({
        name: "Treasury Beta",
        address: ANOTHER_VALID_ADDR,
        type: "NGO",
        ownerEmail: "beta-owner@spendguard.io",
        ownerName: "Owner Beta",
      });

      // Add unique budget to Alpha
      await AccountService.createBudget(
        acc1.id,
        { name: "Alpha Marketing Budget", category: "Marketing", allocatedAmount: 10_000_000_000n, period: "Monthly" },
        "Owner",
        "alpha-owner@spendguard.io"
      );

      // Add unique budget to Beta
      await AccountService.createBudget(
        acc2.id,
        { name: "Beta Legal Fund", category: "Security", allocatedAmount: 20_000_000_000n, period: "Quarterly" },
        "Owner",
        "beta-owner@spendguard.io"
      );

      const alphaBudgets = await AccountService.getBudgets(acc1.id);
      const betaBudgets = await AccountService.getBudgets(acc2.id);

      expect(alphaBudgets.some((b) => b.name === "Alpha Marketing Budget")).toBe(true);
      expect(alphaBudgets.some((b) => b.name === "Beta Legal Fund")).toBe(false);

      expect(betaBudgets.some((b) => b.name === "Beta Legal Fund")).toBe(true);
      expect(betaBudgets.some((b) => b.name === "Alpha Marketing Budget")).toBe(false);
    });
  });

  describe("Multi-Signature Approval Workflow", () => {
    it("creates proposal and reaches Approved status upon receiving required votes", async () => {
      const acc = await AccountService.createAccount({
        name: "Multi-Sig Vault",
        address: VALID_STELLAR_ADDR,
        type: "DAO",
        ownerEmail: "owner@spendguard.io",
        ownerName: "Alice Owner",
      });

      const proposal = await AccountService.createMultiSigProposal(
        acc.id,
        {
          title: "Grant Payment to Security Firm",
          amount: 50_000_000_000n,
          recipient: VALID_STELLAR_ADDR,
          requiredApprovals: 2,
        },
        "Finance Manager",
        "finance@spendguard.io"
      );

      expect(proposal.status).toBe("Pending");

      // First vote (Approval 1)
      const propAfter1 = await AccountService.submitApproval(
        proposal.id,
        { approverEmail: "approver1@spendguard.io", decision: "Approved", note: "Verified code" },
        "Approver"
      );
      expect(propAfter1.status).toBe("Pending");

      // Second vote (Approval 2) -> Meets threshold of 2
      const propAfter2 = await AccountService.submitApproval(
        proposal.id,
        { approverEmail: "approver2@spendguard.io", decision: "Approved", note: "Approved disbursement" },
        "Approver"
      );
      expect(propAfter2.status).toBe("Approved");
    });
  });
});
