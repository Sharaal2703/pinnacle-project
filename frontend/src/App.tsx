import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ResultPage } from './pages/ResultPage';
import { AssessmentIncompletePage } from './pages/AssessmentIncompletePage';
import { ProfileHistoryPage } from './pages/ProfileHistoryPage';
import { AdminAssessmentPage } from './pages/AdminAssessmentPage';
import { TeacherStudentsPage } from './pages/TeacherStudentsPage';
import { TeacherAccountsPage } from './pages/TeacherAccountsPage';
import { LearningLibraryPage } from './pages/LearningLibraryPage';
import { LearningChapterPage } from './pages/LearningChapterPage';
import { TeacherLearningReviewPage } from './pages/TeacherLearningReviewPage';
import { AdminLearningResourcesPage } from './pages/AdminLearningResourcesPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './api/client';
import type { Role } from '@pinnacle/shared';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: Role | Role[];
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

  const requiredRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : null;
  if (requiredRoles && (!user || !requiredRoles.includes(user.role))) {
    const destination = user?.role === 'ADMIN' ? '/admin' : user?.role === 'TEACHER' ? '/teacher/access' : '/result';
    return <Navigate to={destination} replace />;
  }

  return children;
};

const AssessmentAccessRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [canTake, setCanTake] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState(false);

  const checkAccess = React.useCallback(() => {
    setCanTake(null);
    setError(false);
    api.getAssessmentAccess()
      .then((access) => setCanTake(access.can_take_assessment))
      .catch(() => { setCanTake(false); setError(true); });
  }, []);

  React.useEffect(() => { checkAccess(); }, [checkAccess]);

  if (canTake === null) {
    return <div className="access-state">Checking assessment access…</div>;
  }
  if (error) {
    return (
      <div className="card access-state">
        <h2>Could not check assessment access</h2>
        <p>Please check your connection and try again.</p>
        <button type="button" className="btn btn-primary" onClick={checkAccess}>Retry</button>
      </div>
    );
  }
  if (!canTake) return <Navigate to="/result" replace />;
  return children;
};

const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'TEACHER') return <Navigate to="/teacher/access" replace />;
  return <Navigate to="/instructions" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <ErrorBoundary>
            <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Student Routes */}
              <Route path="/learning" element={<ProtectedRoute requiredRole="STUDENT"><LearningLibraryPage /></ProtectedRoute>} />
              <Route path="/learning/chapters/:chapterId" element={<ProtectedRoute requiredRole="STUDENT"><LearningChapterPage /></ProtectedRoute>} />
              <Route path="/teacher/learning-review" element={<ProtectedRoute requiredRole="TEACHER"><TeacherLearningReviewPage /></ProtectedRoute>} />
              <Route path="/admin/learning-resources" element={<ProtectedRoute requiredRole="ADMIN"><AdminLearningResourcesPage /></ProtectedRoute>} />
              <Route
                path="/instructions"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AssessmentAccessRoute><InstructionsPage /></AssessmentAccessRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AssessmentAccessRoute><AssessmentPage /></AssessmentAccessRoute>
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
                    <AssessmentIncompletePage />
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
                path="/teacher/access"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <TeacherStudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teachers"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <TeacherAccountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminAssessmentPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </main>
          </ErrorBoundary>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};
