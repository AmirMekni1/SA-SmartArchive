import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    bio: '',
    avatar: null
  });

  const [stats] = useState({
    documentsUploaded: 12,
    documentsVerified: 8,
    accountAge: '6 months',
    lastLogin: '2 hours ago'
  });

  const [recentActivity] = useState([
    { id: 1, action: 'Uploaded CIN document', date: '2024-01-15', status: 'verified' },
    { id: 2, action: 'Updated profile information', date: '2024-01-10', status: 'completed' },
    { id: 3, action: 'Downloaded passport copy', date: '2024-01-05', status: 'completed' },
    { id: 4, action: 'Account verification completed', date: '2024-01-01', status: 'verified' }
  ]);

  // Mock data loading
  useEffect(() => {
    const mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+216 12 345 678',
      dateOfBirth: '1990-05-15',
      address: '123 Main St, Tunis, Tunisia',
      bio: 'Security-conscious individual focused on document management and digital identity.',
      avatar: null
    };
    setProfileData(mockProfile);
  }, []);

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({ ...prev, avatar: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setIsEditing(false);
      showMessage('Profile updated successfully!');
    }, 1000);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
    showMessage('Changes cancelled');
  };

  const calculateProfileCompleteness = () => {
    const fields = Object.values(profileData);
    const filledFields = fields.filter(field => field && field.toString().trim() !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#43e97b';
      case 'completed': return '#667eea';
      case 'pending': return '#f093fb';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const completeness = calculateProfileCompleteness();

  return (
    <div className="user-profile">
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-subtitle">Manage your personal information and account details</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-content">
          {/* Profile Header Card */}
          <div className="profile-card profile-header-card">
            <div className="profile-avatar-section">
              <div className="avatar-container">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt="Profile" className="profile-avatar" />
                ) : (
                  <div className="default-avatar">
                    {profileData.firstName?.[0]}{profileData.lastName?.[0]}
                  </div>
                )}
                {isEditing && (
                  <label className="avatar-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </label>
                )}
              </div>
              <div className="profile-basic-info">
                <h2 className="profile-name">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <p className="profile-email">{profileData.email}</p>
                <div className="profile-completeness">
                  <div className="completeness-bar">
                    <div
                      className="completeness-fill"
                      style={{ width: `${completeness}%` }}
                    ></div>
                  </div>
                  <span className="completeness-text">{completeness}% Complete</span>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              {!isEditing ? (
                <button
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    className="cancel-btn"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-grid">
            {/* Personal Information */}
            <div className="profile-card">
              <h3 className="card-title">Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{profileData.firstName || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{profileData.lastName || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{profileData.email || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{profileData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">
                      {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{profileData.address || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>Bio</label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows="3"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="field-value">{profileData.bio || 'No bio provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="profile-card">
              <h3 className="card-title">Account Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{stats.documentsUploaded}</div>
                  <div className="stat-label">Documents Uploaded</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.documentsVerified}</div>
                  <div className="stat-label">Documents Verified</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.accountAge}</div>
                  <div className="stat-label">Account Age</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.lastLogin}</div>
                  <div className="stat-label">Last Login</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="profile-card">
              <h3 className="card-title">Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-content">
                      <p className="activity-action">{activity.action}</p>
                      <p className="activity-date">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                    <span
                      className="activity-status"
                      style={{ backgroundColor: getStatusColor(activity.status) }}
                    >
                      {getStatusText(activity.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
