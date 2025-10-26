<!-- 8b79d89d-2b7b-4f76-9244-6097fa16227e 0dad922d-66c1-4ebf-b7dd-2373ea0e3ca6 -->
# Consolidated Reports (Estimates + Projections) with Role-Scoped Visibility and Editing

## Overview

Create a unified Reports section under `/tools/reports` with two tabs: Budget Estimates and ROI Projections. Scoping: non-admins see/edit only their own; admins/owners see/edit everyone’s. Replace the Admin page’s “view submissions” with a link to Reports.

## Routing changes (client/src/App.tsx)

- Add a Reports route under the authenticated `/tools` namespace.
- Add ROI Projection edit route.
```startLine:endLine:client/src/App.tsx
// Add inside <Route path="/tools" element={<RequireAuth />}> ...
<Route path="reports" element={<ReportsPage />} />

// Inside ROI estimator routes
<Route path="roi-estimator">
  {/* existing routes */}
  <Route path="projection/edit/:projectionId" element={<RoiProjectionEditPage />} />
</Route>
```


## New UI

- `client/src/pages/reports/ReportsPage.tsx`: Container with tabs (Estimates | Projections) and counts. Persist selected tab in query param `?tab=estimates|projections`.
- `client/src/pages/reports/EstimatesReportsTab.tsx`: List + search/filter; actions: View, Edit. Admins see all; others only their own.
- `client/src/pages/reports/ProjectionsReportsTab.tsx`: Same pattern for projections.
- `client/src/tools/roi-estimator/RoiProjectionEditPage.tsx`: Load `projections/:id`, edit `inputs`, recompute with `computeProjection(inputs)`, `updateDoc` with `updatedAt: serverTimestamp()`.

## Leverage existing pages

- View Estimate: `client/src/pages/ViewEstimatePage.tsx`
- Edit Estimate: `client/src/pages/EstimateEditPage.tsx`
- View Projection: `client/src/tools/roi-estimator/RoiProjectionViewPage.tsx`

## Auth + Scoping

- Use `useAuth()`:
  - Admin scope: `isAdmin === true` → query all
  - User scope: filter by `ownerUid === firebaseUser.uid`
- Firestore rules already enforce read/update by owner or admin.

## Firestore queries

- Estimates (admins): `query(collection(db, 'estimates'), where('toolId','==','budget-estimator'), orderBy('createdAt','desc'), limit(50))`
- Estimates (non-admins): `query(collection(db,'estimates'), where('ownerUid','==', uid), where('toolId','==','budget-estimator'), orderBy('createdAt','desc'), limit(50))`
- Projections (admins): `query(collection(db, 'projections'), where('toolId','==','roi-estimator'), orderBy('createdAt','desc'), limit(50))`
- Projections (non-admins): `query(collection(db,'projections'), where('ownerUid','==', uid), where('toolId','==','roi-estimator'), orderBy('createdAt','desc'), limit(50))`
- Add client-side text filter (optional) over fetched page for quick search.

## Indexes & Rules

- `firebase/firestore.indexes.json`: Add composite for estimates
```json
{
  "collectionGroup": "estimates",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "toolId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

- `firebase/firestore.rules` (optional but recommended): Align `estimates` create rule with `projections` to ensure owner integrity
```rules
match /estimates/{id} {
  allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
  allow read, update, delete: if signedIn() && (isOwnerOfDoc() || isAdmin());
}
```


## Admin page cleanup

- `client/src/pages/AdminPage.tsx`: remove submissions UI; add a CTA link to `/tools/reports` for viewing all reports.

## Header navigation

- `client/src/components/Header.tsx`: add a "Reports" link (visible to any signed-in user) → `/tools/reports`.

## Acceptance criteria

- `/tools/reports` loads for any signed-in user.
- Estimates tab: users see only their docs; admins see all. View/Edit work.
- Projections tab: same behavior. New ROI edit page saves updates and recomputes.
- Admin submissions UI is removed/replaced by a link to Reports.
- Composite index for `estimates` created; queries succeed without index errors.

## Notes

- We will not add a ToolsLanding card for Reports to avoid entitlements complexity; access via Header link and direct route.
- Pagination: start with 50 per tab, add Load More later if needed.

### To-dos

- [ ] Add /tools/reports route and ROI projection edit route in App.tsx
- [ ] Create ReportsPage with tabs under client/src/pages/reports/
- [ ] Build EstimatesReportsTab with scoped Firestore queries and actions
- [ ] Build ProjectionsReportsTab with scoped Firestore queries and actions
- [ ] Create RoiProjectionEditPage to edit saved projection inputs
- [ ] Add Reports link to Header pointing to /tools/reports
- [ ] Remove submissions from AdminPage and link to Reports
- [ ] Add composite index for estimates (toolId+createdAt) in indexes.json
- [ ] Align estimates create rule to require ownerUid==auth.uid