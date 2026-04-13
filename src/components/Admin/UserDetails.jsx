// src/components/Admin/UserDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admin } from '../../services/api';
import './UserDetails.css';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await admin.getUserById(id);
      setUser(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await admin.updateUser(id, formData);
      setEditing(false);
      fetchUser();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await admin.updateUser(id, { is_verified: !user.is_verified });
      fetchUser();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (!user) {
    return <div className="error">المستخدم غير موجود</div>;
  }

  return (
    <div className="user-details">
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate('/admin/users')}>
          ← العودة إلى القائمة
        </button>
        <h1>تفاصيل المستخدم</h1>
      </div>

      <div className="details-content">
        <div className="user-info-card">
          <div className="user-avatar-large">
            {user.username?.charAt(0) || '👤'}
          </div>
          <div className="user-basic-info">
            <h2>{user.username}</h2>
            <p>رقم البطاقة: <strong>{user.cin_number}</strong></p>
            <p>البريد الإلكتروني: {user.email}</p>
            <div className="user-status">
              <span className={`status-badge ${user.is_verified ? 'status-verified' : 'status-pending'}`}>
                {user.is_verified ? 'حساب موثق' : 'حساب غير موثق'}
              </span>
              <span className={`role-badge role-${user.role}`}>
                {user.role === 'admin' ? 'مسؤول' : 'مستخدم عادي'}
              </span>
            </div>
          </div>
        </div>

        <div className="details-actions">
          <button className="btn-edit" onClick={() => setEditing(!editing)}>
            {editing ? 'إلغاء التعديل' : '✏️ تعديل البيانات'}
          </button>
          <button className="btn-toggle" onClick={handleToggleStatus}>
            {user.is_verified ? '🔒 تعطيل الحساب' : '✅ تفعيل الحساب'}
          </button>
        </div>

        {editing ? (
          <form className="edit-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>اسم المستخدم</label>
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>رقم الهاتف</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>العنوان</label>
              <textarea
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>الدور</label>
              <select name="role" value={formData.role || 'user'} onChange={handleInputChange}>
                <option value="user">مستخدم</option>
                <option value="admin">مسؤول</option>
              </select>
            </div>
            <button type="submit" className="btn-save">حفظ التغييرات</button>
          </form>
        ) : (
          <div className="user-details-info">
            <h3>معلومات إضافية</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>تاريخ التسجيل:</label>
                <span>{new Date(user.created_at).toLocaleDateString('ar-TN')}</span>
              </div>
              <div className="info-item">
                <label>آخر تسجيل دخول:</label>
                <span>{user.last_login ? new Date(user.last_login).toLocaleDateString('ar-TN') : 'لم يسجل دخول بعد'}</span>
              </div>
              <div className="info-item">
                <label>عدد المستندات:</label>
                <span>{user.documents_count || 0}</span>
              </div>
              <div className="info-item">
                <label>آخر نشاط:</label>
                <span>{user.last_activity ? new Date(user.last_activity).toLocaleDateString('ar-TN') : 'لا يوجد نشاط'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetails;