import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, User, LogOut, ShieldCheck, History, Award, ClipboardCheck, UsersRound } from 'lucide-react';
import { api } from '../api/client';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [canTakeAssessment, setCanTakeAssessment] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    if (user?.role !== 'STUDENT') {
      setCanTakeAssessment(false);
      return () => { isCurrent = false; };
    }

    setCanTakeAssessment(false);
    api.getAssessmentAccess()
      .then((access) => { if (isCurrent) setCanTakeAssessment(access.can_take_assessment); })
      .catch(() => { if (isCurrent) setCanTakeAssessment(false); });

    return () => { isCurrent = false; };
  }, [user?.id, user?.role, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="nav-wrapper">
        <Link to="/" className="nav-brand">
          <Brain className="brand-icon" size={28} aria-hidden="true" />
          <span>MindBridge</span>
          <span className="nav-brand-badge">Pre-Assessment</span>
        </Link>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              {user?.role === 'STUDENT' && (
                <>
                  {canTakeAssessment && <>
                    <Link to="/instructions" className="nav-link">
                      Instructions
                    </Link>
                    <Link to="/assessment" className="nav-link">
                      Assessment
                    </Link>
                  </>}
                  <Link to="/result" className="nav-link">
                    <Award size={18} aria-hidden="true" />
                    My Profile
                  </Link>
                  <Link to="/history" className="nav-link">
                    <History size={18} aria-hidden="true" />
                    History
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <Link to="/admin" className="nav-link">
                    <ShieldCheck size={18} aria-hidden="true" />
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/teachers" className="nav-link">
                    <UsersRound size={18} aria-hidden="true" />
                    Teacher Accounts
                  </Link>
                </>
              )}

              {user?.role === 'TEACHER' && (
                <Link to="/teacher/access" className="nav-link">
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <span>Student Access</span>
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
