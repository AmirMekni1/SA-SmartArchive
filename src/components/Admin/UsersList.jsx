// src/components/Admin/UsersList.jsx
import React, { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import './UsersList.css';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await admin.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await admin.deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.cin_number.includes(searchTerm) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterStatus !== 'all') {
      const isVerified = user.is_verified;
      if (filterStatus === 'verified' && !isVerified) return false;
      if (filterStatus === 'pending' && isVerified) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="users-list">
      <div className="users-header">
        <h1>👥 إدارة المستخدمين</h1>
        <p>عرض وإدارة جميع المستخدمين المسجلين في المنصة</p>
      </div>

      <div className="users-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 بحث باسم المستخدم، رقم البطاقة أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">جميع الأدوار</option>
            <option value="user">مستخدم</option>
            <option value="admin">مسؤول</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">جميع الحالات</option>
            <option value="verified">موثق</option>
            <option value="pending">غير موثق</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>رقم البطاقة</th>
              <th>اسم المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>تاريخ التسجيل</th>
              <th>آخر تسجيل دخول</th>
              <th>الحالة</th>
              <th>الدور</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td className="cin-number">{user.cin_number}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{new Date(user.created_at).toLocaleDateString('ar-TN')}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleDateString('ar-TN') : '---'}</td>
                <td>
                  <span className={`status-badge ${user.is_verified ? 'status-verified' : 'status-pending'}`}>
                    {user.is_verified ? 'موثق' : 'غير موثق'}
                  </span>
                </td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="btn-icon" 
                    title="عرض التفاصيل"
                    onClick={() => window.location.href = `/admin/users/${user.id}`}
                  >
                    👁️
                  </button>
                  <button 
                    className="btn-icon" 
                    title="تعديل"
                    onClick={() => window.location.href = `/admin/users/${user.id}/edit`}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-icon delete" 
                    title="حذف"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-results">
          <p>لا توجد نتائج مطابقة للبحث</p>
        </div>
      )}
    </div>
  );
};

export default UsersList;