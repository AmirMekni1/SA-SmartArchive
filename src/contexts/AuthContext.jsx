// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
      setUser(response.data.user);
      setIsAdmin(response.data.user.role === 'admin');
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (cin_number, password) => {
    try {
      const response = await api.post('/auth/login', { cin_number, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setIsAdmin(response.data.user.role === 'admin');
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'An error occurred during sign in' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'An error occurred during registration' };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      const response = await api.post('/auth/verify-email', { email, code });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setIsAdmin(response.data.user.role === 'admin');
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Email verification failed' };
    }
  };

  const verifyCode = async (email, code) => {
    try {
      const response = await api.post('/auth/verify-code', { email, code });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        setIsAdmin(response.data.user.role === 'admin');
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Invalid verification code' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsAdmin(false);
    }
  };

  const resendCode = async (email) => {
    try {
      const response = await api.post('/auth/resend-code', { email });
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to resend the code' };
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      if (response.data.success) {
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to update the profile' };
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', { oldPassword, newPassword });
      return response.data;
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to change the password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        login,
        register,
        verifyEmail,
        verifyCode,
        logout,
        resendCode,
        updateProfile,
        changePassword,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
