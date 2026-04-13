import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";
import IntroLogo from "./components/Intro/Intro";
import Auth from "./components/Authentification/Auth";
import Login from "./components/Authentification/Login";
import Register from "./components/Authentification/Register";
import VerifyEmail from "./components/Authentification/VerifyEmail";
import UserLayout from './components/Layout/UserLayout';
import UserDashboard from './components/User/UserDashboard';
import UserProfile from './components/User/UserProfile';
import UploadDocument from './components/User/UploadDocument';
import DocumentHistory from './components/User/DocumentHistory';
import MyCIN from './components/User/MyCIN';
import Settings from './components/User/Settings';

// =======================
// مكون حماية المسارات (يجب أن يكون خارج المكون الرئيسي)
// =======================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};

// =======================
// مكون المسارات الرئيسي (يحتاج إلى AuthProvider)
// =======================
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/upload" element={<UploadDocument />} />
          <Route path="/documents" element={<DocumentHistory />} />
          <Route path="/my-cin" element={<MyCIN />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// =======================
// المكون الرئيسي
// =======================
export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 6050); // 6.05 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {showIntro ? (
        <IntroLogo />
      ) : (
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      )}
    </Router>
  );
}
