
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const { login, loadUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cin_number: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.cin_number, formData.password);
    console.log('Login result:', result);
    if (result.success) {
      localStorage.setItem('token', result.response.token);
      await loadUser();
      navigate('/welcom', { replace: true });

    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-orb login-orb-one"></div>
      <div className="login-orb login-orb-two"></div>
      <div className="login-grid">
        <section className="login-showcase">
          <div className="login-brand-pill">Secure archival access</div>
          <h1 className="login-showcase-title">SmartArchive</h1>
          <p className="login-showcase-text">
            Access your digital workspace to review documents, follow
            verification activity, and manage your archive from one polished
            dashboard.
          </p>

          <div className="login-showcase-panel">
            <div className="login-metric">
              <strong>Fast</strong>
              <span>Direct access to your dashboard after authentication</span>
            </div>
            <div className="login-metric">
              <strong>Secure</strong>
              <span>Protected session with token-based identity verification</span>
            </div>
            <div className="login-metric">
              <strong>Organized</strong>
              <span>Manage your archive and track files in one place</span>
            </div>
          </div>
        </section>

        <section className="login-card-shell">
          <div className="login-card">
            <div className="login-header">
              <p className="login-eyebrow">Welcome back</p>
              <h2>Sign in</h2>
              <p className="login-subtitle">Enter your details to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="cin_number">National ID number</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
                      <path d="M8 10h8" />
                      <path d="M8 14h4" />
                    </svg>
                  </span>
                  <input
                    id="cin_number"
                    type="text"
                    name="cin_number"
                    placeholder="Enter your ID number (8 digits)"
                    value={formData.cin_number}
                    onChange={handleChange}
                    maxLength="8"
                    required />
                  
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                      <path d="M6 11.5A2.5 2.5 0 0 1 8.5 9h7A2.5 2.5 0 0 1 18 11.5v6a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 17.5v-6Z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required />
                  
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error &&
              <div className="login-error-message">
                  <span className="login-error-dot"></span>
                  <p>{error}</p>
                </div>
              }

              <div className="login-form-options">
                <label className="login-checkbox">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="login-link-muted">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="login-submit-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <Link to="/" className="login-ocr-button">
                Return to OCR sign in
              </Link>

              <div className="login-footer">
                Don&apos;t have an account? <Link to="/">Create a new account</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>);

};

export default Login;
