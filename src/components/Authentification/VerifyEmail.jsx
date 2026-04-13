// src/components/Auth/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const VerifyEmail = () => {
  const { verifyEmail, resendCode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await verifyEmail(email, code);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess('');
    
    const result = await resendCode(email);
    
    if (result.success) {
      setSuccess('A new verification code has been sent to your email');
      setCountdown(60);
    } else {
      setError(result.error);
    }
    setResending(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-decoration">
        <div className="decoration-shape shape-1"></div>
        <div className="decoration-shape shape-2"></div>
        <div className="decoration-shape shape-3"></div>
      </div>
      
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="logo-icon">✉️</span>
              <h2>SmartArchive</h2>
            </div>
            <p className="auth-subtitle">
              We sent a verification code to<br />
              <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>Verification code</label>
              <div className="input-icon">
                <span className="icon">🔢</span>
                <input
                  type="text"
                  placeholder="Enter the 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength="6"
                  required
                  className="verification-input"
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="success-message">
                <span>✅</span>
                <p>{success}</p>
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Confirm'}
            </button>

            <div className="resend-section">
              <button
                type="button"
                className="resend-link"
                onClick={handleResend}
                disabled={resending || countdown > 0}
              >
                {resending 
                  ? 'Sending...' 
                  : countdown > 0 
                    ? `Resend code (${countdown}s)` 
                    : 'Resend code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
