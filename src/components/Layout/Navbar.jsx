
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <span className="brand-icon">🏛️</span>
          <span className="brand-text">منصة التعريف الوطنية</span>
        </Link>

        <div className="navbar-menu">
          <div className="user-menu">
            <button
              className="user-menu-trigger"
              onClick={() => setShowMenu(!showMenu)}>
              
              <div className="user-avatar">
                {user?.username?.charAt(0) || '👤'}
              </div>
              <span className="user-name">{user?.username}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showMenu &&
            <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <span>👤</span> الملف الشخصي
                </Link>
                {isAdmin &&
              <Link to="/admin/dashboard" className="dropdown-item">
                    <span>⚙️</span> لوحة التحكم
                  </Link>
              }
                <hr className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item logout">
                  <span>🚪</span> تسجيل الخروج
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>);

};

export default Navbar;
