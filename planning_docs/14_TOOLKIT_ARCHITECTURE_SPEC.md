## Toolkit Architecture & Extension Guide

### 1. Purpose
- Serve as a technical reference for the multi-tool “1584 Toolkit”.
- Document routing, auth, data flow, and Firestore conventions.
- Provide a step-by-step recipe for adding additional tools safely.

### 2. High-Level Overview
- The toolkit lives under the `/tools` namespace and requires authentication.
- Each estimator/tool sits beneath `/tools/<toolId>/…` and is wrapped by `RequireAuth` to enforce entitlements.
- Auth (Google sign-in today) is centralized in `client/src/context/AuthContext.tsx` and exposes:
  - `firebaseUser` (raw Firebase user)
  - `profile` (Firestored user document with `role` + `entitlements.tools`)
  - `hasToolAccess(toolId)` helper
  - `signInWithGoogle()` / `signOutUser()`
- `ToolsLandingPage` reads Firestore `config/tools` and displays the tools current user can open.

### 3. Routing Structure (`client/src/App.tsx`)
```
/
 ├─ /sign-in                       → open auth screen (unauthenticated only)
 ├─ /tools                        → RequireAuth (any signed-in user)
 │   ├─ index                     → Toolkit landing (cards from config)
 │   └─ /budget-estimator         → RequireAuth requiredToolId="budget-estimator"
 │        ├─ index                → Existing estimator landing page
 │        ├─ /property            → Property input step
 │        ├─ /rooms               → Room configuration step
 │        ├─ /results             → Submission step
 │        ├─ /estimate/edit/:id   → Estimate editor (admin-only via entitlements)
 │        └─ /estimate/view/:id   → Read-only view
 ├─ /admin → RequireAuth requireAdmin → Admin dashboard
 ├─ legacy redirects (/property, /rooms, /results, /estimate/*)
 └─ * → `/tools`
```
- `RequireAuth` renders `<Outlet/>` if conditions are met. Otherwise it redirects to `/sign-in` (with `location.state.from`) or `/tools`.

### 4. Toolkit Landing (`client/src/pages/ToolsLandingPage.tsx`)
- Pulls `config/tools` document:
  ```json
  {
    "tools": [
      {
        "id": "budget-estimator",
        "name": "Budget Estimator",
        "description": "Estimates budgets for vacation rental projects.",
        "routeBase": "/tools/budget-estimator",
        "enabled": true,
        "rolesAllowed": ["owner", "admin", "customer"]
      }
    ]
  }
  ```
- Filters out tools if:
  - `enabled` is false,
  - `hasToolAccess(tool.id)` returns false (entitlements),
  - `profile.role` not in `rolesAllowed`.
- Displays one card per accessible tool with “Open tool →” link to `routeBase`.

### 5. Authentication & Entitlements
- Implementation: `client/src/context/AuthContext.tsx` + wrap in `client/src/main.tsx`.
- Sign-in flow: Google OAuth via Firebase SDK (`signInWithPopup`).
- On first login `ensureUserDocument()` seeds Firestore `users/{uid}` with:
  - `email`, `displayName`, `role: 'customer'`, `entitlements: { tools: ['budget-estimator'] }` (default baseline access), timestamps.
- Subsequent logins merge metadata to preserve manual updates (role/entitlements).
- Exposed helpers allow UI to adjust navigation (Header shows “Toolkit”, etc.).
- To add a new auth provider, extend AuthContext; toolkit pages consume only the exported API.

### 6. Estimate Persistence & Tool Metadata
- Submissions (`ResultsPage`) save Firestore `estimates` docs with:
  - Domain data (`clientInfo`, `propertySpecs`, `rooms`, etc.).
  - Toolkit metadata: `toolId: 'budget-estimator'`, `ownerUid: auth.currentUser?.uid ?? null`.
