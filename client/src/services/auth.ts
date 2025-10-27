import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';

export type UserRole = 'admin' | 'user';

export interface UserEntitlements {
  tools: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  entitlements: UserEntitlements;
}

const DEFAULT_TOOL_ACCESS = ['budget-estimator', 'roi-estimator'];

export function normalizeEntitlements(entitlements?: UserEntitlements | null): UserEntitlements {
  if (!entitlements || !Array.isArray(entitlements.tools)) {
    return { tools: DEFAULT_TOOL_ACCESS };
  }
  const uniqueTools = Array.from(new Set([...entitlements.tools, ...DEFAULT_TOOL_ACCESS]));
  return { tools: uniqueTools };
}

export async function createOrUpdateUserDocument(firebaseUser: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as any;
    const role: UserRole = (data.role as UserRole) ?? 'user';
    const entitlements = normalizeEntitlements(data.entitlements as UserEntitlements | undefined);

    await setDoc(
      userRef,
      {
        email: firebaseUser.email ?? data.email ?? '',
        displayName: firebaseUser.displayName ?? data.displayName ?? '',
        role,
        entitlements,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? data.email ?? '',
      displayName: firebaseUser.displayName ?? data.displayName ?? null,
      role,
      entitlements,
    };
  }

  // To avoid needing list permissions on the users collection, we'll default all new
  // users to 'customer' role. The first user can be promoted to 'owner' manually
  // in the Firebase console.
  const role: UserRole = 'user';
  const entitlements = normalizeEntitlements(undefined);

  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? null,
    role,
    entitlements,
  };

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

export async function updateUserContactInfo(uid: string, data: { phone?: string | null; firstName?: string | null }): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...(data.firstName ? { displayName: data.firstName } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}


