import { useEffect, useState } from 'react';
import './Dashboard.css';
import { useNavigate, Link } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Learn2Hire</h1>
        <div className="header-actions">
          <span className="user-info">
            {user.name} <span className="role">({user.role})</span>
          </span>
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>Welcome, {user.name}</h2>
        <p className="welcome-text">
          You're logged in as <strong>{user.role}</strong>. Your dashboard is
          ready.
        </p>

        <div className="dashboard-links">
          {user.role === 'student' && (
            <Link to="/profile" className="card">
              <h3>My Profile</h3>
              <p>View and update your skills & progress</p>
            </Link>
          )}
          <Link to="/assessments" className="card">
            <h3>Assessments</h3>
            <p>Take or manage assessments</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
