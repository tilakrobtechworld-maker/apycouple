import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import Spinner from './components/ui/Spinner';

// ─── Lazy Imports ──────────────────────────────────────────────────────────────
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CouplesPage = lazy(() => import('./pages/CouplesPage'));
const CoupleDetail = lazy(() => import('./pages/CoupleDetail'));
const ThemesPage = lazy(() => import('./pages/ThemesPage'));
const CardTemplatesPage = lazy(() => import('./pages/CardTemplatesPage'));
const SceneEditorPage = lazy(() => import('./pages/SceneEditorPage'));
const MediaModerationPage = lazy(() => import('./pages/MediaModerationPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// ─── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

// ─── Page Loader ───────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Public */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Panel */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
          <Route path="couples" element={<Suspense fallback={<PageLoader />}><CouplesPage /></Suspense>} />
          <Route path="couples/:id" element={<Suspense fallback={<PageLoader />}><CoupleDetail /></Suspense>} />
          <Route path="themes" element={<Suspense fallback={<PageLoader />}><ThemesPage /></Suspense>} />
          <Route path="card-templates" element={<Suspense fallback={<PageLoader />}><CardTemplatesPage /></Suspense>} />
          <Route path="3d-editor" element={<Suspense fallback={<PageLoader />}><SceneEditorPage /></Suspense>} />
          <Route path="media" element={<Suspense fallback={<PageLoader />}><MediaModerationPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
          <Route path="subscriptions" element={<Suspense fallback={<PageLoader />}><SubscriptionsPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
