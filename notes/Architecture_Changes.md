# Architecture Changes

## What Changed

The application no longer treats browser state as an authorization boundary.

### Security Flow
1. Authenticate the user with Firebase Auth.
2. Read entitlement data from Firestore as a server-controlled source of truth.
3. Validate the entitlement snapshot with `isValidUserAccountSnapshot()`.
4. Grant premium access only when `hasActiveSubscription()` returns true.

### UI Changes
- The paywall is now read-only from the browser.
- The billing modal no longer performs client-side writes for plan, status, or payment updates.
- Exploit simulation and sandbox controls were removed from the production flow.

### Data Model Changes
- `src/authz.ts` centralizes entitlement validation and active-subscription checks.
- `firestore.rules` now enforces deny-by-default behavior with ownership checks and schema validation.
- User entitlement fields are treated as backend-managed data rather than browser-managed state.

### Files Modified
- `src/App.tsx`
- `src/authz.ts`
- `src/components/SubscriptionPaywall.tsx`
- `src/components/ManageAccountModal.tsx`
- `src/firebase.ts`
- `firestore.rules`
- `src/types.ts`

## Net Effect
The application now follows a trust boundary where the client can render and request, but not decide premium authorization or self-assign entitlement.
