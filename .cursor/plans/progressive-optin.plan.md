<!-- 2ff3bde5-0aa7-4f40-8928-3f6fefbd8df8 b67c5c61-67ef-48fc-a3f5-dd9402bc70f1 -->
# Progressive Opt‑In + In‑App Account Creation

## Decisions confirmed

- All tools accessible after opt‑in (no Firebase auth needed).
- Account creation only for saving/exporting and Reports; Google + Email/Password; no phone verification.
- Opt‑in sync to HighLevel; store firstName/email/phone in localStorage with 30‑day TTL.
- Reusable in‑app Auth modal opens on save/export, Reports access, and end‑of‑flow prompts.

## Implementation outline

### 1) Opt‑in storage and utilities

- Create `client/src/utils/optInStorage.ts` with helpers: `getOptIn()`, `setOptIn(data, ttlMs=30d)`, `clearOptIn()`, `isValid()` using timestamp and TTL.
- Normalize phone to E.164 when possible; store as entered if normalization fails.

### 2) Opt‑in UI gate

- Add `client/src/pages/OptInPage.tsx` (email, phone, first name; simple validation). On submit:
  - Save to local storage via `optInStorage`.
  - Call `syncLeadToHighLevel({ firstName, email, phone })` (see §8).
  - Redirect to originally requested `/tools/...` route.
- Add `client/src/components/RequireOptIn.tsx`: if `optIn` missing/expired, render `<OptInPage />`, else `<Outlet />`. Bypass when `VITE_AUTH_DISABLED==='true'`.

### 3) Routing changes

- Wrap `/tools` with `RequireOptIn` instead of `RequireAuth`. Keep `/admin` behind `RequireAuth requireAdmin`.
- Remove tool‑specific `<RequireAuth requiredToolId>` wrappers so opted‑in users can access both tools.

Current routes (to be changed):

```23:41:client/src/App.tsx
<Route path="/tools" element={<RequireAuth />}>
  <Route index element={<ToolsLandingPage />} />
  <Route path="reports" element={<ReportsPage />} />
  <Route path="budget-estimator" element={<RequireAuth requiredToolId="budget-estimator" />}>
    <Route index element={<LandingPage />} />
    ...
  </Route>
  <Route path="roi-estimator" element={<RequireAuth requiredToolId="roi-estimator" />}>
    ...
  </Route>
</Route>
```

- Replace with `<RequireOptIn />` at `/tools` and remove the nested `RequireAuth requiredToolId` wrappers. Keep `/admin` as is.

### 4) Tools landing visibility

- Update `client/src/pages/ToolsLandingPage.tsx`:
  - For unauthenticated (no `profile`), show all enabled tools (ignore role/entitlement filtering).
  - For authenticated, preserve current role/entitlement filtering.

### 5) Reusable Auth Modal + Provider

- Add `client/src/components/auth/AuthModal.tsx` and `client/src/components/auth/AuthModalProvider.tsx` with `useAuthModal()` hook:
  - Pre‑fill email/phone from `optInStorage` (read‑only by default).
  - Actions: "Continue with Google", and Email/Password form with create/login toggle.
  - After auth, call `updateUserContactInfo({ phone, firstName })` to merge into `users/{uid}`.
  - Expose `requireAccount(reason?: string): Promise<void>` to gate actions.

### 6) End‑of‑flow prompts and action gating

- `client/src/pages/ResultsPage.tsx` and `client/src/tools/roi-estimator/RoiEstimatorResultsPage.tsx`:
  - Add a CTA banner/button: "Save your results and come back anytime" → `requireAccount()`.
  - Wrap save/export/email actions: if not authenticated, `await requireAccount()` then proceed.
  - After successful auth, persist the current result to Firestore with `ownerUid`.

### 7) Reports access

- Make `client/src/components/Header.tsx` always show a Reports link.
- In `client/src/pages/reports/ReportsPage.tsx`, if unauthenticated, open `AuthModal` on mount and block list until auth; once authed, show content.

### 8) HighLevel lead sync

- Extend or add `client/src/utils/highLevelLeads.ts` with `syncLeadToHighLevel({ firstName, email, phone })` using existing env `VITE_HIGHLEVEL_TOKEN` and `VITE_HIGHLEVEL_LOCATION_ID`.
- De‑dupe by email first; update or create contact. No blocking UI if API fails.

### 9) Auth/Profiles

- Update `client/src/services/auth.ts`:
  - Add `updateUserContactInfo(uid, { phone?, firstName? })` merging into `users/{uid}`.
  - Optionally extend `UserProfile` type to include `phone?: string`.
- Ensure `AuthContext` continues to call `createOrUpdateUserDocument` on login.

### 10) Firestore rules

- Allow public read of config docs used by tools (e.g., `config/tools`, auto‑config rules).
- Ensure writes to `estimates` and `projections` require `request.auth != null` and set `ownerUid == request.auth.uid`.
- Keep admin checks as is for `/admin`.

### 11) Dev experience

- When `VITE_AUTH_DISABLED==='true'`, bypass `RequireOptIn` and the modal (tools and reports remain accessible for development).

## Files to add/update (high‑level)

- Add: `client/src/utils/optInStorage.ts`, `client/src/pages/OptInPage.tsx`, `client/src/components/RequireOptIn.tsx`.
- Add: `client/src/components/auth/AuthModal.tsx`, `client/src/components/auth/AuthModalProvider.tsx`.
- Update: `client/src/App.tsx`, `client/src/components/Header.tsx`, `client/src/pages/ToolsLandingPage.tsx`.
- Update: `client/src/pages/ResultsPage.tsx`, `client/src/tools/roi-estimator/RoiEstimatorResultsPage.tsx`.
- Update: `client/src/pages/reports/ReportsPage.tsx`.
- Add/Update: `client/src/utils/highLevelLeads.ts` (or extend `highLevelSync.ts`).
- Update: `client/src/services/auth.ts`, `firebase/firestore.rules`.

### To-dos

- [x] Create opt-in storage util with TTL and normalization
- [x] Build OptInPage and RequireOptIn gate
- [x] Replace tools RequireAuth with RequireOptIn; drop per-tool RequireAuth
- [x] Show all enabled tools for unauthenticated users
- [x] Implement AuthModal and provider with Google + Email/Password
- [x] Expose useAuthModal.requireAccount and wire into actions
- [x] Gate save/export in Results and ROI pages via requireAccount
- [x] Open AuthModal on ReportsPage when unauthenticated
- [x] Implement syncLeadToHighLevel and call on opt-in submit
- [x] Add updateUserContactInfo and store phone/firstName
- [x] Adjust Firestore rules for public config read and writes gating
- [x] Bypass opt-in and modal when VITE_AUTH_DISABLED=true