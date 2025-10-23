# Project Budget Expansion Plan

## Overview

Expand the estimator from a furnishings-only output to a full project budget summary while keeping the existing four-tier data shape in place. The additions should be derived at runtime, avoid introducing new stored totals, drop contingency from calculations, and refresh customer-facing copy to speak to complete project budgeting.

---

## Current State Snapshot

### Furnishings Budget Shape in Code
```typescript
type QualityTier = 'low' | 'mid' | 'midHigh' | 'high';

interface TierTotal {
  subtotal: number; // cents
  contingency: number; // cents, currently 10% of subtotal
  total: number; // subtotal + contingency
}

interface Budget {
  roomBreakdown: RoomBreakdown[];
  low: TierTotal;
  mid: TierTotal;
  midHigh: TierTotal;
  high: TierTotal;
  rangeLow: number; // low.total
  rangeHigh: number; // mid.total
}
```
The estimator stores everything in cents and exposes four quality tiers end-to-end (items → room templates → calculations → admin tools). The lowest tier currently uses the key `budget` in code; migrating to `low` will require updating types, Firestore seed data, and the calculation helpers in tandem.

### Calculation Behavior Today
```typescript
const tiers: QualityTier[] = ['low', 'mid', 'midHigh', 'high'];
...
tiers.forEach((tier) => {
  budget[tier].contingency = Math.round(budget[tier].subtotal * 0.1);
  budget[tier].total = budget[tier].subtotal + budget[tier].contingency;
});

budget.rangeLow = budget.low.total;
budget.rangeHigh = budget.mid.total;
```
- A 10% contingency is auto-applied to every tier.
- The UI presents the furnishings-only range (low → mid) under “Furnishings Budget”.
- High Level integration and email placeholders do not reference any totals besides the estimate link.

---

## Goals & Guardrails
- **Rename the lowest tier key from `budget` to `low`** across types, calculations, room templates, Firestore data, and UI while keeping `mid`, `midHigh`, and `high` intact.
- **Keep the existing four tiers** for data, calculations, admin workflows, and historical estimates (with migration plan for the renamed key).
- **Do not introduce new stored totals** inside Firestore documents; project-level numbers are display-only.
- **Zero-out contingency** so totals equal subtotals. We keep the fields for compatibility but stop adding to them.
- **Derive project-level add-ons at runtime** (installation, fuel, storage & receiving, kitchen, property management, design fee).
- **Display range uses low & mid tiers only**, labelled to customers as “Low” and “Mid”. MidHigh and High remain available for internal views.
- **High Level and email integrations remain untouched** beyond using the existing single estimate link field.
- **UI copy must emphasise complete project budgeting** everywhere the experience mentions “furnishings budget”.

---

## Phase 1: Defaults, Tier Rename & Admin Authoring

### Tier Rename Roadmap
1. Update TypeScript definitions (`QualityTier`, `Budget`, `RoomBreakdown`, etc.) to replace `budget` with `low`.
2. Update room template totals (`totals.low`) and item price fields (`lowPrice`), keeping higher-tier keys untouched. Introduce accessors that gracefully read old keys during migration if any legacy data remains.
3. Adjust Firestore data seeding scripts to use `low`.
4. Migrate existing Firestore documents (items, room templates, estimates) by copying `budget` values into `low` and removing the `budget` key.

### Firestore
- `/items`, `/roomTemplates`, `/estimates`: **no new schema fields**, but data migration needed for the key rename.
- Add `config/projectCostDefaults` (or reuse the existing `config` collection if preferable) with cents-based defaults and metadata:
```javascript
{
  installationCents: 500000,
  fuelCents: 200000,
  storageAndReceivingCents: 400000,
  kitchenCents: 500000,
  propertyManagementCents: 400000,
  designFee: {
    ratePerSqftCents: 1000, // $10/sqft
    description: 'Design fee calculated at $10 per square foot'
  },
  updatedAt: timestamp,
  updatedBy: 'admin@1584design.com'
}
```
- Keep amounts in cents to align with the rest of the system.

### Admin Interface
- In the existing Admin page, add a “Project Cost Defaults” card (no new route):
  - Inputs for each fixed amount plus the design fee rate.
  - Persist values to `config/projectCostDefaults`.
  - Show last updated metadata.
- Reuse existing state/store patterns (Zustand) for loading/saving config data.

---

## Phase 2: Calculation Updates

