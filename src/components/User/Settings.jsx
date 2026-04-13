import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    emailUploads: true,
    emailVerifications: true,
    emailSecurity: true,
    pushNotifications: false
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true
  });
  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'en'
  });

  // Mock data loading
  useEffect(() => {
    const mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+216 12 345 678'
    };
    setProfileData(mockProfile);
  }, []);

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      showMessage('Profile updated successfully!');
    }, 1000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 1000);
  };

  const handleNotificationChange = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    showMessage('Notification preferences updated');
  };

  const handlePrivacyChange = (key, value) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    showMessage('Privacy settings updated');
  };

  const handleAppearanceChange = (key, value) => {
    setAppearance(prev => ({ ...prev, [key]: value }));
    showMessage('Appearance settings updated');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' }
  ];

  return (
    <div className="settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your account preferences and settings</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-content">
          <div className="settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-panel">
            {activeTab === 'profile' && (
              <div className="panel-section">
                <h2 className="panel-title">Profile Information</h2>
                <p className="panel-description">Update your personal information and contact details.</p>

                <form onSubmit={handleProfileSubmit} className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <button type="submit" className="save-btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="panel-section">
                <h2 className="panel-title">Security Settings</h2>
                <p className="panel-description">Manage your password and account security.</p>

                <form onSubmit={handlePasswordSubmit} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <button type="submit" className="save-btn" disabled={loading}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>

                <div className="security-section">
                  <h3>Two-Factor Authentication</h3>
                  <p>Enable 2FA for additional security.</p>
                  <button className="enable-2fa-btn">Enable 2FA</button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="panel-section">
                <h2 className="panel-title">Notification Preferences</h2>
                <p className="panel-description">Choose how you want to be notified about account activity.</p>

                <div className="notification-settings">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Email Notifications</h4>
                      <p>Receive emails about uploads and verifications</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifications.emailUploads}
                        onChange={(e) => handleNotificationChange('emailUploads', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Verification Alerts</h4>
                      <p>Get notified when documents are verified</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifications.emailVerifications}
                        onChange={(e) => handleNotificationChange('emailVerifications', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Security Alerts</h4>
                      <p>Important security notifications</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifications.emailSecurity}
                        onChange={(e) => handleNotificationChange('emailSecurity', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Push Notifications</h4>
                      <p>Receive push notifications in your browser</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="panel-section">
                <h2 className="panel-title">Privacy Settings</h2>
                <p className="panel-description">Control your data privacy and sharing preferences.</p>

                <div className="privacy-settings">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Profile Visibility</h4>
                      <p>Who can see your profile information</p>
                    </div>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                      className="privacy-select"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Data Sharing</h4>
                      <p>Share anonymized data for service improvement</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={privacy.dataSharing}
                        onChange={(e) => handlePrivacyChange('dataSharing', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Analytics</h4>
                      <p>Help improve our service with usage analytics</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={privacy.analytics}
                        onChange={(e) => handlePrivacyChange('analytics', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="panel-section">
                <h2 className="panel-title">Appearance Settings</h2>
                <p className="panel-description">Customize the look and feel of your dashboard.</p>

                <div className="appearance-settings">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Theme</h4>
                      <p>Choose your preferred color scheme</p>
                    </div>
                    <select
                      value={appearance.theme}
                      onChange={(e) => handleAppearanceChange('theme', e.target.value)}
                      className="appearance-select"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Language</h4>
                      <p>Select your preferred language</p>
                    </div>
                    <select
                      value={appearance.language}
                      onChange={(e) => handleAppearanceChange('language', e.target.value)}
                      className="appearance-select"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
