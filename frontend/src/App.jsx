import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import MeetingForm from './components/MeetingForm';
import MeetingReport from './components/MeetingReport';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { logout, getUser, hasRole, hasAnyRole, isAntiGravityUser } from './services/auth';
import BottomNavigation from './components/BottomNavigation';
import HomeRedirect from './components/HomeRedirect';

// Lazy loaded components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const UserManagement = React.lazy(() => import('./components/UserManagement'));
const QHLSDashboard = React.lazy(() => import('./components/QHLSDashboard'));
const MemberManagement = React.lazy(() => import('./components/MemberManagement'));
const AdminPage = React.lazy(() => import('./components/AdminPage'));
const MeetingDayConfig = React.lazy(() => import('./components/MeetingDayConfig'));

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isAntiGravity = isAntiGravityUser(user);

  // Redirect logic removed from here as it's now handled by HomeRedirect or specific route guards

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const headerStyles = {
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      padding: '16px',
      background: 'var(--white)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-md)',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    username: {
      color: 'var(--primary)',
      fontSize: '14px',
      fontWeight: '600',
      background: 'var(--primary-light)',
      padding: '8px 16px',
      borderRadius: '20px',
    },
    antiGravityBadge: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '16px',
      fontSize: '11px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
      animation: 'pulse 2s ease-in-out infinite',
    },
    logoutBtn: {
      padding: '10px 20px',
      background: 'var(--danger)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontFamily: 'Anek Malayalam, sans-serif',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    contentWrapper: {
      paddingBottom: '90px', // Space for bottom navigation
    },
  };

  return (
    <div>
      {/* Simple header with username and logout */}
      <header style={headerStyles.header}>
        <div style={headerStyles.userInfo}>
          {user && (
            <span style={headerStyles.username}>
              {user.username}
            </span>
          )}
          {isAntiGravity && (
            <span style={headerStyles.antiGravityBadge}>
              ⚡ ANTI-GRAVITY
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          style={headerStyles.logoutBtn}
        >
          ലോഗൗട്ട്
        </button>
      </header>

      {/* Main content with bottom padding */}
      <div style={headerStyles.contentWrapper}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

function App() {
  return (
    <React.Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h2>Loading...</h2>
      </div>
    }>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/form"
          element={
            <ProtectedRoute requiredAnyRole={['admin', 'zone_admin']}>
              <AuthenticatedLayout>
                <MeetingForm />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <MeetingReport />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredAnyRole={['admin', 'district_admin']}>
              <AuthenticatedLayout>
                <Dashboard onNavigate={(id) => {
                  // Navigation logic
                }} />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuthenticatedLayout>
                <AdminPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuthenticatedLayout>
                <UserManagement />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/meeting-day"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuthenticatedLayout>
                <MeetingDayConfig />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qhls"
          element={
            <ProtectedRoute requiredAnyRole={['admin', 'district_admin']}>
              <AuthenticatedLayout>
                <QHLSDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute requiredAnyRole={['admin', 'zone_admin', 'district_admin']}>
              <AuthenticatedLayout>
                <MemberManagement />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;

