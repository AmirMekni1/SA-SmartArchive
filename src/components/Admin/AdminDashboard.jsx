import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChartColumnBig, FileText, ShieldCheck, UserRoundCog, Users } from 'lucide-react';
import { admin, documents } from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResponse, usersResponse, docsResponse] = await Promise.all([
        admin.getStatistics(),
        admin.getAllUsers(),
        documents.getAll()]
        );

        const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const docs = Array.isArray(docsResponse.data) ? docsResponse.data : [];

        setStats(statsResponse.data || {});
        setRecentUsers(users.slice(0, 6));
        setRecentDocs(docs.slice(0, 6));
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const kpis = useMemo(
    () => [
    {
      label: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      tone: 'primary'
    },
    {
      label: 'Verified Users',
      value: stats.verifiedUsers || 0,
      icon: ShieldCheck,
      tone: 'success'
    },
    {
      label: 'Total Documents',
      value: stats.totalDocuments || 0,
      icon: FileText,
      tone: 'accent'
    },
    {
      label: 'Documents Today',
      value: stats.documentsToday || 0,
      icon: ChartColumnBig,
      tone: 'warning'
    }],

    [stats.documentsToday, stats.totalDocuments, stats.totalUsers, stats.verifiedUsers]
  );

  return (
    <div className="admin-page admin-dashboard">
      <header className="admin-hero admin-glass">
        <div>
          <span className="admin-eyebrow">Mission Control</span>
          <h1>Admin Dashboard</h1>
          <p>
            Centralize user governance, document flow, and system insights with a smooth command
            interface.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/users')}>
          <UserRoundCog size={16} />
          Manage Users
        </button>
      </header>

      <section className="admin-stats-grid">
        {kpis.map((item, index) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`admin-stat-card ${item.tone}`} style={{ '--delay': `${(index + 1) * 0.05}s` }}>
              <Icon size={20} />
              <h3>{item.value}</h3>
              <p>{item.label}</p>
            </article>);

        })}
      </section>

      <section className="admin-panels-grid">
        <article className="admin-panel admin-glass">
          <div className="admin-panel-head">
            <h2>Recent Users</h2>
            <button type="button" className="admin-text-btn" onClick={() => navigate('/admin/users')}>
              Open All <ArrowRight size={14} />
            </button>
          </div>

          <div className="admin-list">
            {recentUsers.map((user) =>
            <button
              type="button"
              key={user.id}
              className="admin-list-item"
              onClick={() => navigate(`/admin/users/${user.id}`)}>
              
                <span className="admin-user-avatar">{user.username?.slice(0, 1)?.toUpperCase() || 'U'}</span>
                <div>
                  <strong>{user.username || 'Unknown User'}</strong>
                  <small>{user.email || '-'}</small>
                </div>
                <span className={`admin-pill ${user.is_verified ? 'admin-pill-success' : 'admin-pill-warning'}`}>
                  {user.is_verified ? 'Verified' : 'Pending'}
                </span>
              </button>
            )}
            {!loading && recentUsers.length === 0 && <p className="admin-empty-line">No user activity found.</p>}
          </div>
        </article>

        <article className="admin-panel admin-glass">
          <div className="admin-panel-head">
            <h2>Recent Documents</h2>
            <button type="button" className="admin-text-btn" onClick={() => navigate('/admin/documents')}>
              Open All <ArrowRight size={14} />
            </button>
          </div>

          <div className="admin-list">
            {recentDocs.map((doc) =>
            <div key={doc.id} className="admin-list-item">
                <span className="admin-pill admin-pill-muted">{doc.type || 'file'}</span>
                <div>
                  <strong>{doc.filename || 'Untitled Document'}</strong>
                  <small>{doc.username || 'Unknown owner'}</small>
                </div>
                <span
                className={`admin-pill ${
                String(doc.status).toLowerCase() === 'processed' ?
                'admin-pill-success' :
                String(doc.status).toLowerCase() === 'failed' ?
                'admin-pill-danger' :
                'admin-pill-warning'}`
                }>
                
                  {doc.status || 'pending'}
                </span>
              </div>
            )}
            {!loading && recentDocs.length === 0 &&
            <p className="admin-empty-line">No document activity found.</p>
            }
          </div>
        </article>
      </section>
    </div>);

};

export default AdminDashboard;
