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
const ZoneManagement = React.lazy(() => import('./components/ZoneManagement'));

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

  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-id">
            <span className="app-title">Wisdom MLP E Meetings</span>
            <span className="app-user">
              {user && <span className="nums">{user.username}</span>}
              {isAntiGravity && <span className="app-user-badge">ANTI-GRAVITY</span>}
            </span>
          </div>
          <button type="button" onClick={handleLogout} className="app-logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ലോഗൗട്ട്
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <div className="app-version">v1.0.3 - 2026.04.28</div>

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
          path="/admin/zones"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuthenticatedLayout>
                <ZoneManagement />
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

