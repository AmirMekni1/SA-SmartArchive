import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save, Shield, UserRound, UserRoundX } from 'lucide-react';
import { admin } from '../../services/api';
import './UserDetails.css';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await admin.getUserById(id);
        setUser(response.data || null);
        setForm(response.data || {});
      } catch (error) {
        console.error('Failed to load user details', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await admin.updateUser(id, form);
      setUser(form);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save user profile', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleVerification = async () => {
    if (!user) {
      return;
    }
    try {
      const next = !user.is_verified;
      await admin.updateUser(id, { is_verified: next });
      setUser((previous) => ({ ...previous, is_verified: next }));
      setForm((previous) => ({ ...previous, is_verified: next }));
    } catch (error) {
      console.error('Failed to toggle verification', error);
    }
  };

  if (loading) {
    return <div className="admin-page"><p className="admin-loading-note">Loading user details...</p></div>;
  }

  if (!user) {
    return (
      <div className="admin-page admin-user-details-page">
        <p className="admin-loading-note">User not found.</p>
      </div>);

  }

  return (
    <div className="admin-page admin-user-details-page">
      <header className="admin-page-header">
        <button type="button" className="admin-btn admin-btn-muted" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={16} />
          Back To Users
        </button>
      </header>

      <section className="admin-user-card admin-glass">
        <div className="admin-user-top">
          <span className="admin-user-avatar large">{user.username?.slice(0, 1)?.toUpperCase() || 'U'}</span>
          <div>
            <h1>{user.username || 'Unknown User'}</h1>
            <p>{user.email || '-'}</p>
            <div className="admin-row-actions compact">
              <span className={`admin-pill ${user.is_verified ? 'admin-pill-success' : 'admin-pill-warning'}`}>
                {user.is_verified ? 'Verified Account' : 'Pending Verification'}
              </span>
              <span className={`admin-pill ${user.role === 'admin' ? 'admin-pill-accent' : 'admin-pill-muted'}`}>
                {user.role || 'user'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-row-actions">
          <button type="button" className="admin-btn admin-btn-muted" onClick={() => setEditMode((prev) => !prev)}>
            <UserRound size={16} />
            {editMode ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={toggleVerification}>
            {user.is_verified ? <UserRoundX size={16} /> : <CheckCircle2 size={16} />}
            {user.is_verified ? 'Mark As Pending' : 'Verify Account'}
          </button>
        </div>
      </section>

      <section className="admin-user-details-grid">
        <article className="admin-glass admin-info-list">
          <h3>Identity</h3>
          <p>
            <strong>CIN:</strong> {user.cin_number || '-'}
          </p>
          <p>
            <strong>Phone:</strong> {user.phone || '-'}
          </p>
          <p>
            <strong>Address:</strong> {user.address || '-'}
          </p>
          <p>
            <strong>Created:</strong> {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
          </p>
          <p>
            <strong>Last Login:</strong> {user.last_login ? new Date(user.last_login).toLocaleString() : '-'}
          </p>
          <div className="admin-callout">
            <Shield size={16} />
            User security state is synchronized with latest role and verification flags.
          </div>
        </article>

        <article className="admin-glass admin-user-form-card">
          <h3>Profile Editor</h3>
          <form onSubmit={saveProfile} className="admin-settings-group">
            <label>
              Username
              <input
                value={form.username || ''}
                onChange={(event) => updateField('username', event.target.value)}
                disabled={!editMode} />
              
            </label>
            <label>
              Email
              <input
                value={form.email || ''}
                onChange={(event) => updateField('email', event.target.value)}
                disabled={!editMode} />
              
            </label>
            <label>
              Role
              <select value={form.role || 'user'} onChange={(event) => updateField('role', event.target.value)} disabled={!editMode}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={!editMode || saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </article>
      </section>
    </div>);

};

export default UserDetails;
