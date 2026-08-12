import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-[var(--muted)]">Loading...</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
