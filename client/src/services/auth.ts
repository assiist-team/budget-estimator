import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';

export type UserRole = 'owner' | 'admin' | 'customer' | 'viewer';

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

const DEFAULT_TOOL_ACCESS = ['budget-estimator'];

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
    const role: UserRole = (data.role as UserRole) ?? 'customer';
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

  const usersSnapshot = await getDocs(collection(db, 'users'));
  const role: UserRole = usersSnapshot.empty ? 'owner' : 'customer';
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


