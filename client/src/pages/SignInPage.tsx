import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      const redirectPath = (location.state as { from?: Location })?.from?.pathname ?? '/tools';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Failed to sign in', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showAdminLink={false} />
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4 text-center">Sign In</h1>
          <p className="text-gray-600 mb-6 text-center">
            Sign in to access your 1584 Toolkit.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>
        </div>
      </main>
    </div>
  );
}

