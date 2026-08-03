import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getRolePermissions,
  isValidStellarAddress,
} from "../src/permissions.js";

describe("role-based permissions", () => {
  it("grants all permissions to Owner", () => {
    const permissions = getRolePermissions("Owner");
    expect(permissions).toContain("account:create");
    expect(permissions).toContain("account:edit");
    expect(permissions).toContain("account:archive");
    expect(permissions).toContain("account:delete");
    expect(permissions).toContain("members:manage");
    expect(permissions).toContain("policies:manage");
    expect(permissions).toContain("budgets:manage");
    expect(permissions).toContain("multisig:create");
    expect(permissions).toContain("multisig:approve");
    expect(permissions).toContain("data:view");
  });

  it("restricts Admin from deleting account or creating account", () => {
    expect(hasPermission("Admin", "account:edit")).toBe(true);
    expect(hasPermission("Admin", "members:manage")).toBe(true);
    expect(hasPermission("Admin", "account:delete")).toBe(false);
    expect(hasPermission("Admin", "account:archive")).toBe(false);
  });

  it("grants budget and policy management to Finance Manager but not member management", () => {
    expect(hasPermission("Finance Manager", "policies:manage")).toBe(true);
    expect(hasPermission("Finance Manager", "budgets:manage")).toBe(true);
    expect(hasPermission("Finance Manager", "multisig:create")).toBe(true);
    expect(hasPermission("Finance Manager", "members:manage")).toBe(false);
    expect(hasPermission("Finance Manager", "account:edit")).toBe(false);
  });

  it("restricts Approver to approving multi-sig proposals and viewing data", () => {
    expect(hasPermission("Approver", "multisig:approve")).toBe(true);
    expect(hasPermission("Approver", "data:view")).toBe(true);
    expect(hasPermission("Approver", "multisig:create")).toBe(false);
    expect(hasPermission("Approver", "budgets:manage")).toBe(false);
  });

  it("restricts Viewer to read-only data access", () => {
    expect(hasPermission("Viewer", "data:view")).toBe(true);
    expect(hasPermission("Viewer", "multisig:approve")).toBe(false);
    expect(hasPermission("Viewer", "policies:manage")).toBe(false);
    expect(hasPermission("Viewer", "members:manage")).toBe(false);
  });
});

describe("Stellar address validation", () => {
  it("validates well-formed Stellar G... public keys", () => {
    const valid = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(isValidStellarAddress(valid)).toBe(true);
  });

  it("rejects invalid length or invalid prefix", () => {
    expect(isValidStellarAddress("G123")).toBe(false);
    expect(isValidStellarAddress("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBe(false);
    expect(isValidStellarAddress("")).toBe(false);
  });
});
