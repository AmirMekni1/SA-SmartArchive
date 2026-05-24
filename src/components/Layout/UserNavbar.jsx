
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UserNavbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="user-navbar">
      <div className="navbar-container">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}>
          
          ☰
        </button>

        <Link to="/dashboard" className="navbar-brand">
          <span className="brand-icon">🏛️</span>
          <span className="brand-text">SmartArchive</span>
        </Link>

        <div className="navbar-actions">
          <button className="action-btn notification-btn">
            🔔
            <span className="badge">3</span>
          </button>
          
          <div className="user-menu">
            <button
              className="user-menu-trigger"
              onClick={() => setShowUserMenu(!showUserMenu)}>
              
              <div className="user-avatar">
                {user?.username?.charAt(0) || 'U'}
              </div>
              <span className="user-name">{user?.username}</span>
              <span className="dropdown-icon">▼</span>
            </button>
            
            {showUserMenu &&
            <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <span>👤</span> Profile
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <span>⚙️</span> Settings
                </Link>
                <hr />
                <button onClick={handleLogout} className="dropdown-item logout">
                  <span>🚪</span> Sign out
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>);

};

export default UserNavbar;
