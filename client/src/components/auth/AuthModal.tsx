import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getOptIn } from '../../utils/optInStorage';
import { updateUserContactInfo } from '../../services/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
  reason?: string;
}

interface EmailPasswordForm {
  email: string;
  password: string;
}

export default function AuthModal({ open, onClose, onAuthed, reason }: Props) {
  const { firebaseUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const optIn = useMemo(() => getOptIn(), [open]);

  const { register, handleSubmit, setValue } = useForm<EmailPasswordForm>({
    defaultValues: { email: optIn?.email ?? '', password: '' },
  });

  useEffect(() => {
    if (optIn?.email) setValue('email', optIn.email);
  }, [optIn, setValue]);

  useEffect(() => {
    if (open && firebaseUser) {
      onAuthed();
    }
  }, [open, firebaseUser, onAuthed]);

  if (!open) return null;

  const signInGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      try {
        const oi = getOptIn();
        if (auth.currentUser && oi) {
          await updateUserContactInfo(auth.currentUser.uid, { phone: oi.normalizedPhone ?? oi.phone ?? null, firstName: oi.firstName });
        }
      } catch {}
      onAuthed();
    } catch (e: any) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EmailPasswordForm) => {
    try {
      setLoading(true);
      setError(null);
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      try {
        const oi = getOptIn();
        if (auth.currentUser && oi) {
          await updateUserContactInfo(auth.currentUser.uid, { phone: oi.normalizedPhone ?? oi.phone ?? null, firstName: oi.firstName });
        }
      } catch {}
      onAuthed();
    } catch (e: any) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Save your results and come back anytime</h2>
          <p className="text-sm text-gray-600 mt-1">{reason ?? 'Create your free account to store your reports and access them later.'}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Pre-filled info display */}
          {optIn && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div><span className="text-gray-500">Email:</span> {optIn.email}</div>
                  {optIn.phone && <div><span className="text-gray-500">Phone:</span> {optIn.phone}</div>}
                </div>
              </div>
            </div>
          )}

          <button onClick={signInGoogle} disabled={loading} className="btn-primary w-full">Continue with Google</button>

          <div className="text-center text-xs text-gray-400">or</div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field w-full" {...register('email', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input-field w-full" {...register('password', { required: true, minLength: 6 })} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button type="submit" disabled={loading} className="btn-secondary w-full">{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>

          <div className="text-xs text-gray-600 text-center">
            {mode === 'signup' ? (
              <button className="underline" onClick={() => setMode('login')}>Already have an account? Sign in</button>
            ) : (
              <button className="underline" onClick={() => setMode('signup')}>Create a new account</button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
        </div>
      </div>
    </div>
  );
}


