// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    verifiedUsers: 0,
    pendingVerifications: 0,
    documentsToday: 0,
    usersThisMonth: 0,
    recentUsers: [],
    recentDocuments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await admin.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, color }) => (
    <div className="admin-stat-card" style={{ borderTopColor: color }}>
      <div className="admin-stat-icon" style={{ background: color }}>{icon}</div>
      <div className="admin-stat-info">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>لوحة تحكم المسؤول</h1>
        <p>مرحباً بك في لوحة التحكم، يمكنك إدارة النظام بالكامل من هنا</p>
      </div>

      <div className="admin-stats-grid">
        <StatCard 
          icon="👥" 
          title="إجمالي المستخدمين" 
          value={statistics.totalUsers}
          color="#4361ee"
        />
        <StatCard 
          icon="✅" 
          title="المستخدمين الموثقين" 
          value={statistics.verifiedUsers}
          color="#06d6a0"
        />
        <StatCard 
          icon="⏳" 
          title="بانتظار التأكيد" 
          value={statistics.pendingVerifications}
          color="#ffd166"
        />
        <StatCard 
          icon="📄" 
          title="إجمالي المستندات" 
          value={statistics.totalDocuments}
          color="#f72585"
        />
        <StatCard 
          icon="📈" 
          title="مستندات اليوم" 
          value={statistics.documentsToday}
          color="#118ab2"
        />
        <StatCard 
          icon="📊" 
          title="مستخدمين جدد هذا الشهر" 
          value={statistics.usersThisMonth}
          color="#2ecc71"
        />
      </div>

      <div className="admin-sections">
        <div className="admin-section">
          <h2>آخر المستخدمين المسجلين</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>رقم البطاقة</th>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>تاريخ التسجيل</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {statistics.recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.cin_number}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{new Date(user.created_at).toLocaleDateString('ar-TN')}</td>
                  <td>
                    <span className={`status-badge ${user.is_verified ? 'status-verified' : 'status-pending'}`}>
                      {user.is_verified ? 'موثق' : 'غير موثق'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-view">عرض</button>
                    <button className="btn-edit">تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-section">
          <h2>آخر المستندات المرفوعة</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>اسم الملف</th>
                <th>المستخدم</th>
                <th>تاريخ الرفع</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {statistics.recentDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.filename}</td>
                  <td>{doc.username}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString('ar-TN')}</td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>
                      {doc.status === 'processed' ? 'تمت المعالجة' : 'قيد المعالجة'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-view">عرض</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions-grid">
          <div className="quick-action" onClick={() => window.location.href = '/admin/users'}>
            <div className="action-icon">👥</div>
            <h3>إدارة المستخدمين</h3>
            <p>عرض، تعديل، وحذف المستخدمين</p>
          </div>
          <div className="quick-action" onClick={() => window.location.href = '/admin/documents'}>
            <div className="action-icon">📄</div>
            <h3>إدارة المستندات</h3>
            <p>عرض جميع المستندات المرفوعة</p>
          </div>
          <div className="quick-action" onClick={() => window.location.href = '/admin/statistics'}>
            <div className="action-icon">📊</div>
            <h3>الإحصائيات</h3>
            <p>تقارير وإحصائيات مفصلة</p>
          </div>
          <div className="quick-action" onClick={() => window.location.href = '/admin/settings'}>
            <div className="action-icon">⚙️</div>
            <h3>إعدادات النظام</h3>
            <p>تكوين النظام وإعداداته</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;