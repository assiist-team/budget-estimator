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
  firstName: string;
  lastName: string;
}

export default function AuthModal({ open, onClose, onAuthed, reason }: Props) {
  const { firebaseUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const optIn = useMemo(() => getOptIn(), [open]);

  const { register, handleSubmit, setValue } = useForm<EmailPasswordForm>({
    defaultValues: { email: optIn?.email ?? '', password: '', firstName: optIn?.firstName ?? '', lastName: optIn?.lastName ?? '' },
  });

  useEffect(() => {
    if (optIn?.email) setValue('email', optIn.email);
    if (optIn?.firstName) setValue('firstName', optIn.firstName);
    if (optIn?.lastName) setValue('lastName', optIn.lastName);
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
        if (auth.currentUser) {
          await updateUserContactInfo(auth.currentUser.uid, {
            phone: oi?.normalizedPhone ?? oi?.phone ?? null,
            firstName: data.firstName ?? oi?.firstName ?? null,
            lastName: data.lastName ?? oi?.lastName ?? null,
          });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center items-center flex-col pt-8 px-8 pb-4 border-b border-gray-200">
          <img src="/logo.png" alt="1584 Design Projects Logo" className="h-32 w-56 object-contain" />
          <h2 className="text-2xl font-semibold text-gray-900 mt-4">Vacation Rental Toolkit</h2>
          <p className="text-sm text-gray-600 mt-1">{reason ?? 'Sign in or create an account to continue'}</p>

          <div className="flex mt-4 border border-gray-200 rounded-md">
            <button
              onClick={() => setMode('signup')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                mode === 'signup' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('login')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                mode === 'login' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Pre-filled info display */}
          {optIn && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div>
                    <span className="text-gray-500">Email:</span> {optIn.email}
                  </div>
                  {optIn.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span> {optIn.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button onClick={signInGoogle} disabled={loading} className="btn-primary w-full">
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" className="input-field w-full" {...register('firstName', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" className="input-field w-full" {...register('lastName', { required: true })} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field w-full" {...register('email', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input-field w-full" {...register('password', { required: true, minLength: 6 })} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button type="submit" disabled={loading} className="btn-secondary w-full">
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="text-xs text-gray-600 text-center">
            {mode === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button className="underline" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button className="underline" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


