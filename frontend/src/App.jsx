import { useLayoutEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import { ClearSessionOnMount } from './components/auth/ClearSessionOnMount.jsx';
import { useAuthSession } from './lib/authSession';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { SessionHydration } from './components/auth/SessionHydration.jsx';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AdminJobsPage = lazy(() => import('./pages/AdminJobsPage'));
const AdminCollegeDetailPage = lazy(() => import('./pages/AdminCollegeDetailPage'));
const AdminUserProfilePage = lazy(() => import('./pages/AdminUserProfilePage'));
const AdminTestimonialsPage = lazy(() => import('./pages/AdminTestimonialsPage'));
const LearnerSummaryPage = lazy(() => import('./pages/LearnerSummaryPage'));
const CompanyJobsPage = lazy(() => import('./pages/CompanyJobsPage'));
const CompanyTalentPage = lazy(() => import('./pages/CompanyTalentPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CollegeRosterPage = lazy(() => import('./pages/CollegeRosterPage'));
const CreateAssessment = lazy(() => import('./pages/CreateAssessment'));
const JobDetailsPage = lazy(() => import('./pages/JobDetailsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AssessmentsList = lazy(() => import('./pages/AssessmentsList'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const StudentAssessment = lazy(() => import('./pages/StudentAssessment'));
const LearningHomePage = lazy(() => import('./pages/LearningHomePage'));
const LearningSubjectPage = lazy(() => import('./pages/LearningSubjectPage'));
const MaterialDetailsPage = lazy(() => import('./pages/MaterialDetailsPage'));
const MyLearningProgressPage = lazy(() => import('./pages/MyLearningProgressPage'));
const LearningManagePage = lazy(() => import('./pages/LearningManagePage'));

function RouteFallback() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-[var(--light)] text-slate-500"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm font-medium">Loading…</span>
    </div>
  );
}

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
      <SessionHydration />
      <Suspense fallback={<RouteFallback />}>
        <ScrollToTopOnRouteChange />
        <Routes>
      <Route
        path="/"
        element={
          <>
            <ClearSessionOnMount />
            <LandingPage />
          </>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <>
              <ClearSessionOnMount />
              <Login />
            </>
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <>
              <ClearSessionOnMount />
              <Signup />
            </>
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <>
              <ClearSessionOnMount />
              <ForgotPassword />
            </>
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
      <Route
        path="/dashboard/college/roster"
        element={
          <ProtectedRoute>
            <CollegeRosterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/learners/:userId"
        element={
          <ProtectedRoute>
            <LearnerSummaryPage />
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
        path="/admin/testimonials"
        element={
          <ProtectedRoute>
            <AdminTestimonialsPage />
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
      </Suspense>
    </NotificationProvider>
  );
}

export default App;
