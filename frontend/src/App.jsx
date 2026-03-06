import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
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

function IndexRedirect() {
  const token = localStorage.getItem('token');
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
