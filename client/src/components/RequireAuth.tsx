import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RequireAuthLoading from './RequireAuthLoading';

interface RequireAuthProps {
  requireAdmin?: boolean;
  requiredToolId?: string;
}

export default function RequireAuth({ requireAdmin = false, requiredToolId }: RequireAuthProps) {
  const location = useLocation();
  const { firebaseUser, loading, isAdmin, hasToolAccess } = useAuth();

  if (loading) {
    return <RequireAuthLoading />;
  }

  if (!firebaseUser) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/tools" replace />;
  }

  if (requiredToolId && !hasToolAccess(requiredToolId)) {
    return <Navigate to="/tools" replace />;
  }

  return <Outlet />;
}

