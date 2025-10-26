import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

interface AuthModalContextValue {
  requireAccount: (opts?: { reason?: string }) => Promise<void>;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export class AuthModalCancelledError extends Error {
  constructor() {
    super('Auth modal was dismissed before authentication.');
    this.name = 'AuthModalCancelledError';
  }
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const pendingRef = useRef<{ resolve: () => void; reject: (reason?: unknown) => void } | null>(null);
  const { firebaseUser } = useAuth();
  const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true';

  const requireAccount = useCallback(async (opts?: { reason?: string }) => {
    if (AUTH_DISABLED || firebaseUser) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      setReason(opts?.reason);
      pendingRef.current = { resolve, reject };
      setOpen(true);
    });
  }, [AUTH_DISABLED, firebaseUser]);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (pendingRef.current) {
      pendingRef.current.reject(new AuthModalCancelledError());
      pendingRef.current = null;
    }
  }, []);

  const handleAuthed = useCallback(() => {
    setOpen(false);
    if (pendingRef.current) {
      pendingRef.current.resolve();
      pendingRef.current = null;
    }
  }, []);

  const value = useMemo<AuthModalContextValue>(() => ({ requireAccount }), [requireAccount]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal open={open} onClose={handleClose} onAuthed={handleAuthed} reason={reason} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}


