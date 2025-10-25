## Dev Plan: Toolkit with Multiple Estimators

### Objective
- Convert the current app into a “Toolkit” that can host multiple estimators.
- Nest the existing Budget Estimator under `/tools/budget-estimator/*` without rewriting business logic.
- Keep a single Firebase project (Auth + Firestore). Keep one `estimates` collection. Add a `toolId` discriminator.
- Gate access by Auth + entitlements; tighten Firestore rules.

## 1) Routing: add toolkit namespace and landing
- Add a landing page at `/tools` that lists available tools (driven by `config/tools`).
- Nest the current Budget Estimator routes under `/tools/budget-estimator/*`.
- Add optional legacy redirects so old links keep working.

```tsx
// App.tsx (illustrative)
<Route path="/tools">
  <Route index element={<ToolsLandingPage />} />
  <Route path="budget-estimator">
    <Route index element={<LandingPage />} />
    <Route path="property" element={<PropertyInputPage />} />
    <Route path="rooms" element={<RoomConfigurationPage />} />
    <Route path="results" element={<ResultsPage />} />
    <Route path="estimate/edit/:estimateId" element={<EstimateEditPage />} />
    <Route path="estimate/view/:estimateId" element={<ViewEstimatePage />} />
  </Route>
</Route>

// Optional legacy redirects
<Route path="/property" element={<Navigate to="/tools/budget-estimator/property" replace />} />
<Route path="/rooms" element={<Navigate to="/tools/budget-estimator/rooms" replace />} />
<Route path="/results" element={<Navigate to="/tools/budget-estimator/results" replace />} />
<Route path="/estimate/view/:estimateId" element={<Navigate to="/tools/budget-estimator/estimate/view/:estimateId" replace />} />
<Route path="/estimate/edit/:estimateId" element={<Navigate to="/tools/budget-estimator/estimate/edit/:estimateId" replace />} />
```

## 2) Update internal links to use the new base
- Prefix estimator navigation and links to `/tools/budget-estimator/...`.
- Examples:
  - `navigate('/property')` → `navigate('/tools/budget-estimator/property')`
  - `navigate('/rooms')` → `navigate('/tools/budget-estimator/rooms')`
  - `navigate('/results')` → `navigate('/tools/budget-estimator/results')`
  - `Link to={\`/estimate/edit/${estimateId}\`}` → `Link to={\`/tools/budget-estimator/estimate/edit/${estimateId}\`}`

## 3) Tag estimates with toolId (and ownerUid when Auth exists)
- Keep `estimates` as a single collection; add a discriminator field.
- Update the Firestore `addDoc` payload in `ResultsPage.tsx` to include:

```ts
const estimateData = {
  // existing fields...
  toolId: 'budget-estimator',
  ownerUid: auth.currentUser?.uid ?? null, // after Auth integration
};
```

## 4) Update HighLevel CRM deep-link to new route
- Ensure the estimate URL matches the new view route.

```ts
// client/src/utils/highLevelSync.ts
const estimateUrl = `${window.location.origin}/tools/budget-estimator/estimate/view/${estimateId}`;
```

## 5) Namespacing local state persistence
- Avoid cross-tool collisions in localStorage.
- Change the persist key in `client/src/store/estimatorStore.ts`:

```ts
persist(
  (set) => ({ /* ... */ }),
  {
    name: 'estimator-storage-budget-estimator',
    partialize: (state) => ({
      propertySpecs: state.propertySpecs,
      selectedRooms: state.selectedRooms,
      currentStep: state.currentStep,
      isConfigurationInitialized: state.isConfigurationInitialized,
    }),
  }
)
```

## 6) Add Firebase Auth (minimal)
- Initialize Auth in `client/src/lib/firebase.ts` (e.g., `getAuth(app)`).
- Implement Sign In/Out UI (Email Link or Google is fine).
- On first sign-in, create/update `users/{uid}` with: `email`, `displayName`, `role`, `entitlements: { tools: ['budget-estimator'] }`.
- Wrap `/tools/*` in a `RequireAuth` component that redirects unauthenticated users to sign-in.

## 7) Tighten Firestore security rules
- Replace allow-all rules with role/ownership checks.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner() { return resource.data.ownerUid == request.auth.uid; }
    function isAdmin() { return request.auth.token.role in ['owner','admin']; }

    match /users/{uid} {
      allow read, write: if signedIn() && uid == request.auth.uid || isAdmin();
    }

    match /estimates/{id} {
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
      allow read, update, delete: if signedIn() && (isOwner() || isAdmin());
    }

    match /config/{doc} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    match /resources/{id} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
  }
}
```

## 8) Tools registry and landing page
- Firestore: create `config/tools` document with an array of tool descriptors, e.g.:

```json
{
  "tools": [
    {
      "id": "budget-estimator",
      "name": "Budget Estimator",
      "description": "Estimate budget for vacation rental projects.",
      "routeBase": "/tools/budget-estimator",
      "enabled": true,
      "rolesAllowed": ["owner", "admin", "customer"]
    }
  ]
}
```

- `ToolsLandingPage` (reads config + user entitlements) renders cards with an “Open” button linking to `routeBase`.

## 9) Backfill existing estimates
- One-time: set `toolId: 'budget-estimator'` (and `ownerUid` if known) for existing docs in `estimates`.
- Options:
  - Firestore Console: Query and batch update missing `toolId`.
  - Admin SDK script: iterate `estimates`, update where `toolId` is missing.

## 10) Optional admin enhancements
- In `AdminPage.tsx` list view, add a `toolId` column.
- Add filter: `where('toolId','==','budget-estimator')` if needed.

## 11) Indexes
- Ensure/add Firestore indexes:
  - `estimates`: single-field `status` (asc)
  - `estimates`: single-field `createdAt` (desc)
  - Optional composite: `toolId` (asc), `createdAt` (desc)

## 12) QA checklist
- Auth: `/tools` requires sign-in; sign-out works.
- `/tools/budget-estimator/*` pages load and navigate correctly.
- Legacy routes redirect correctly.
- New submissions include `toolId` (and `ownerUid` when Auth is present).
- View page loads at `/tools/budget-estimator/estimate/view/:id` from link.
- HighLevel CRM link uses the new URL and opens the correct page.
- Firestore rules block unauthorized access.
- Local storage keys are namespaced per tool.

## 13) Scaffold a new tool (when needed)
- Add `client/src/tools/<newToolId>/*` folder with pages/state.
- Add route branch: `/tools/<newToolId>/*`.
- Add entry to `config/tools` and user entitlements.
- Use namespaced persist key: `estimator-storage-<newToolId>`.
- Save estimates with `toolId: '<newToolId>'`.


