// src/components/Auth/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cin_number: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    const result = await register({
      cin_number: formData.cin_number,
      email: formData.email,
      username: formData.username,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/verify-email', { state: { email: formData.email } });
    } else {
      setError(result.error);
    }
    setLoading(false);
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
              <span className="logo-icon">🏛️</span>
              <h2>SmartArchive</h2>
            </div>
            <p className="auth-subtitle">Create a new account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>National ID number</label>
              <div className="input-icon">
                <span className="icon">🆔</span>
                <input
                  type="text"
                  name="cin_number"
                  placeholder="Enter your ID number (8 digits)"
                  value={formData.cin_number}
                  onChange={handleChange}
                  maxLength="8"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Email address</label>
              <div className="input-icon">
                <span className="icon">📧</span>
                <input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Username</label>
              <div className="input-icon">
                <span className="icon">👤</span>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-icon">
                <span className="icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm password</label>
              <div className="input-icon">
                <span className="icon">🔒</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
