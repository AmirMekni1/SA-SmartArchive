import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SmartArchiveBackground from '../../assets/SmartArchiveBackground.png';
import './Welcom.css';

const WELCOME_DURATION_MS = 3800;

const Welcom = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    if (!user) {
      navigate('/', { replace: true });
      return undefined;
    }

    const targetPath = user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, WELCOME_DURATION_MS);

    return () => clearTimeout(timer);
  }, [loading, navigate, user]);

  if (loading || !user) {
    return null;
  }

  return (
    <section className="welcom-screen" aria-label="Welcome transition screen">
      <img src={SmartArchiveBackground} alt="SmartArchive background" className="welcom-background" />
      <div className="welcom-overlay" />

      <div className="welcom-content">
        <p className="welcom-eyebrow">SmartArchive</p>
        <h1 className="welcom-title">Welcome {user.role === 'admin' ? 'Administrator' : 'User'}</h1>
        <p className="welcom-subtitle">Preparing your workspace...</p>

        <div className="welcom-progress">
          <div className="welcom-progress-fill" />
        </div>
      </div>
    </section>);

};

export default Welcom;
