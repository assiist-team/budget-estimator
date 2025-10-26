<!-- f88b86bf-cc30-4b42-b7a6-4fdaaeaa1cb5 204a044f-e1ee-48bd-b259-0cada7a5c0be -->
# ROI Estimator: Two-Step UX Refactor

### Goals

- Split ROI estimator into two steps: Input → Results.
- Keep a live preview summary on the Input step.
- Add a collapsible Methodology section on both pages.
- Add and highlight Total Year One Gain, while retaining Annual Cash Flow Gain and Enterprise Value Gain.
- Persist inputs between visits (Zustand + localStorage), similar to the budget estimator.

### Current touchpoints to modify

- Routes branch for ROI:
```32:35:client/src/App.tsx
            <Route path="roi-estimator" element={<RequireAuth requiredToolId="roi-estimator" />}>
              <Route index element={<RoiEstimatorPage />} />
              <Route path="projection/view/:projectionId" element={<RoiProjectionViewPage />} />
```

- Existing single-page ROI component:
```9:10:client/src/tools/roi-estimator/RoiEstimatorPage.tsx
export default function RoiEstimatorPage() {
```

- ROI utils have a stubbed function and can host the new metric:
```62:83:client/src/utils/roi.ts
export function computeEnterpriseValue(sde: number, multiple: number): number {

}

export function computeProjection(inputs: RoiInputs): RoiComputedFlat {
  const otherFixed = sumOtherFixedExcludingMortgage(inputs.fixed);

  const gBefore = gross(inputs.adrBefore, inputs.occupancyBefore);
  const gAfter = gross(inputs.adrAfter, inputs.occupancyAfter);

  const pmBefore = propertyManagementFee(gBefore, inputs.propertyManagementPct);
  const pmAfter = propertyManagementFee(gAfter, inputs.propertyManagementPct);
```


### What we will build

- New store `client/src/store/roiEstimatorStore.ts`:
  - Holds `inputs`, `currentStep` (0=Input, 1=Results); persists via key `estimator-storage-roi-estimator`.
- New pages under `client/src/tools/roi-estimator/`:
  - `RoiEstimatorInputPage.tsx`: form inputs + live preview summary card; CTA “Generate Results” → navigate(`/tools/roi-estimator/results`).
  - `RoiEstimatorResultsPage.tsx`: full summary with all metrics and Save Projection; reads from store; deep link enabled.
- Shared component: `components/Methodology.tsx` (collapsible): equations and plain-English explanation.
- Update routes in `client/src/App.tsx` to index → Input, add `results` route, keep projection view route.
- Update `RoiProjectionViewPage.tsx` to include Methodology and Total Year One Gain.

### Metrics & formulas (displayed on both pages)

- Gross: G = ADR × Occ × 365
- PM fee: PM = G × propertyManagementPct
- Other fixed (excluding mortgage): sum of fixed costs excluding mortgage
- Net cash flow: Net = G − PM − mortgage − OtherFixed
- SDE: SDE = G − OtherFixed (adds back PM and mortgage)
- Enterprise Value: EV = SDE × sdeMultiple
- Gains: annualCashFlowGain = NetAfter − NetBefore; enterpriseValueGain = EVAfter − EVBefore
- Total Year One Gain: totalYearOneGain = annualCashFlowGain + enterpriseValueGain

### Essential code edits

- Implement `computeEnterpriseValue` and extend projection with `totalYearOneGain`:
```typescript
export function computeEnterpriseValue(sde: number, multiple: number): number {
  return sde * multiple;
}

// In computeProjection return value
totalYearOneGain: (netAfter - netBefore) + (evAfter - evBefore)
```


### Visual/UX alignment

- Use `Header` and the same spacing/typography tokens as budget pages.
- Add a simple two-step indicator (Input / Results) in the ROI pages header area akin to `ProgressBar` styling.
- Results page emphasizes Total Year One Gain as the primary KPI, with Annual Cash Flow Gain and Enterprise Value Gain as secondary but still visible.

### Files to add/edit

- Add: `client/src/store/roiEstimatorStore.ts`
- Add: `client/src/tools/roi-estimator/RoiEstimatorInputPage.tsx`
- Add: `client/src/tools/roi-estimator/RoiEstimatorResultsPage.tsx`
- Add: `client/src/tools/roi-estimator/components/Methodology.tsx`
- Edit: `client/src/utils/roi.ts` (implement `computeEnterpriseValue`, add `totalYearOneGain`, update types as needed)
- Edit: `client/src/tools/roi-estimator/RoiProjectionViewPage.tsx` (add Methodology, show new metric)
- Edit: `client/src/App.tsx` (route updates: index → Input, add `results`)
- Optionally: keep `RoiEstimatorPage.tsx` as a thin wrapper that renders `RoiEstimatorInputPage` or migrate/rename and update imports.

### Routing changes

- `client/src/App.tsx` (ROI branch):
  - Index → `<RoiEstimatorInputPage />`
  - Add: `<Route path="results" element={<RoiEstimatorResultsPage />} />`
  - Keep: projection view route unchanged

### Acceptance criteria

- `/tools/roi-estimator` shows Input with live preview summary and a collapsible Methodology section.
- Clicking “Generate Results” navigates to `/tools/roi-estimator/results`, which shows a full summary and Save Projection.
- Both pages display (and the Results page highlights) Total Year One Gain, alongside Annual Cash Flow Gain and Enterprise Value Gain.
- Inputs persist across reloads and sessions for the signed-in user’s browser.
- Existing projection view remains functional and now includes Methodology and Total Year One Gain.
- Budget and ROI pages feel visually aligned (headers, spacing, card styles) without heavy refactors.

### To-dos

- [ ] Create Zustand store to persist ROI inputs and current step
- [ ] Finish roi.ts: enterprise value and totalYearOneGain types+calc
- [ ] Create RoiEstimatorInputPage with form, preview, methodology
- [ ] Create RoiEstimatorResultsPage with metrics, save, methodology
- [ ] Update App.tsx to add results route and set index to input
- [ ] Add methodology and totalYearOneGain to projection view