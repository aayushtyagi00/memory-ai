import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
const LandingPage=lazy(()=>import('./pages/LandingPage').then(module=>({default:module.LandingPage})));
const AuthPage=lazy(()=>import('./pages/AuthPage').then(module=>({default:module.AuthPage})));
const DashboardPage=lazy(()=>import('./pages/DashboardPage').then(module=>({default:module.DashboardPage})));
const AddMemoryPage=lazy(()=>import('./pages/AddMemoryPage').then(module=>({default:module.AddMemoryPage})));
const AskMemoryPage=lazy(()=>import('./pages/AskMemoryPage').then(module=>({default:module.AskMemoryPage})));
const MemoryLibraryPage=lazy(()=>import('./pages/MemoryLibraryPage').then(module=>({default:module.MemoryLibraryPage})));
const MemoryDetailPage=lazy(()=>import('./pages/MemoryDetailPage').then(module=>({default:module.MemoryDetailPage})));
const TimelinePage=lazy(()=>import('./pages/TimelinePage').then(module=>({default:module.TimelinePage})));
const RemindersPage=lazy(()=>import('./pages/RemindersPage').then(module=>({default:module.RemindersPage})));
const SettingsPage=lazy(()=>import('./pages/SettingsPage').then(module=>({default:module.SettingsPage})));
const ResetPasswordPage=lazy(()=>import('./pages/ResetPasswordPage').then(module=>({default:module.ResetPasswordPage})));
import { Feedback } from './components/common/Feedback';

// Automatically redirects authenticated users away from public landing/login pages to /dashboard
const AuthRedirectWatcher: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      if (location.pathname === '/' || location.pathname === '/login') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  return null;
};

// Route wrapper for authenticated users only
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-mono text-xs text-text-muted">
        Loading personal memory...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <React.Fragment key={user?.id}>{children}</React.Fragment>;
};

// Route wrapper for public/guest pages - if already authenticated, redirects directly to /dashboard
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-mono text-xs text-text-muted">
        Loading personal memory...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Feedback />
          <AuthRedirectWatcher />
          <Suspense fallback={<p className="p-8" role="status">Loading page…</p>}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* Public Routes: authenticated users are directly sent to /dashboard */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <LandingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              }
            />

            {/* Authenticated Main App Routes wrapped in AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/add" element={<AddMemoryPage />} />
              <Route path="/ask" element={<AskMemoryPage />} />
              <Route path="/memories" element={<MemoryLibraryPage />} />
              <Route path="/memories/:id" element={<MemoryDetailPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};
