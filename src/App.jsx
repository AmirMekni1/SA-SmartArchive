import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";
import IntroLogo from "./components/Intro/Intro";
import Welcom from './components/Intro/Welcom';
import Auth from "./components/Authentification/Auth";
import Login from "./components/Authentification/Login";
import Register from "./components/Authentification/Register";
import VerifyEmail from "./components/Authentification/VerifyEmail";
import ForgotPassword from "./components/Authentification/ForgotPassword";
import UserLayout from './components/Layout/UserLayout';
import UserDashboard from './components/User/UserDashboard';
import UserProfile from './components/User/UserProfile';
import UploadDocument from './components/User/UploadDocument';
import DocumentHistory from './components/User/DocumentHistory';
import MyCIN from './components/User/MyCIN';
import Notifications from './components/User/Notifications';
import UserSettings from './components/User/Settings';
import AdminDashboard from './components/Admin/AdminDashboard';
import UsersList from './components/Admin/UsersList';
import DocumentsList from './components/Admin/DocumentsList';
import AdminDocumentDetails from './components/Admin/DocumentDetails';
import Statistics from './components/Admin/Statistics';
import Reports from './components/Admin/Reports';
import AdminSettings from './components/Admin/Settings';
import UserDetails from './components/Admin/UserDetails';




const ProtectedRouteUser = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role === 'user') {
    return children || <Outlet />;
  }

  return <Navigate to="/admin/dashboard" replace />;
};





const ProtectedRouteAdmin = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role === 'admin') {
    return children || <Outlet />;
  }

  return <Navigate to="/dashboard" replace />;
};

const ProtectedRouteAuthenticated = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};




const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRouteAuthenticated />}>
        <Route path="/welcom" element={<Welcom />} />
      </Route>

      <Route element={<ProtectedRouteUser />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/upload" element={<UploadDocument />} />
          <Route path="/documents" element={<DocumentHistory />} />
          <Route path="/my-cin" element={<MyCIN />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<UserSettings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRouteAdmin />}>
        <Route element={<UserLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersList />} />
          <Route path="/admin/users/:id" element={<UserDetails />} />
          <Route path="/admin/documents" element={<DocumentsList />} />
          <Route path="/admin/documents/:id" element={<AdminDocumentDetails />} />
          <Route path="/admin/statistics" element={<Statistics />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>);

};




export default function App() {
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('token'));

  useEffect(() => {

    if (localStorage.getItem('token')) {
      setShowIntro(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 6050);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {showIntro ?
      <IntroLogo /> :

      <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      }
    </Router>);

}
