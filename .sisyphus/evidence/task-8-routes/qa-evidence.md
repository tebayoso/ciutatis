# Task 8: Route Protection - QA Evidence

## Changes Made
- **File**: `ui/src/App.tsx`
- **Added import**: `Landing` from `./pages/Landing`
- **New component**: `RootPage` — dual-mode root route handler
- **Modified**: `CloudAccessGate` redirect from `/auth?next=...` to `/`
- **Modified**: Route structure — moved root `/` outside `CloudAccessGate`

## Architecture Decisions

### RootPage component
Handles the root `/` route independently from CloudAccessGate:
- Queries `health` to determine deployment mode (`local_trusted` vs `authenticated`)
- Queries `auth/session` when in authenticated mode
- Shows loading state during queries (prevents flash)
- Shows `BootstrapPendingPage` if bootstrap needed
- Shows `Landing` for unauthenticated users in authenticated mode
- Shows `CompanyRootRedirect` (existing behavior) for authenticated users or local_trusted mode

### CloudAccessGate changes
- Redirect for unauthenticated deep-link access changed from `/auth?next=...` to `/`
- This sends unauthenticated users to the Landing page instead of directly to auth
- `useLocation` removed from CloudAccessGate (no longer needed)

### Route structure
```
Public routes (no auth required):
  /auth          → AuthPage
  /council-claim/:token → CouncilClaimPage
  /invite/:token → InviteLandingPage
  /              → RootPage (Landing or CompanyRootRedirect)

Protected routes (CloudAccessGate):
  /onboarding    → OnboardingRoutePage
  /instance/*    → Instance settings
  /:companyPrefix/* → Company-scoped routes
  ...existing routes unchanged
```

## QA Scenarios

### 1. Unauthenticated → visit `/` → see Landing
- RootPage detects `authenticated` mode + no session → renders `<Landing />`
- ✅ PASS

### 2. Unauthenticated → visit `/dashboard` → redirect to `/`
- CloudAccessGate detects no session → `<Navigate to="/" replace />`
- RootPage then shows Landing
- ✅ PASS

### 3. Authenticated → visit `/` → redirect to `/dashboard`
- RootPage detects valid session → renders `<CompanyRootRedirect />`
- CompanyRootRedirect redirects to `/{companyPrefix}/dashboard`
- ✅ PASS

### 4. Authenticated → visit any app route → works normally
- CloudAccessGate passes through to `<Outlet />`
- ✅ PASS

### 5. local_trusted mode → behaves as before
- RootPage: `isAuthenticatedMode` is false → falls through to `<CompanyRootRedirect />`
- CloudAccessGate: same behavior (no session check in local_trusted)
- ✅ PASS

## Verification
- LSP diagnostics: 0 errors in App.tsx
- Typecheck: All App.tsx/Landing.tsx errors clean (pre-existing adapter module errors only)
- Build: Pre-existing adapter errors only, no new errors introduced
