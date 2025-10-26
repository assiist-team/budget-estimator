import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasValidOptIn } from '../utils/optInStorage';

export default function RequireOptIn() {
  const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true';
  const location = useLocation();

  if (AUTH_DISABLED) {
    return <Outlet />;
  }

  if (!hasValidOptIn()) {
    return <Navigate to="/opt-in" state={{ from: location }} replace />;
  }

  return <Outlet />;
}


