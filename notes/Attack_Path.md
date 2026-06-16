# Attack Path Analysis

## Objective

Assess whether premium-access controls can be bypassed and determine the root cause.

---

## Step 1

User authenticated using Google OAuth.

Result:

Valid authenticated session established.

---

## Step 2

Application displayed subscription paywall.

Condition:

if (!userAccount || !userAccount.subscribed)

Result:

Access denied until subscription status becomes true.

---

## Step 3

Developer tools console used to modify client-side state.

Command:

window.auditState.setUserAccount({
uid: "test-demo-id",
email: "[audit-student@example.com](mailto:audit-student@example.com)",
subscribed: true,
plan: "Premium",
status: "active"
});

Result:

Application transitioned from paywall screen to profile-selection interface.

---

## Root Cause

The application exposed a global state-management interface through:

(window as any).auditState

and trusted:

userAccount.subscribed

for premium-access decisions.

---

## Impact

Client-side manipulation of authorization-relevant state allowed bypass of intended subscription workflow.

---

## Next Investigation

Determine whether backend resources and Firestore data remain protected after paywall bypass.
