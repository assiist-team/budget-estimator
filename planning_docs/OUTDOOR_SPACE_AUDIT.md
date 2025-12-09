## Outdoor Space Audit Recommendations

### Overview
- Goal: ensure the newly added `outdoor_space` room behaves like other rooms across admin auto-configuration, estimator suggestions, and reporting.
- Status: template exists in Firestore, but auto-configuration schema/logic and admin tooling do not yet account for it, so Outdoor Space is never recommended automatically.

### Schema & Data Model Updates
- Extend `CommonAreaRules` and `ComputedConfiguration` to include an `outdoorSpace` entry (`client/src/types/config.ts`).
- Update the Firestore `config/roomMappingRules` document structure to store `outdoorSpace` presence and size thresholds.
- Adjust any helper types/constants (e.g., `ComputedConfiguration['commonAreas']`) and migrations/seeding scripts to include the new field.

### Admin UI Changes
- Add a new card to the **Common Areas** tab in `AdminPage.tsx` mirroring the kitchen/living/dining/rec room editors so admins can manage outdoor thresholds.
- If per-bedroom overrides are needed, expand `BedroomRuleForm` to allow Outdoor Space entries (likely via `rule.overrides.commonAreas.outdoorSpace` once the schema exists).
- Ensure `saveAutoConfigRules` serializes/deserializes the outdoor rules so the Firestore doc stays consistent.

### Auto-Configuration Logic
- Update `deriveCommonAreas` and `generateCommonAreaFallback` in `client/src/utils/autoConfiguration.ts` to compute `outdoorSpace` using the new rules.
- Include Outdoor Space in `computeAutoConfiguration` return values and in any downstream consumers (e.g., capacity warnings if relevant).
- Refresh the Vitest suite (`client/src/utils/autoConfiguration.test.ts`) with expectations for outdoor scenarios (presence/absence, threshold transitions).

### Room Suggestions & Estimator Flow
- Modify `suggestRoomConfiguration` (`client/src/utils/calculations.ts`) to push an `outdoor_space` entry when the computed configuration says it should be present.
- Confirm `RoomConfigurationPage` already lists the template (it reads all `common_spaces`), but verify toggle/size controls support the new room.
- Re-run `useAutoConfiguration`/`useEstimatorStore` flows to ensure Outdoor Space can be auto-inserted and edited without manual intervention.

### Reporting & Budgets
- No code change needed: `ResultsPage`, `ViewEstimatePage`, `EstimatesReportsTab`, and `calculateEstimate` already handle arbitrary room types. Just verify once Outdoor Space appears in `selectedRooms`, it shows up in every breakdown.
- Consider adding QA tests (manual or automated) that create an estimate where Outdoor Space is auto-selected to confirm the display pipeline works.

### Data & Deployment Steps
- After code changes, update the published `roomMappingRules` document via the Admin UI (or a migration) to seed reasonable Outdoor Space thresholds and presence logic.
- Communicate the new configuration to operators so they know to populate items/pricing for the outdoor template.

### Testing Checklist
- [ ] Admin: create/update auto-config rules including Outdoor Space; ensure they persist and reload.
- [ ] Estimator: enter sqft/guest ranges that should trigger Outdoor Space and verify it appears automatically on the configuration step.
- [ ] Budget results & saved reports: confirm Outdoor Space shows in room breakdowns once selected.
- [ ] Regression: run `pnpm test autoConfiguration` (or full Vitest suite) to cover the new logic.

Document owner: GPT audit (Dec 3 2025). Update this file if requirements change.

