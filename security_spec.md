# Security Specification: Netflix Clone ABAC Hardening

This document outlines the Zero-Trust security invariants, protection boundaries, and verification payloads for the Netflix Clone application.

## 1. Safety Invariants

- **PII Isolation & Private Access**: User account documents (`/users/{userId}`) containing billing information and email addresses are only readable and writable by the authenticated user whose `uid` matches the `{userId}` path. No blanket reads of user directories are permitted.
- **Billing Integrity Isolation**: Users cannot modify their own subscription status, tier, billing cycle, or next payment date directly without passing through a validated transaction or standard payment payload schema. They cannot self-assign an activated subscription without providing realistic payment metadata.
- **Viewer Profile Authority**: A user can only manage (create, read, update, delete) viewer profiles under their own `/users/{userId}/profiles/{profileId}` path. They cannot view or touch other users' movie profiles.
- **Verification Gate**: Standard writes require that the user's Google Auth account has a verified email address (`request.auth.token.email_verified == true`).
- **Data Range & Size Constraints**: Document IDs, user profile names, and watchlist lists must be restricted in size to prevent resource exhaustion and Denial-of-Wallet (DoW) attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads break safety laws and MUST return `PERMISSION_DENIED` under all circumstances:

### Attack Vector 1: Identity Impersonation (Cross-User Read)
*   **Payload**: User `attacker_uid` attempts to call `get()` on `/users/victim_uid`.
*   **Invariant Broken**: PII Isolation. Only the owner can read their account details.

### Attack Vector 2: Direct Subscription Injection (Privilege Escalation)
*   **Payload**: `attacker_uid` attempts to update their own sub from `subscribed: false` to `subscribed: true` without supplying proper payment card records.
*   **Invariant Broken**: Access Control Integrity.

### Attack Vector 3: Profile Intrusion (Cross-User Write)
*   **Payload**: `attacker_uid` attempts to create doc `/users/victim_uid/profiles/profile_1` with name "Attacker Profile".
*   **Invariant Broken**: Path-Identity alignment.

### Attack Vector 4: Sandbox Escape
*   **Payload**: A write is sent with a modified `uid` field (e.g., `uid: "victim_uid"`) inside `/users/attacker_uid`.
*   **Invariant Broken**: Uid immutability.

### Attack Vector 5: Denial-of-Wallet (DoW) Name Spamming
*   **Payload**: Profile creation containing `name: "A...[10MB generated string]..."` to inflate database storage quotas.
*   **Invariant Broken**: String size boundary limits.

### Attack Vector 6: Temporal Corruption
*   **Payload**: User attempts to set `createdAt` in the future (`2030-01-01`) or change an existing `createdAt` during an update.
*   **Invariant Broken**: Temporal immutability of creation stamps.

### Attack Vector 7: Type Confusion Attack
*   **Payload**: User attempts to update profile `isKids` flag with value `"true"` (string representation) instead of true (boolean).
*   **Invariant Broken**: Strict Type Safety.

### Attack Vector 8: Watchlist Corruption
*   **Payload**: Injecting an item of type `number` or `map` into the `watchlist` array, or exceeding standard list size constraints (e.g., array size > 100).
*   **Invariant Broken**: Strict array boundaries & element type enforcement.

### Attack Vector 9: Status State Shortcut
*   **Payload**: Attempt to set account `status` to an arbitrary string like `'super-premium'` instead of the whitelisted enum: `'active'`, `'canceled'`, or `'paused'`.
*   **Invariant Broken**: Schema enum constraint.

### Attack Vector 10: Anonymous Writing
*   **Payload**: An unauthenticated user attempts to initialize a user account doc.
*   **Invariant Broken**: Session validation.

### Attack Vector 11: Email Spoofing Attack
*   **Payload**: An authenticated user with `email_verified == false` attempts to write billing parameters.
*   **Invariant Broken**: Identity Verification Gate.

### Attack Vector 12: Orphaned Sub-Resource Injection
*   **Payload**: Attacker attempts to create a profile under a non-existent root user account to create "orphaned sub-collections."
*   **Invariant Broken**: Master Gate parent relationship check.
