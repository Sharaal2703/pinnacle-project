import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, User, LogOut, ShieldCheck, History, Award } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="nav-wrapper">
        <Link to="/" className="nav-brand">
          <Compass className="brand-icon" size={28} />
          <span>MindBridge</span>
          <span className="nav-brand-badge">Pre-Assessment</span>
        </Link>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              {user?.role === 'STUDENT' && (
                <>
                  <Link to="/instructions" className="nav-link">
                    Instructions
                  </Link>
                  <Link to="/assessment" className="nav-link">
                    Assessment
                  </Link>
                  <Link to="/result" className="nav-link">
                    <Award size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    My Profile
                  </Link>
                  <Link to="/history" className="nav-link">
                    <History size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    History
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="nav-link">
                  <ShieldCheck size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Admin Dashboard
                </Link>
              )}

              <div className="user-pill">
                <User size={16} />
                <span>{user?.name}</span>
                <span className={`role-badge ${user?.role.toLowerCase()}`}>
                  {user?.role === 'STUDENT' ? `Grade ${user.grade || ''}` : user?.role}
                </span>
              </div>

              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register Student
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
