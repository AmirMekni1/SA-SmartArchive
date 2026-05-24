import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Shield, Trash2, UserCog, Users, UserX } from 'lucide-react';
import { admin } from '../../services/api';
import FilterPanel from './FilterPanel';
import ProTable from './ProTable';
import './UsersList.css';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString();
};

const UsersManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ role: 'all', status: 'all' });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await admin.getAllUsers();
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load users', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery =
      !query ||
      user.username?.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase()) ||
      user.cin_number?.includes(query);

      const matchesRole = filters.role === 'all' || user.role === filters.role;

      const matchesStatus =
      filters.status === 'all' ||
      filters.status === 'verified' && user.is_verified ||
      filters.status === 'pending' && !user.is_verified;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [filters.role, filters.status, query, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const verified = users.filter((user) => user.is_verified).length;
    const admins = users.filter((user) => user.role === 'admin').length;
    return {
      total,
      verified,
      admins,
      pending: Math.max(total - verified, 0)
    };
  }, [users]);

  const removeUser = async (event, userId) => {
    event.stopPropagation();
    if (!window.confirm('Delete this user account permanently?')) {
      return;
    }
    try {
      await admin.deleteUser(userId);
      setUsers((previous) => previous.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  const toggleVerification = async (event, user) => {
    event.stopPropagation();
    try {
      await admin.updateUser(user.id, { is_verified: !user.is_verified });
      setUsers((previous) =>
      previous.map((item) =>
      item.id === user.id ? { ...item, is_verified: !item.is_verified } : item
      )
      );
    } catch (error) {
      console.error('Failed to update verification', error);
    }
  };

  const columns = [
  {
    key: 'username',
    label: 'User',
    render: (_, row) =>
    <div className="admin-cell-user">
					<span className="admin-user-avatar">{row.username?.slice(0, 1)?.toUpperCase() || 'U'}</span>
					<div>
						<strong>{row.username || 'Unknown'}</strong>
						<small>{row.email || '-'}</small>
					</div>
				</div>

  },
  {
    key: 'cin_number',
    label: 'CIN',
    render: (value) => <span className="admin-pill admin-pill-muted">{value || '-'}</span>
  },
  {
    key: 'role',
    label: 'Role',
    render: (value) =>
    <span className={`admin-pill ${value === 'admin' ? 'admin-pill-accent' : 'admin-pill-muted'}`}>
					{value || 'user'}
				</span>

  },
  {
    key: 'is_verified',
    label: 'Status',
    render: (value) =>
    <span className={`admin-pill ${value ? 'admin-pill-success' : 'admin-pill-warning'}`}>
					{value ? 'Verified' : 'Pending'}
				</span>

  },
  {
    key: 'created_at',
    label: 'Created',
    render: (value) => formatDate(value)
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    align: 'right',
    render: (_, row) =>
    <div className="admin-row-actions">
					<button type="button" className="admin-icon-btn" onClick={(event) => toggleVerification(event, row)}>
						<CheckCircle2 size={16} />
					</button>
					<button
        type="button"
        className="admin-icon-btn"
        onClick={(event) => {
          event.stopPropagation();
          navigate(`/admin/users/${row.id}`);
        }}>
        
						<UserCog size={16} />
					</button>
					<button
        type="button"
        className="admin-icon-btn admin-icon-btn-danger"
        onClick={(event) => removeUser(event, row.id)}>
        
						<Trash2 size={16} />
					</button>
				</div>

  }];


  return (
    <div className="admin-page users-management-page">
			<header className="admin-page-header">
				<div>
					<span className="admin-eyebrow">Admin Control</span>
					<h1>Users Management</h1>
					<p>Moderate identities, permissions, and verification lifecycle in one command center.</p>
				</div>
			</header>

			<section className="admin-stats-grid">
				<article className="admin-stat-card" style={{ '--delay': '0.05s' }}>
					<Users size={20} />
					<h3>{stats.total}</h3>
					<p>Total users</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.1s' }}>
					<CheckCircle2 size={20} />
					<h3>{stats.verified}</h3>
					<p>Verified</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.15s' }}>
					<UserX size={20} />
					<h3>{stats.pending}</h3>
					<p>Pending verification</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.2s' }}>
					<Shield size={20} />
					<h3>{stats.admins}</h3>
					<p>Administrators</p>
				</article>
			</section>

			<FilterPanel
        query={query}
        onQueryChange={setQuery}
        filters={[
        {
          key: 'role',
          label: 'Role',
          options: [
          { label: 'All roles', value: 'all' },
          { label: 'User', value: 'user' },
          { label: 'Admin', value: 'admin' }]

        },
        {
          key: 'status',
          label: 'Status',
          options: [
          { label: 'All status', value: 'all' },
          { label: 'Verified', value: 'verified' },
          { label: 'Pending', value: 'pending' }]

        }]
        }
        values={filters}
        onValueChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
        onReset={() => {
          setQuery('');
          setFilters({ role: 'all', status: 'all' });
        }}
        loading={loading}
        placeholder="Search by CIN, username, or email" />
      

			<ProTable
        data={filteredUsers}
        columns={columns}
        loading={loading}
        pageSize={8}
        emptyText="No users matched your filters"
        exportName="users-report"
        onRowClick={(row) => navigate(`/admin/users/${row.id}`)} />
      
		</div>);

};

export default UsersManagement;
