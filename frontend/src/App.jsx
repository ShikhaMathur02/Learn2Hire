import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminJobsPage from './pages/AdminJobsPage';
import CompanyJobsPage from './pages/CompanyJobsPage';
import Dashboard from './pages/Dashboard';
import CreateAssessment from './pages/CreateAssessment';
import JobDetailsPage from './pages/JobDetailsPage';
import LandingPage from './pages/LandingPage';
import LearningHomePage from './pages/LearningHomePage';
import LearningManagePage from './pages/LearningManagePage';
import MaterialDetailsPage from './pages/MaterialDetailsPage';
import MyLearningProgressPage from './pages/MyLearningProgressPage';
import NotificationsPage from './pages/NotificationsPage';
import AssessmentsList from './pages/AssessmentsList';
import JobsPage from './pages/JobsPage';
import StudentAssessment from './pages/StudentAssessment';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
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
      <Route path="/learn" element={<LearningHomePage />} />
      <Route path="/learn/category/:categorySlug" element={<LearningHomePage />} />
      <Route path="/learn/material/:slug" element={<MaterialDetailsPage />} />
      <Route
        path="/learn/progress"
        element={
          <ProtectedRoute>
            <MyLearningProgressPage />
          </ProtectedRoute>
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
        path="/learn/manage"
        element={
          <ProtectedRoute>
            <LearningManagePage />
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
        path="/company/jobs"
        element={
          <ProtectedRoute>
            <CompanyJobsPage />
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
  );
}

export default App;
