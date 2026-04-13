// src/components/Layout/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="layout">
      <Navbar />
      <div className="layout-main">
        <Sidebar isAdmin={isAdmin} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;