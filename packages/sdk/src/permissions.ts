import type { AccountRole } from "./types.js";

export type Permission =
  | "account:create"
  | "account:edit"
  | "account:archive"
  | "account:delete"
  | "members:manage"
  | "policies:manage"
  | "budgets:manage"
  | "multisig:create"
  | "multisig:approve"
  | "data:view";

const ROLE_PERMISSIONS: Record<AccountRole, Permission[]> = {
  Owner: [
    "account:create",
    "account:edit",
    "account:archive",
    "account:delete",
    "members:manage",
    "policies:manage",
    "budgets:manage",
    "multisig:create",
    "multisig:approve",
    "data:view",
  ],
  Admin: [
    "account:edit",
    "members:manage",
    "policies:manage",
    "budgets:manage",
    "multisig:create",
    "multisig:approve",
    "data:view",
  ],
  "Finance Manager": [
    "policies:manage",
    "budgets:manage",
    "multisig:create",
    "data:view",
  ],
  Approver: ["multisig:approve", "data:view"],
  Viewer: ["data:view"],
};

/**
 * Returns all permissions granted to a specific role.
 */
export function getRolePermissions(role: AccountRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? ["data:view"];
}

/**
 * Checks whether a given role has a specific permission.
 */
export function hasPermission(role: AccountRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Validates Stellar wallet address format (starts with 'G' and is 56 characters long).
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return address.startsWith("G") && address.length === 56 && /^[A-Z2-7]{56}$/.test(address);
}
