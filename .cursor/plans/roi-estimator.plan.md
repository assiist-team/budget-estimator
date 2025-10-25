<!-- 473c5827-eac0-4882-82b4-5253d8e3d662 dfb0739f-f2a1-413f-94ec-58f8cc4ff596 -->
# ROI Estimator Tool – Implementation Plan

### Scope

- Add a new tool `roi-estimator` under `/tools/roi-estimator`.
- Persist results in Firestore collection `projections` (one doc per saved projection).
- Show annual cash flow gain and enterprise value (EV) gain from before/after params.

### Data Model & Math

- Inputs
  - Fixed annual costs: `mortgage`, `propertyTaxes`, `insurance`, `utilities`, `maintenance`, `supplies`
  - `occupancyBefore`, `occupancyAfter` (0–1 or % UI)
  - `adrBefore`, `adrAfter` (average daily rate)
  - `propertyManagementPct` (e.g., 0.15)
  - `sdeMultiple` (default 3)
- Formulas (per year)
  - Gross: \( G = ADR \times Occ \times 365 \)
  - PM fee: \( PM = G \times propertyManagementPct \)
  - OtherFixed: sum of fixed costs excluding PM (mortgage is included as a fixed cost input)
  - Net cash flow: \( Net = G - PM - mortgage - OtherFixed \)
  - SDE (adding back mortgage and PM per assumption): \( SDE = Net + mortgage + PM = G - OtherFixed \)
  - Enterprise Value: \( EV = SDE \times sdeMultiple \)
  - Compute all for Before and After; Gains are `after - before`.
- Firestore doc shape (projections)
```json
{
  "toolId": "roi-estimator",
  "ownerUid": "<uid>",
  "inputs": {
    "fixed": {"mortgage": 30000, "propertyTaxes": 3300, "insurance": 1400, "utilities": 10800, "maintenance": 6000, "supplies": 2000},
    "occupancyBefore": 0.43, "occupancyAfter": 0.70,
    "adrBefore": 300, "adrAfter": 300,
    "propertyManagementPct": 0.15,
    "sdeMultiple": 3
  },
  "computed": {
    "grossBefore": 47145, "grossAfter": 76650,
    "pmBefore": 7071.75, "pmAfter": 11497.5,
    "otherFixed": 23500,
    "sdeBefore": 23645, "sdeAfter": 53150,
    "evBefore": 70935, "evAfter": 159450,
    "netCashFlowBefore": -? , "netCashFlowAfter": -? ,
    "annualCashFlowGain": 29505,
    "enterpriseValueGain": 88515
  },
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```


### Routing

- Add gated route branch under `/tools`:
```20:31:client/src/App.tsx
<Route path="/tools" element={<RequireAuth />}>
  <Route index element={<ToolsLandingPage />} />
  <Route path="budget-estimator" element={<RequireAuth requiredToolId="budget-estimator" />}>...</Route>
  <Route path="roi-estimator" element={<RequireAuth requiredToolId="roi-estimator" />}>
    <Route index element={<RoiEstimatorPage />} />
    <Route path="projection/view/:projectionId" element={<RoiProjectionViewPage />} />
  </Route>
</Route>
```


### UI/UX (client/src/tools/roi-estimator)

- `RoiEstimatorPage.tsx`
  - Form with two columns: Before and After (Occupancy %, ADR). Fixed costs and PM% as shared inputs.
  - Live computed cards: Net Cash Flow (before/after), SDE (before/after), EV (before/after), and Gains.
  - Actions: Save Projection → writes to `projections` with `toolId: 'roi-estimator'` and `ownerUid`.
- `RoiProjectionViewPage.tsx`
  - Read-only view of a saved projection (same cards), back link to index.

### State Management

- Local UI state only, with optional persisted store key `estimator-storage-roi-estimator` (Zustand) for input defaults and last-used values.

### Persistence

- Collection: `projections`
- Include `toolId`, `ownerUid`, `inputs`, `computed`, `createdAt`, `updatedAt`.
- Use `serverTimestamp()` on create/update.

### Auth, Entitlements, Config

- `RequireAuth` already handles gating; pass `requiredToolId="roi-estimator"`.
- Add a `config/tools` entry via seed/update:
```json
{
  "id": "roi-estimator",
  "name": "ROI Estimator",
  "description": "Estimate cash flow and enterprise value impact from design.",
  "routeBase": "/tools/roi-estimator",
  "enabled": true,
  "rolesAllowed": ["owner", "admin", "customer"],
  "sortOrder": 2
}
```


### Firestore Rules & Indexes

- Extend rules analogous to `estimates`:
```rules
match /projections/{id} {
  allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
  allow read, update, delete: if signedIn() && (isOwner() || isAdmin());
}
```

- Indexes: `projections` single-field `createdAt desc`; optional composite on `(toolId asc, createdAt desc)`.

### Files to Add

- `client/src/tools/roi-estimator/RoiEstimatorPage.tsx`
- `client/src/tools/roi-estimator/RoiProjectionViewPage.tsx`
- `client/src/utils/roi.ts` (pure functions + types for calculations)

### Essential Snippet (utils)

```ts
export function computeSde(gross: number, otherFixed: number): number { return gross - otherFixed; }
export function gross(adr: number, occ: number): number { return adr * occ * 365; }
```

### Acceptance Criteria

- `/tools/roi-estimator` loads for entitled users; form updates results live.
- Saving creates a `projections` doc stamped with `toolId: 'roi-estimator'` and `ownerUid`.
- View page loads at `/tools/roi-estimator/projection/view/:id`.
- Landing card appears from `config/tools` and opens the tool.
- Rules prevent access by non-owners and signed-out users.

### Optional (future)

- Add "Design Investment" input and compute ROI % and payback period.
- Export/share projection link; CSV export.

### To-dos

- [x] Add /tools/roi-estimator routes and pages to App.tsx
- [x] Create client/src/utils/roi.ts with formulas and types
- [x] Implement RoiEstimatorPage with live before/after and save
- [x] Write Firestore create/update for projections with toolId and ownerUid
- [x] Implement RoiProjectionViewPage for saved projection
- [x] Add roi-estimator to config/tools and seed-tools.ts
- [x] Extend firestore.rules with projections ownership rules
- [x] Add indexes for projections (createdAt desc, optional composite)