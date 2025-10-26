import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { getOptIn, setOptIn, type OptInDataInput } from '../utils/optInStorage';
import { syncLeadToHighLevel } from '../utils/highLevelLeads';

export default function OptInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/tools';
  const USE_HL_FORM = import.meta.env.VITE_USE_HL_FORM === 'true';
  const HL_FORM_URL = import.meta.env.VITE_HIGHLEVEL_FORM_URL as string | undefined;

  const formUrlWithParams = useMemo(() => {
    if (!HL_FORM_URL) return '';
    try {
      const url = new URL(HL_FORM_URL);
      url.searchParams.set('from', from);
      return url.toString();
    } catch {
      return HL_FORM_URL;
    }
  }, [HL_FORM_URL, from]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<OptInDataInput>({
    defaultValues: {
      firstName: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    const existing = getOptIn();
    if (existing) {
      setValue('firstName', existing.firstName);
      setValue('email', existing.email);
      setValue('phone', existing.phone);
    }
  }, [setValue]);

  // If opt-in is completed in an embedded iframe or another tab, auto-redirect
  useEffect(() => {
    const existing = getOptIn();
    if (existing) {
      navigate(from, { replace: true });
      return;
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pe2.optin.v1') {
        const updated = getOptIn();
        if (updated) {
          navigate(from, { replace: true });
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [from, navigate]);

  const onSubmit = async (data: OptInDataInput) => {
    setOptIn(data);
    // When using HighLevel form, we never sync here; HL already captures the lead
    if (!USE_HL_FORM) {
      try {
        await syncLeadToHighLevel({
          firstName: data.firstName,
          email: data.email,
          phone: data.phone,
        });
      } catch (e) {
        // Non-blocking
        console.warn('HighLevel opt-in sync failed', e);
      }
    }
    navigate(from, { replace: true });
  };

  if (USE_HL_FORM && HL_FORM_URL) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Get Instant Access</h1>
            <p className="text-gray-600 mb-6">Complete this form to access the toolkit.</p>

            <div className="mb-4">
              <a
                href={formUrlWithParams}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center"
              >
                Open Form in New Tab
              </a>
              <p className="text-xs text-gray-500 mt-2">If the embedded form below has issues, use the button above.</p>
            </div>

            <div className="border rounded-lg overflow-hidden" style={{ height: 900 }}>
              <iframe
                title="Opt-in Form"
                src={formUrlWithParams}
                width="100%"
                height="100%"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Get Instant Access</h1>
          <p className="text-gray-600 mb-6">Enter your info to access the toolkit.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First name *</label>
              <input
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className="input-field w-full"
                placeholder="Jane"
              />
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="input-field w-full"
                placeholder="jane@example.com"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                {...register('phone', { required: 'Phone is required' })}
                className="input-field w-full"
                placeholder="(555) 555-5555"
              />
              {errors.phone && (
                <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting…' : 'Access My Toolkit →'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}


