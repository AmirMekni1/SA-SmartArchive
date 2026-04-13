// components/Layout/UserLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import UserSidebar from './UserSidebar';
import UserFooter from './UserFooter';
import '../styles/user.css';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="user-layout">
      <UserNavbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="user-layout-main">
        <UserSidebar sidebarOpen={sidebarOpen} />
        <main className={`user-content ${!sidebarOpen ? 'expanded' : ''}`}>
          <Outlet />
        </main>
      </div>
      <UserFooter />
    </div>
  );
};

export default UserLayout;