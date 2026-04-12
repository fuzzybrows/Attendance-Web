import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from './store/authSlice';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import Login from './pages/Login';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import MembersManagement from './pages/MembersManagement';
import Sessions from './pages/Sessions';
import QRAttendance from './pages/QRAttendance';
import Calendar from './pages/Calendar';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { token, user } = useSelector(state => state.auth);

  if (!token) return <Navigate to="/login" />;

  if (requiredPermission && !user?.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" />;
  }

  return children;
};

/**
 * Decodes a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ?? null; // Unix timestamp in seconds
  } catch {
    return null;
  }
}

/**
 * Proactive session expiry guard.
 * - On mount: if the stored token is already expired → redirect immediately.
 * - Otherwise: schedule a redirect ~30 s before the token actually expires
 *   so the user is never mid-action when the session dies.
 * - Also re-checks every 60 s as a safety net (e.g. tab left open overnight).
 */
function useSessionExpiry() {
  const { token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    const exp = decodeJwtExpiry(token);
    if (exp === null) return;

    const WARN_BEFORE_MS = 30_000; // redirect 30 s before true expiry

    const doLogout = () => {
      dispatch(logout());
      navigate('/login', { replace: true });
    };

    const msUntilExpiry = exp * 1000 - Date.now();

    // Already expired
    if (msUntilExpiry <= 0) {
      doLogout();
      return;
    }

    // Schedule proactive redirect ~30 s before token expires
    const preWarningMs = Math.max(0, msUntilExpiry - WARN_BEFORE_MS);
    const timer = setTimeout(doLogout, preWarningMs);

    // Also poll every 60 s as a safety net
    const poll = setInterval(() => {
      if (exp * 1000 - Date.now() <= 0) {
        doLogout();
      }
    }, 60_000);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [token, dispatch, navigate]);
}

function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', textAlign: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '3rem 2.5rem', maxWidth: '420px', width: '100%',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>404</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="btn" style={{ textDecoration: 'none', padding: '0.6rem 1.5rem' }}>
          Go Home
        </a>
      </div>
    </div>
  );
}

function AppRoutes() {
  useSessionExpiry();
  return (
    <div className="container">
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ResetPassword />} />
        <Route path="/qr-attendance" element={<QRAttendance />} />

        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute requiredPermission="admin"><MembersManagement /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute requiredPermission="admin"><Sessions /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute requiredPermission="admin"><Statistics /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" />
        <Analytics />
        <Routes>
          <Route path="/health" element={<>OK</>} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
