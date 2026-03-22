import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { token, user } = useSelector(state => state.auth);

  if (!token) return <Navigate to="/login" />;

  if (requiredPermission && !user?.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" />;
  }

  return children;
};

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

function App() {
  return (
    <ErrorBoundary>
      <Router>
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
      </Router>
    </ErrorBoundary>
  );
}

export default App;
