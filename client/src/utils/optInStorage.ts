export interface OptInDataInput {
  firstName: string;
  email: string;
  phone: string;
}

export interface StoredOptInData extends OptInDataInput {
  normalizedPhone?: string | null;
  savedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

const STORAGE_KEY = 'pe2.optin.v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

// Best-effort E.164 normalization (US-biased fallback without external deps)
export function normalizePhoneE164(phone: string): string | null {
  const raw = digitsOnly(phone);
  if (raw.length === 0) return null;

  // If already includes country code and plausible length
  if (raw.length >= 11 && raw.length <= 15) {
    return `+${raw}`;
  }

  // US fallback: 10 digits => +1
  if (raw.length === 10) {
    return `+1${raw}`;
  }

  // If 11 digits starting with 1, assume US
  if (raw.length === 11 && raw.startsWith('1')) {
    return `+${raw}`;
  }

  // Give up, return null so we keep raw phone only
  return null;
}

export function isValid(data: StoredOptInData | null | undefined): data is StoredOptInData {
  if (!data) return false;
  if (!data.email || !data.phone || !data.firstName) return false;
  if (!data.expiresAt || !data.savedAt) return false;
  return Date.now() < data.expiresAt;
}

export function getOptIn(): StoredOptInData | null {
  const parsed = safeJsonParse<StoredOptInData>(localStorage.getItem(STORAGE_KEY));
  if (!parsed) return null;
  return isValid(parsed) ? parsed : null;
}

export function setOptIn(input: OptInDataInput, ttlMs: number = THIRTY_DAYS_MS): StoredOptInData {
  const now = Date.now();
  const normalizedPhone = normalizePhoneE164(input.phone);
  const payload: StoredOptInData = {
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    normalizedPhone,
    savedAt: now,
    expiresAt: now + Math.max(1, ttlMs),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearOptIn(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasValidOptIn(): boolean {
  return isValid(getOptIn());
}


