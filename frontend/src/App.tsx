import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ResultPage } from './pages/ResultPage';
import { IncompletePage } from './pages/IncompletePage';
import { ProfileHistoryPage } from './pages/ProfileHistoryPage';
import { AdminPage } from './pages/AdminPage';
import type { Role } from '@pinnacle/shared';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: '#64748b' }}>Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/instructions'} replace />;
  }

  return children;
};

const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/instructions" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Student Routes */}
              <Route
                path="/instructions"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <InstructionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AssessmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/result"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <ResultPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incomplete"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <IncompletePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <ProfileHistoryPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};