- `syncToHighLevel` constructs the new view link `.../tools/budget-estimator/estimate/view/{id}`.
- Admin/data hooks (`useEstimateEditing`, `AdminPage`) filter `where('toolId','==','budget-estimator')` to avoid cross-tool pollution.

### 7. Local State Namespacing
- Zustand store `client/src/store/estimatorStore.ts` uses `persist` with key `estimator-storage-budget-estimator`.
- When creating a new tool, pick a unique key `estimator-storage-<toolId>` so localStorage values don’t collide.

### 8. Firestore Security (`firebase/firestore.rules`)
- Common helpers:
  ```
  function signedIn() { return request.auth != null; }
  function isOwner() { return signedIn() && resource.data.ownerUid == request.auth.uid; }
  function isAdmin() { return signedIn() && (request.auth.token.role in ['owner','admin']); }
  ```
- `users/{uid}`: self-read/write, admins override.
- `estimates/{id}`: create allowed for any signed-in user; read/update/delete allowed to doc owner (`ownerUid`) or admins.
- `config/*` & `resources/*`: read for signed-in, write restricted to admins.
- When adding new tools, ensure new collections follow equivalent ownership + role checks.

### 9. Adding a New Tool (Checklist)
1. **Decide tool metadata**: `toolId`, name, description, route base.
2. **Firestore config**
   - Append tool entry to `config/tools.tools[]` with `enabled` and `rolesAllowed`.
   - Update user entitlements (e.g., grant new tool to specific roles) either via script or manually.
3. **Routing**
   - In `App.tsx`, add route branch under `/tools/<toolId>`.
   - Wrap with `RequireAuth requiredToolId="<toolId>"` (if tool-specific access is required).
   - Provide landing/index + any nested pages (consider using `client/src/tools/<toolId>/...` for organization).
4. **State management**
   - Create dedicated Zustand store or reuse generic patterns; ensure `persist.name` is unique (`estimator-storage-<toolId>`).
5. **Data persistence**
   - When writing Firestore docs, stamp `toolId` (and `ownerUid` when available).
   - Update fetchers / hooks to filter by `toolId` where appropriate (e.g., admin lists, exports).
6. **UI & navigation**
   - Add CTA(s) pointing to `/tools/<toolId>`.
   - Ensure `ToolsLandingPage` card copy matches experience.
7. **Security rules**
   - If new collections are introduced, extend `firebase/firestore.rules` with analogous rules.
   - Deploy updated rules via `firebase deploy --only firestore:rules`.
8. **Testing**
   - Signed-out user redirected to `/sign-in` when visiting `/tools/...`.
   - Signed-in user without entitlement gets bounced back to `/tools`.
   - Admin/tool owner can view, edit, and list relevant docs.
   - Legacy routes (if needed) redirect to the new namespace.

### 10. Developer Workflow Notes
- **Seeding config**: Use Firestore console or small script to ensure `config/tools` exists before deploying.
- **Entitlements management**: For quick testing, update `users/{uid}.entitlements.tools` array manually.
- **Backfill strategy**: when creating a new tool, run one-time script to set `toolId` on existing docs as needed.
- **Code organization**: future tools can live under `client/src/tools/<toolId>` to reduce clutter in `pages/`.
- **Automation opportunities**: create a helper generator that scaffolds routes, store, and config for new tools.

### 11. Quick Reference
- Auth provider: `client/src/context/AuthContext.tsx`
- Route guard: `client/src/components/RequireAuth.tsx`
- Toolkit landing: `client/src/pages/ToolsLandingPage.tsx`
- Budget estimator flow pages: `client/src/pages/*` (Landing, PropertyInput, RoomConfiguration, Results, ViewEstimate, EstimateEdit)
- HighLevel sync: `client/src/utils/highLevelSync.ts`
- Persisted store: `client/src/store/estimatorStore.ts`
- Firestore rules: `firebase/firestore.rules`

Keep this document updated when new tools or auth flows are introduced.


