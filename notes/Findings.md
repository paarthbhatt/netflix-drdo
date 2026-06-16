# Finding 1 – Client-Side Premium Access Manipulation

## Severity

Medium

## Category

OWASP A01: Broken Access Control

## Description

During assessment of the subscription workflow, premium account attributes were modified through the browser developer console using a globally accessible application state object.

The application transitioned from the subscription/payment screen to the profile-selection interface after modification of account properties such as subscription status and plan type.

## Steps Performed

1. Authenticated using a valid Google account.
2. Reached the subscription/payment screen.
3. Opened Chrome Developer Tools.
4. Executed the following JavaScript command:

window.auditState.setUserAccount({
uid: "test-demo-id",
email: "[audit-student@example.com](mailto:audit-student@example.com)",
subscribed: true,
plan: "Premium",
status: "active"
});

5. Application immediately redirected to the profile-selection screen.

## Impact

A user may be able to manipulate client-side state values to bypass portions of the subscription workflow.

If premium authorization decisions are based solely on frontend state, unauthorized access to premium functionality may become possible.

## Evidence

Screenshot:
Finding-01-Paywall-Bypass-Success.png

## Recommendation

Premium entitlement verification should be enforced on protected backend endpoints.

Frontend values should never be trusted as proof of subscription status.

The backend should independently validate user subscription information before granting access to premium resources.
Premium Access Flow (Current Implementation)

Google Login
↓
Firebase User Retrieved
↓
userAccount Loaded
↓
userAccount.subscribed
↓
Frontend Decides Access
↓
Paywall or Profile Screen

Issue:

The application exposes a global state modification interface:

window.auditState.setUserAccount()

An attacker can modify the subscribed field from the browser console and influence premium-access decisions.

This results in client-side trust of a security-sensitive authorization attribute.
# Finding 2 – Global Exposure of Security-Sensitive State Management

## Severity

High

## Category

OWASP A01: Broken Access Control

## Description

The application exposes an internal React state management function through a globally accessible browser object.

Code Review Evidence:

(window as any).auditState = {
setUserAccount,
userAccount
};

This allows client-side modification of subscription attributes and other account information directly from the browser developer console.

## Impact

An attacker can manipulate application state without interacting with legitimate business logic.

Potential impacts include:

* Subscription workflow bypass
* Unauthorized access to premium functionality
* Manipulation of account attributes
* Circumvention of intended access controls

## Recommendation

Remove all globally exposed state management interfaces from production builds.

Subscription and authorization decisions should be validated through trusted backend services rather than client-controlled state.
# Finding 3 – Client-Side Authorization Enforcement

## Severity

High

## Category

OWASP A01: Broken Access Control

## Description

The application performs premium-access authorization checks directly within frontend rendering logic.

Evidence:

if (!userAccount || !userAccount.subscribed) {
return <SubscriptionPaywall />
}

The subscribed property is stored in client-side React state and determines whether users are redirected to the payment workflow or granted access to profile selection and streaming functionality.

## Impact

Client-side authorization decisions can potentially be manipulated through browser developer tools.

Attackers may influence premium-access behavior without successfully completing intended subscription workflows.

## Root Cause

Authorization logic is implemented within frontend rendering routines rather than being enforced by trusted backend services.

## Recommendation

Move premium entitlement validation to a trusted backend service.

Protected content should only be returned after successful server-side verification of subscription status.
# Security Improvement – Removal of Debug Interfaces

The assessment identified development-oriented interfaces and debugging mechanisms that were exposed within the production deployment.

These interfaces were removed to prevent unauthorized manipulation of application state through browser developer tools.

Security Benefit:

Reduces attack surface and prevents direct modification of authentication and subscription attributes from untrusted client environments.
# Finding 4 – Security Testing Interfaces Present in Production Code

## Severity

Medium

## Category

Security Misconfiguration

## Description

The application contains testing and exploitation simulation functionality within the production codebase.

Examples include:

* simulateStateTampering()
* simulateDatabaseBypass()

These functions demonstrate manipulation of subscription attributes and database write operations.

## Impact

Security testing utilities exposed within production deployments increase attack surface and may assist malicious users in understanding internal authorization mechanisms.

## Evidence

SubscriptionPaywall.tsx

Functions:

simulateStateTampering()
simulateDatabaseBypass()

## Recommendation

Security testing utilities should be removed from production deployments and isolated within dedicated testing environments.
