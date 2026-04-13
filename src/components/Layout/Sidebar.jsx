// src/components/Layout/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isAdmin }) => {
  const userMenuItems = [
    { path: '/dashboard', icon: '📊', label: 'لوحة التحكم' },
    { path: '/upload', icon: '📤', label: 'رفع مستند' },
    { path: '/documents', icon: '📋', label: 'المستندات' },
    { path: '/my-cin', icon: '🆔', label: 'بطاقتي' },
    { path: '/profile', icon: '👤', label: 'الملف الشخصي' },
  ];

  const adminMenuItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'لوحة التحكم' },
    { path: '/admin/users', icon: '👥', label: 'المستخدمين' },
    { path: '/admin/documents', icon: '📄', label: 'المستندات' },
    { path: '/admin/statistics', icon: '📈', label: 'الإحصائيات' },
    { path: '/admin/settings', icon: '⚙️', label: 'الإعدادات' },
  ];

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;