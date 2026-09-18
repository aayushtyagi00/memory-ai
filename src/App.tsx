import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddMemoryPage } from './pages/AddMemoryPage';
import { AskMemoryPage } from './pages/AskMemoryPage';
import { MemoryLibraryPage } from './pages/MemoryLibraryPage';
import { MemoryDetailPage } from './pages/MemoryDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';

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

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />

            {/* Authenticated Routes wrapped in AppLayout */}
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
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};
