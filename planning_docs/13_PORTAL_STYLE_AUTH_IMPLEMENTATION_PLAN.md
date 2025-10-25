## Portal-Style Auth Implementation Plan

### Context
- Reference project: `1584_project_portal` (uses Firebase v9+, Firestore user-doc roles, browser-local persistence, and a simple login UI).
- Current app already has `AuthContext`, `RequireAuth`, entitlements gating, and routes under `/tools` with `/admin` for privileged users.

### Objectives
- Mirror the portal’s Firebase auth model with persistent login and a user document in Firestore.
- Keep your entitlements gating (`requiredToolId`) and admin checks.
- Update Firestore rules to read role from the user document (no custom claims required).

---

## Phase 1 — Firebase initialization and persistence

Update `client/src/lib/firebase.ts` to add persistence and light cache hygiene (preserving auth data), plus small helpers.

- Add helpers:
  - `initializeFirebase()` — clears non-auth Firebase cache keys only (preserve auth persistence keys).
  - `initializeAuthPersistence()` — `setPersistence(auth, browserLocalPersistence)` so users stay logged in across restarts.
  - `onAuthStateChange(cb)` — thin wrapper around `onAuthStateChanged`.

Example calls:
```ts
import { setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';

export async function initializeAuthPersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

export function onAuthStateChange(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
```

Environment variables (ensure present in `client/.env.local`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)
- `VITE_AUTH_DISABLED` (optional, `true` for local dev bypass)

---

## Phase 2 — User document lifecycle service

Create a small service (extend `client/src/lib/firebase.ts` or add `client/src/services/auth.ts`) to handle user docs.

- `createOrUpdateUserDocument(firebaseUser)`:
  - If doc exists: merge `{ email, displayName, lastLogin: new Date() }`, keep existing `role` and `entitlements`.
  - If new: set `role` to `'owner'` if this is the first user, else `'customer'` (or `'viewer'` if preferred). Initialize `entitlements`.
  - Return a normalized `UserProfile` used by `AuthContext`.

Sketch:
```ts
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

export async function createOrUpdateUserDocument(firebaseUser: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    const role = (data.role as UserRole) ?? 'customer';
    const entitlements = normalizeEntitlements(data.entitlements);
    await setDoc(userRef, {
      email: firebaseUser.email ?? data.email ?? '',
      displayName: firebaseUser.displayName ?? data.displayName ?? '',
      role,
      entitlements,
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { uid: firebaseUser.uid, email: firebaseUser.email ?? '', displayName: firebaseUser.displayName ?? null, role, entitlements };
  }

  // First-user ownership
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const role: UserRole = usersSnapshot.empty ? 'owner' : 'customer';
  const entitlements = normalizeEntitlements(undefined);
  const profile: UserProfile = { uid: firebaseUser.uid, email: firebaseUser.email ?? '', displayName: firebaseUser.displayName ?? null, role, entitlements };

  await setDoc(userRef, {
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    entitlements: profile.entitlements,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });
  return profile;
}
```

Optionally later: invitations (`invitations` collection) like the portal.

---

## Phase 3 — AuthContext alignment (portal-style behaviors)

File: `client/src/context/AuthContext.tsx`

- On mount:
  - Call `initializeFirebase()` and `initializeAuthPersistence()`.
  - Prime state with `auth.currentUser` if present to reduce double-loading.
  - Subscribe via `onAuthStateChange`.
  - For authenticated users, call `createOrUpdateUserDocument` then load/normalize `profile`.
- Keep existing shape and helpers:
  - `profile` contains `role` and `entitlements` (with `normalizeEntitlements` and default tool access).
  - `isAdmin` evaluates `['owner','admin']`.
  - `hasToolAccess(toolId)` checks `profile.entitlements.tools`.
- Expose `signIn`/`signOut` that wrap Google popup and `signOut(auth)`.

---

## Phase 4 — Protected route UX and Login UI

- Keep `client/src/components/RequireAuth.tsx`:
  - On `loading`, show `RequireAuthLoading`.
  - If unauthenticated: either render a new `components/auth/Login.tsx` or continue redirecting to `/sign-in` that renders the same login component.
- Implement a portal-style login button calling `signIn()` from the context.

---

## Phase 5 — Routing and provider wiring

- Ensure the app is wrapped by `AuthProvider` (typically in `client/src/main.tsx`).
- Keep existing routes:
  - `/tools` gated by `<RequireAuth />`.
  - `/admin` gated by `<RequireAuth requireAdmin />`.
  - Per-tool gating via `<RequireAuth requiredToolId="..." />` remains intact.

---

## Phase 6 — Firestore security rules (doc-based roles)

Replace checks that read `request.auth.token.role` with rules that load the user doc role via `get()`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }

    function userRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() { return signedIn() && (userRole() == 'owner' || userRole() == 'admin'); }
    function isOwnerOfDoc() { return signedIn() && resource.data.ownerUid == request.auth.uid; }

    match /users/{uid} {
      allow read, write: if signedIn() && (uid == request.auth.uid || isAdmin());
    }

    match /estimates/{id} {
      allow create: if signedIn();
      allow read, update, delete: if signedIn() && (isOwnerOfDoc() || isAdmin());
    }

    match /projections/{id} {
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
      allow read, update, delete: if signedIn() && (isOwnerOfDoc() || isAdmin());
    }

    match /config/{docId} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }

    match /resources/{resourceId} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
  }
}
```

Note: Using doc-based roles avoids needing custom claims and matches the portal.

---

## Phase 7 — Optional enhancements (later)

- Admin user management screen (assign roles, invite by email).
- Entitlements management UI (toggle tool access per user).
- Audit logging of sign-in/out events.

---

## Phase 8 — Testing and rollout

Smoke checklist:
- Fresh user sign-in creates `users/{uid}` with role and entitlements.
- Returning user remains logged-in after reload and browser restart.
- `/admin` requires `owner|admin` and is blocked otherwise.
- `/tools/*` requires authentication; sub-tools follow `requiredToolId` gating.
- Firestore rules deny unauthorized writes/reads as expected.

---

## Minimal change list (files to touch)

- `client/src/lib/firebase.ts` — add persistence helpers and (optionally) user-doc helpers.
- `client/src/context/AuthContext.tsx` — initialize persistence, use `createOrUpdateUserDocument`, expose `signIn`/`signOut`.
- `client/src/components/RequireAuth.tsx` — keep logic; optionally render `Login` instead of redirect.
- `client/src/components/auth/Login.tsx` or `client/src/pages/SignInPage.tsx` — portal-style login button.
- `client/src/main.tsx` — ensure `AuthProvider` wraps the app.
- `firebase/firestore.rules` — switch to doc-based role checks.
- `client/.env.local` — ensure Firebase vars; optional `VITE_AUTH_DISABLED`.

---

## Acceptance criteria
- Users stay logged in across reloads and restarts.
- First authenticated user becomes `owner`; subsequent users become `customer` (or `viewer`).
- `RequireAuth` gates routes correctly; admin-only pages are restricted.
- Firestore rules enforce role-based access via user doc.
- No dependency on custom claims for authorization.

---

## Notes
- This plan aligns with the portal’s architecture while preserving your entitlements model. You can introduce invitations/role management later without changing the core auth flow.


