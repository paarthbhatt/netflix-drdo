# Firestore Security Review

## Review Summary
The Firestore policy was hardened to prevent client-side entitlement tampering and unauthorized writes.

## Key Improvements

### Deny by Default
- A global catch-all rule blocks reads and writes unless a path has an explicit allow rule.

### Ownership Enforcement
- Users can only access their own documents.
- Profile subcollections are restricted to the owning user.

### Schema Validation
- User and profile documents are validated for type, field presence, and size constraints.
- Profile document keys are constrained to approved fields.

### Entitlement Protection
- Direct client writes to subscription state are blocked.
- Fields such as `subscribed`, `plan`, `billingCycle`, `nextPaymentDate`, `cardLast4`, `cardBrand`, and `status` are treated as backend-managed.

## Current Policy Notes
- The browser may read its own account document.
- The browser may not update entitlement fields directly.
- Profile documents remain editable only within the owner’s namespace and approved schema.

## Residual Recommendation
Add automated rule tests for create/update denial of entitlement fields and for ownership boundaries on `/users/{userId}` and `/users/{userId}/profiles/{profileId}`.
