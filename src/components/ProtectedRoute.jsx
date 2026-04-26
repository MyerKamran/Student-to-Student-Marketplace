// ProtectedRoute — redirects to /login if user is not authenticated
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requireAdmin = false, disallowAdmin = false }) {
  const { isLoggedIn, loadingAuth, currentUser } = useAuth();

  // Wait until auth session restore finishes to avoid false redirects on refresh.
  if (loadingAuth) {
    return (
      <div className="pt-24 px-4">
        <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-2xl p-6 text-gray-500 text-sm">
          Checking session...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && String(currentUser?.role || '').toLowerCase() !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (disallowAdmin && String(currentUser?.role || '').toLowerCase() === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default ProtectedRoute;
