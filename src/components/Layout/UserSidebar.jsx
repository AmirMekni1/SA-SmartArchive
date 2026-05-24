
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UserSidebar = ({ sidebarOpen }) => {
  const { user } = useAuth();
  const userMenuItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/upload', icon: '📤', label: 'Upload' },
  { path: '/documents', icon: '📋', label: 'Documents' },
  { path: '/my-cin', icon: '🆔', label: 'My ID' },
  { path: '/notifications', icon: '🔔', label: 'Notifications' },
  { path: '/profile', icon: '👤', label: 'Profile' },
  { path: '/settings', icon: '⚙️', label: 'Settings' }];


  const adminMenuItems = [
  { path: '/admin/dashboard', icon: '📊', label: 'Admin Dashboard' },
  { path: '/admin/users', icon: '👥', label: 'Users' },
  { path: '/admin/documents', icon: '📄', label: 'Documents' },
  { path: '/admin/statistics', icon: '📈', label: 'Statistics' },
  { path: '/admin/reports', icon: '✍️', label: 'AI Writing' },
  { path: '/admin/settings', icon: '⚙️', label: 'System Settings' }];


  const menuItems = user?.role === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <aside className={`user-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-user-info">
        <div className="sidebar-avatar">👤</div>
        {sidebarOpen &&
        <div className="sidebar-user-details">
            <h4>{user?.username || 'SmartArchive User'}</h4>
            <p>ID: {user?.cin_number || 'Not available'}</p>
          </div>
        }
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) =>
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
          `sidebar-link ${isActive ? 'active' : ''}`
          }>
          
            <span className="sidebar-icon">{item.icon}</span>
            {sidebarOpen && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        )}
      </nav>
    </aside>);

};

export default UserSidebar;
