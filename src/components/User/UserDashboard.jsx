// components/User/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { documents } from '../../services/api';
import '../styles/user.css';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processedToday: 0,
    pendingDocuments: 0,
    accuracy: 98.5
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const historyResponse = await documents.getHistory();
      setRecentDocuments(historyResponse.data.slice(0, 5));
      
      const statsResponse = await documents.getStats();
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const activityPercent = Math.min(
    100,
    Math.round(
      ((stats.processedToday || 0) / Math.max(stats.totalDocuments || 1, 1)) * 100
    )
  );

  const StatCard = ({ icon, title, value, trend, tone }) => (
    <div className={`dashboard-stat-card ${tone}`}>
      <div className="dashboard-stat-icon">{icon}</div>
      <div className="stat-card-info">
        <p>{title}</p>
        <h3>{value}</h3>
        {trend && (
          <span className={`dashboard-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="user-dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-badge">Personal Archive Hub</span>
          <h1>Welcome back, {user?.username || 'SmartArchive User'}</h1>
          <p>
            A cleaner and faster workspace to track your documents, upload new
            files, and reach the actions you use most from one place.
          </p>

          <div className="dashboard-hero-actions">
            <Link to="/upload" className="dashboard-primary-link">
              Upload new document
            </Link>
            <Link to="/documents" className="dashboard-secondary-link">
              View full history
            </Link>
          </div>
        </div>

        <div className="dashboard-hero-panel">
          <div className="dashboard-date-chip">{todayLabel}</div>
          <div className="dashboard-progress-card">
            <div className="dashboard-progress-header">
              <span>Today&apos;s activity</span>
              <strong>{activityPercent}%</strong>
            </div>
            <div className="dashboard-progress-bar">
              <span style={{ width: `${activityPercent}%` }}></span>
            </div>
            <div className="dashboard-progress-meta">
              <div>
                <strong>{stats.processedToday}</strong>
                <span>Processed documents</span>
              </div>
              <div>
                <strong>{stats.pendingDocuments}</strong>
                <span>Pending documents</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <span className="dashboard-section-kicker">Overview</span>
            <h2>Quick overview</h2>
          </div>
        </div>

        <div className="dashboard-stats-grid">
        <StatCard 
          icon="📄"
          title="Total documents" 
          value={stats.totalDocuments}
          trend={12}
          tone="tone-blue"
        />
        <StatCard 
          icon="✅" 
          title="Processed today" 
          value={stats.processedToday}
          trend={8}
          tone="tone-green"
        />
        <StatCard 
          icon="⏳" 
          title="In progress" 
          value={stats.pendingDocuments}
          trend={-3}
          tone="tone-amber"
        />
        <StatCard 
          icon="🎯" 
          title="Extraction accuracy" 
          value={`${stats.accuracy}%`}
          trend={2}
          tone="tone-rose"
        />
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <span className="dashboard-section-kicker">Actions</span>
            <h2>Quick actions</h2>
          </div>
        </div>

        <div className="dashboard-actions-grid">
          <Link to="/upload" className="dashboard-action-card action-upload">
            <div className="dashboard-action-icon">↗</div>
            <h3>Upload new document</h3>
            <p>Upload your identity document and extract data automatically</p>
            <span className="dashboard-action-link">Start upload</span>
          </Link>
          <Link to="/documents" className="dashboard-action-card action-documents">
            <div className="dashboard-action-icon">▤</div>
            <h3>Document history</h3>
            <p>Review all documents you uploaded previously</p>
            <span className="dashboard-action-link">Open history</span>
          </Link>
          <Link to="/profile" className="dashboard-action-card action-profile">
            <div className="dashboard-action-icon">◌</div>
            <h3>Profile</h3>
            <p>Update your personal details and account settings</p>
            <span className="dashboard-action-link">Edit profile</span>
          </Link>
          <Link to="/my-cin" className="dashboard-action-card action-cin">
            <div className="dashboard-action-icon">ID</div>
            <h3>My ID</h3>
            <p>View the identity card information linked to your account</p>
            <span className="dashboard-action-link">View ID</span>
          </Link>
        </div>
      </section>

      <section className="dashboard-section dashboard-documents-section">
        <div className="dashboard-section-head">
          <div>
            <span className="dashboard-section-kicker">Recent Activity</span>
            <h2>Recent documents</h2>
          </div>
          <Link to="/documents" className="dashboard-inline-link">
            View all
          </Link>
        </div>

        {recentDocuments.length > 0 ? (
          <div className="dashboard-document-list">
            {recentDocuments.map((doc, index) => (
              <div className="dashboard-document-row" key={doc.id || doc._id || index}>
                <div className="dashboard-document-main">
                  <div className="dashboard-document-icon">DOC</div>
                  <div>
                    <h3>{doc.filename || 'Untitled document'}</h3>
                    <p>{new Date(doc.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                <div className="dashboard-document-side">
                  <span className={`dashboard-status-badge status-${doc.status}`}>
                    {doc.status === 'processed' ? 'Processed' : 'Pending'}
                  </span>
                  <Link to="/documents" className="dashboard-row-link">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">+</div>
            <h3>No documents uploaded yet</h3>
            <p>Upload your first document and your latest activity will appear here.</p>
            <Link to="/upload" className="dashboard-primary-link">
              Upload new document
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserDashboard;
