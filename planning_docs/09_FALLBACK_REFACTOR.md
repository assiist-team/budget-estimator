# Fallback Configuration Refactor — Hand-off Plan

This document describes the work needed to split the current bedroom-only fallback into two composable pieces: a bedroom fallback generator and a common-area fallback generator, and to integrate them together so that a combined fallback configuration is produced when rule-based auto-configuration cannot fully resolve both bedrooms and common areas.

Goals
- Make the fallback behavior consistent: when rules do not match, the system should still produce both bedroom and common-area suggestions instead of suppressing common areas entirely.
- Keep existing public function signatures where possible and limit changes to `client/src/utils/autoConfiguration.ts` and tests.
- Add unit tests that demonstrate the new behavior and guard against regressions.

Files to change
- `client/src/utils/autoConfiguration.ts` — primary implementation changes
- `client/src/utils/autoConfiguration.test.ts` — new tests (or update existing test file) to cover fallback logic
- Optionally update any documentation or admin UI notes in `client/src/pages/AdminPage.tsx` if rule semantics are changed.

Work breakdown (for developer)
1. Read and understand the existing code in `computeAutoConfiguration`, `deriveCommonAreas`, and `generateBedroomFallback`.
2. Implement a new function `generateCommonAreaFallback(squareFootage, guestCount, rules): ComputedConfiguration['commonAreas']`.
   - Behavior: Use the same heuristics as `deriveCommonAreas`, but ensure it can return reasonable defaults even when bedroom rules fail.
   - Consider using guestCount only for sizing adjustments (e.g., larger gatherings -> larger dining/living sizes) while still primarily basing presence on sqft thresholds.
3. Modify `computeAutoConfiguration` to handle the following cases:
   - If `getBedroomRule` returns a bedroomRule: keep current behavior (derive common areas with `deriveCommonAreas`).
   - If `getBedroomRule` returns `null`: call both `generateBedroomFallback` and `generateCommonAreaFallback` and return a combined `ComputedConfiguration` with both bedrooms and commonAreas populated.
   - Ensure that `computeAutoConfiguration` never returns `null` for `computedConfiguration` unless an exception occurs.
4. Ensure `deriveCommonAreas` remains available and unchanged if other codepaths rely on its exact semantics.
5. Add unit tests:
   - Case A: Valid bedroomRule -> assert derived common areas are as before.
   - Case B: No bedroomRule -> assert bedroom fallback is used AND common-area fallback returns non-`none` values appropriate for sqft/guest inputs.
   - Edge cases: tiny sqft with many guests, very large sqft with few guests, missing rules object.
6. Run linter and tests, fix any type or lint errors.
7. Update changelog or release notes as appropriate.

Implementation notes and heuristics suggestions for `generateCommonAreaFallback`
- **Strict requirement**: The common-area fallback MUST derive its presence and size exclusively from admin-configured presets found in `rules.commonAreas`. Do NOT hardcode thresholds or use guest-based heuristics for common area preselection.
- Presence rules:
  - Determine presence solely from the area's `presence` settings (for example, `present_if_sqft_gte`) defined in the admin rules.
- Size selection:
  - Determine size by matching `rules.commonAreas.<area>.size.thresholds` against square footage only.
  - Fall back to `size.default` when no thresholds match.

Testing guidance
- Build a small matrix of inputs and expected outputs for both bedroom and common area fallbacks. Use descriptive test names.
- Mock a minimal `rules` object capturing necessary fields: `bedroomMixRules: []`, `commonAreas.*.presence`, `commonAreas.*.size.thresholds`, `bunkCapacities`, `validation`.

Acceptance criteria
- When `getBedroomRule` returns `null` for an input pair, `computeAutoConfiguration` returns a `ComputedConfiguration` containing both `bedrooms` (from `generateBedroomFallback`) and `commonAreas` (from `generateCommonAreaFallback`) with sensible, non-`none` defaults unless sqft/guest inputs warrant 'none'.
- Existing behavior for matched bedroom rules remains unchanged.
- Unit tests pass and cover the new fallback behavior.

Notes for reviewer
- Pay attention to whether admin-editable rules should influence fallback outputs; if so, ensure the new fallback reads those rule thresholds rather than hard-coded constants.
- Keep functions pure and side-effect free to simplify testing.
- Ensure the fallback reads admin-editable `rules.commonAreas` thresholds and presence flags; do NOT introduce hard-coded defaults or guest-count based preselection.

Estimated effort
- Developer familiar with the codebase: 2–4 hours (including tests and lint fixes).
- Review and QA: 1–2 hours.

Contact
- If any edge behaviors are desired (e.g., always include kitchen regardless of sqft), confirm with product before implementing.
