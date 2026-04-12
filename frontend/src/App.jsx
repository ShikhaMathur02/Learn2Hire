import { useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AdminJobsPage from './pages/AdminJobsPage';
import AdminCollegeDetailPage from './pages/AdminCollegeDetailPage';
import AdminUserProfilePage from './pages/AdminUserProfilePage';
import CompanyJobsPage from './pages/CompanyJobsPage';
import CompanyTalentPage from './pages/CompanyTalentPage';
import Dashboard from './pages/Dashboard';
import CreateAssessment from './pages/CreateAssessment';
import JobDetailsPage from './pages/JobDetailsPage';
import LandingPage from './pages/LandingPage';
import NotificationsPage from './pages/NotificationsPage';
import AssessmentsList from './pages/AssessmentsList';
import JobsPage from './pages/JobsPage';
import StudentAssessment from './pages/StudentAssessment';
import LearningHomePage from './pages/LearningHomePage';
import LearningSubjectPage from './pages/LearningSubjectPage';
import MaterialDetailsPage from './pages/MaterialDetailsPage';
import MyLearningProgressPage from './pages/MyLearningProgressPage';
import LearningManagePage from './pages/LearningManagePage';
import { useAuthSession } from './lib/authSession';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  return children;
}

function RedirectPublicLearningCategory() {
  const { categorySlug } = useParams();
  return <Navigate to={`/learning/subject/${categorySlug}`} replace />;
}

function RedirectDashboardLearningCategory() {
  const { categorySlug } = useParams();
  return <Navigate to={`/dashboard/learning/subject/${categorySlug}`} replace />;
}

/** Reset window scroll on client-side navigation (e.g. landing → signup). */
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <NotificationProvider>
      <ScrollToTopOnRouteChange />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Public learning — static segments before :categorySlug so /progress and /topic/... are not captured as slugs */}
      <Route path="/learning" element={<LearningHomePage mode="public" />} />
      <Route path="/learning/topic/:slug" element={<MaterialDetailsPage />} />
      <Route
        path="/learning/progress"
        element={
          <ProtectedRoute>
            <MyLearningProgressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learning/progress"
        element={
          <ProtectedRoute>
            <MyLearningProgressPage />
          </ProtectedRoute>
        }
      />
      <Route path="/learning/subject/:categorySlug" element={<LearningSubjectPage mode="public" />} />
      <Route path="/learning/:categorySlug" element={<RedirectPublicLearningCategory />} />
      {/* Dashboard learning — /manage before :categorySlug */}
      <Route
        path="/dashboard/learning/manage"
        element={
          <ProtectedRoute>
            <LearningManagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learning"
        element={
          <ProtectedRoute>
            <LearningHomePage mode="dashboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learning/topic/:slug"
        element={
          <ProtectedRoute>
            <MaterialDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learning/subject/:categorySlug"
        element={
          <ProtectedRoute>
            <LearningSubjectPage mode="dashboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learning/:categorySlug"
        element={
          <ProtectedRoute>
            <RedirectDashboardLearningCategory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments"
        element={
          <ProtectedRoute>
            <AssessmentsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute>
            <AdminJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute>
            <AdminUserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/colleges/:collegeId"
        element={
          <ProtectedRoute>
            <AdminCollegeDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/jobs"
        element={
          <ProtectedRoute>
            <CompanyJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/talent"
        element={
          <ProtectedRoute>
            <CompanyTalentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute>
            <JobDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments/create"
        element={
          <ProtectedRoute>
            <CreateAssessment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments/:id"
        element={
          <ProtectedRoute>
            <StudentAssessment />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </NotificationProvider>
  );
}

export default App;
