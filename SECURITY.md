# Security Policy

## Scope

SpendGuard is a **monitoring layer** — it reads public on-chain data and computes whether a spend pattern is approaching or has crossed a spending limit. It does **not**:

- Hold private keys or signing credentials
- Sign or submit transactions
- Move or custody funds
- Enforce spending limits (enforcement is handled by the on-chain smart account)

The security posture of this project is therefore limited to:

- **Data integrity**: ensuring that ingested events are correctly decoded and stored.
- **Alert delivery**: ensuring that breach/near-miss notifications reach their configured webhooks.
- **Access control**: ensuring that the dashboard API is appropriately protected in production.

## Reporting a Vulnerability

If you discover a security vulnerability in SpendGuard, please **do not** open a public GitHub issue. Instead, send a private report to the maintainer.

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## What to Include in a Report

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested remediation (if applicable)

## Responsible Disclosure

We ask that you allow us reasonable time to address the issue before disclosing it publicly. We will coordinate disclosure timing with you.

## Non-Critical Reports

For non-security bugs, feature requests, and improvements, please open a standard GitHub issue.
