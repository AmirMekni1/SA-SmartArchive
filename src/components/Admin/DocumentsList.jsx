// src/components/Admin/DocumentsList.jsx
import React, { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import './DocumentsList.css';

const DocumentsList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await admin.getAllDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      try {
        await admin.deleteDocument(id);
        fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (searchTerm && !doc.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="documents-list">
      <div className="documents-header">
        <h1>📄 إدارة المستندات</h1>
        <p>عرض وإدارة جميع المستندات المرفوعة من قبل المستخدمين</p>
      </div>

      <div className="documents-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 بحث باسم الملف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">جميع الحالات</option>
            <option value="processed">تمت المعالجة</option>
            <option value="pending">قيد المعالجة</option>
            <option value="failed">فشلت</option>
          </select>
        </div>
      </div>

      <div className="documents-grid">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="document-card">
            <div className="document-card-header">
              <div className="document-type">
                {doc.type === 'image' ? '🖼️' : '📄'}
              </div>
              <div className="document-user">
                <strong>{doc.username}</strong>
                <small>{doc.cin_number}</small>
              </div>
            </div>
            <div className="document-card-body">
              <h3>{doc.filename}</h3>
              <p className="document-date">
                {new Date(doc.created_at).toLocaleDateString('ar-TN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <div className="document-status">
                <span className={`status-badge status-${doc.status}`}>
                  {doc.status === 'processed' ? '✅ تمت المعالجة' : 
                   doc.status === 'pending' ? '⏳ قيد المعالجة' : '❌ فشلت'}
                </span>
              </div>
              {doc.extracted_data && (
                <div className="document-extracted">
                  <p><strong>رقم البطاقة:</strong> {doc.extracted_data.cin_number || '---'}</p>
                  <p><strong>الاسم:</strong> {doc.extracted_data.first_name || '---'}</p>
                </div>
              )}
            </div>
            <div className="document-card-footer">
              <button className="btn-view" onClick={() => window.open(`/documents/${doc.id}`, '_blank')}>
                عرض
              </button>
              <button className="btn-delete" onClick={() => handleDelete(doc.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="no-results">
          <p>لا توجد مستندات مطابقة للبحث</p>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;