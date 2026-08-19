import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading && !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--surface)]">
        <PageLoader size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
