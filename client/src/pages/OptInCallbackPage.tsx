import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setOptIn, type OptInDataInput } from '../utils/optInStorage';

function getQueryParam(search: string, key: string): string | null {
  const params = new URLSearchParams(search);
  const value = params.get(key);
  return value && value.trim().length > 0 ? value : null;
}

export default function OptInCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const firstName = getQueryParam(location.search, 'firstName') || getQueryParam(location.search, 'first_name');
    const email = getQueryParam(location.search, 'email');
    const phone = getQueryParam(location.search, 'phone') || getQueryParam(location.search, 'phoneNumber');
    const from = getQueryParam(location.search, 'from');

    if (firstName && email && phone) {
      const data: OptInDataInput = { firstName, email, phone };
      setOptIn(data);
    }

    const target = from && from.startsWith('/') ? from : '/tools';

    // Notify opener (popup) if present
    try {
      if (window.opener && typeof window.opener.postMessage === 'function') {
        window.opener.postMessage({ type: 'pe2:optin:complete' }, '*');
      }
    } catch {}

    // Attempt to close popup windows
    try {
      if (window.opener) {
        window.close();
      }
    } catch {}

    navigate(target, { replace: true });
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Finalizing your access…</div>
    </div>
  );
}


