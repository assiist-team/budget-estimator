import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

interface AuthModalContextValue {
  requireAccount: (opts?: { reason?: string }) => Promise<void>;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [resolver, setResolver] = useState<(() => void) | null>(null);
  const { firebaseUser } = useAuth();
  const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true';

  const requireAccount = useCallback(async (opts?: { reason?: string }) => {
    if (AUTH_DISABLED || firebaseUser) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      setReason(opts?.reason);
      setResolver(() => resolve);
      setOpen(true);
    });
  }, [AUTH_DISABLED, firebaseUser]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleAuthed = useCallback(() => {
    setOpen(false);
    if (resolver) {
      resolver();
      setResolver(null);
    }
  }, [resolver]);

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