### Update `calculateEstimate`
- Keep signature but add an optional fourth argument: `options?: { propertySpecs?: PropertySpecs; projectDefaults?: ProjectCostDefaults }`.
- When `options` is provided:
  1. **Remove contingency** by immediately setting it to `0` and letting `total = subtotal`.
  2. Build a `projectAddOns` object in cents:
     ```typescript
     const projectAddOns = {
       installation: defaults.installationCents,
       fuel: defaults.fuelCents,
       storageAndReceiving: defaults.storageAndReceivingCents,
       kitchen: defaults.kitchenCents,
       propertyManagement: defaults.propertyManagementCents,
       designFee: Math.round(propertySpecs.squareFootage * defaults.designFee.ratePerSqftCents)
     } as const;
     const addOnTotal = Object.values(projectAddOns).reduce((sum, cents) => sum + cents, 0);
     ```
  3. Extend the return value with two new fields (non-persistent):
     ```typescript
     const projectRange = {
       low: budget.low.total + addOnTotal,
       mid: budget.mid.total + addOnTotal,
       midHigh: budget.midHigh.total + addOnTotal,
       high: budget.high.total + addOnTotal
     };

     return {
       ...budget,
       contingencyDisabled: true,
       projectAddOns,
       projectRange // used for UI only
     };
     ```
- When `options` is omitted (older call sites), fall back to returning the original structure (with the renamed `low` key) but with contingency still zeroed out.

### Call Site Updates
- Pass `propertySpecs` and `projectCostDefaults` (loaded once) into `calculateEstimate` in:
  - Results page
  - Room configuration preview
  - Estimate editing view
  - Admin estimate list cards
- Handle the new `projectAddOns` / `projectRange` properties gracefully (feature-gated until defaults are loaded).

### Formatting Helpers
- Extend `formatCurrency`/`formatCurrencyAbbreviated` usage to cover the add-on amounts and new range without adding new helpers.

---

## Phase 3: UI & Copy Updates

### Terminology & Labels
- Replace “Furnishings Budget” with “Project Budget” across the app.
- Update the step label to “Step 3: Project Budget Results”.
- When referencing tiers in copy, show “Low” and “Mid” (mapped from the new `low`/`mid` keys). Keep `midHigh` and `high` for internal views.

### Landing Page Copy
```
Get Your Project Budget Estimate
───────────────────────────────
Professional interior design project estimates in minutes

See the full project picture:
• Interior design fees
• Furnishings and installation
• Kitchen setup and property management
• Every project-related service in one estimate
```
- Update CTA subtitles (“It only takes a few minutes to get your project budget estimate”, etc.).

### Results Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Your Project Budget Estimate                               │
├─────────────────────────────────────────────────────────────┤
│  Gradient Range Card (existing styling)                     │
│    ESTIMATED PROJECT BUDGET RANGE                           │
│    $126,000 — $280,000                                       │
│    Based on 8 rooms • 3,200 sqft property                    │
├─────────────────────────────────────────────────────────────┤
│  Breakdown Card                                             │
│    Furnishings: $85,000 — $200,000              │
│    Design Fee: $32,000 ($10/sqft)                           │
│    Installation: $5,000                                     │
│    Fuel: $2,000                                             │
│    Storage & Receiving: $4,000                              │
│    Kitchen: $5,000                                          │
│    Property Management: $4,000                              │
│    Project Total: $126,000 — $280,000           │
│    [View Detailed Room Breakdown]                           │
│                                                             │
│  Lead Form Card (existing contact form)                     │
└─────────────────────────────────────────────────────────────┘
```
- Display furnishings subtotals for low & mid.
- Show other categories as single values (no tiers).
- Highlight the aggregated low/mid project totals using `projectRange`.

### Admin & Internal Views

- When showing estimates in admin lists, append “Project Range: $X — $Y”.

---

## Phase 4: QA & Testing

### Unit Tests (`utils/calculations.test.ts`)
- Assert contingency is now `0` for every tier.
- Verify `projectAddOns` and `projectRange` are populated when options are supplied.
- Ensure range falls back to original furnishings totals when defaults are absent.
- Cover the `budget`→`low` migration shim (if present) so legacy data continues to work until migration completes.

### Integration Tests (`tests/estimateFlow.test.ts`)
- Confirm results page renders the new breakdown categories.
- Verify admin view surfaces both the furnishings range and the project range.

### Manual QA
- Regression test room configuration (range preview reflects add-ons when property specs exist).
- Smoke test estimate editing to confirm modifications recompute project range correctly.
- Validate admin default edits propagate to new estimates.
- Double-check migrated estimates still render correctly post-tier rename.

---

## Phase 5: Documentation & Launch
- Update README/admin docs with instructions for maintaining `projectCostDefaults` and completing the `budget`→`low` migration.
- Capture before/after screenshots of the landing and results pages for stakeholder review.
- Communicate that CRM/email integrations remain unchanged (no additional fields).

---

## Implementation Checklist
- [ ] Perform data migration for tier rename (`budget` → `low`) across items, room templates, and estimates.
- [ ] Create `config/projectCostDefaults` document with initial values in cents.
- [ ] Add admin UI for editing project cost defaults.
- [ ] Update `calculateEstimate` to zero contingency and emit `projectAddOns`/`projectRange` when defaults are provided.
- [ ] Adjust every call site to use the renamed `low` key, pass `propertySpecs` + defaults, handle optional fields.
- [ ] Refresh UI components/copy (landing, progress step labels, results breakdown) to reflect the rename and project totals.
- [ ] Update tests to reflect new calculations, zero contingency, and the renamed tier.
- [ ] QA plus stakeholder review, then release.
