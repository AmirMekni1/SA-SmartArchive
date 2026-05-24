import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Download, FileText, ShieldCheck, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { admin, documents } from '../../services/api';
import './DocumentDetails.css';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
};

const formatBytes = (value) => {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const converted = size / 1024 ** power;
  return `${converted.toFixed(converted >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
};

const buildApiDownloadUrl = (id) => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
  const token = localStorage.getItem('token');
  if (!token) {
    return `${base}/documents/${id}`;
  }

  const url = new URL(`${base}/documents/${id}`);
  url.searchParams.set('token', token);
  return url.toString();
};

const resolveDocumentUrl = (doc, id) => {
  const directUrl = doc?.file_url || doc?.url || doc?.download_url || doc?.path;
  if (directUrl) {
    return directUrl;
  }
  return buildApiDownloadUrl(id);
};

const AdminDocumentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);
  const [editPayload, setEditPayload] = useState({ extracted_data: '{}', full_text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Missing document identifier.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await documents.getById(id);
        const payload = response?.data || null;
        setDoc(payload);
        setEditPayload({
          extracted_data: JSON.stringify(payload?.extracted_data || {}, null, 2),
          full_text: payload?.full_text || ''
        });
      } catch (requestError) {
        console.error('Failed to load document details', requestError);
        setError('Unable to load document details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const previewUrl = useMemo(() => resolveDocumentUrl(doc, id), [doc, id]);

  const openPreview = () => {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const saveExtractionEdits = async () => {
    if (!doc?.id) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const parsedEntities = JSON.parse(editPayload.extracted_data || '{}');
      const response = await documents.updateEntities(doc.id, {
        extracted_data: parsedEntities,
        full_text: editPayload.full_text
      });
      const updated = response?.data?.document;
      if (updated) {
        setDoc((previous) => ({ ...previous, ...updated, id: previous?.id || updated?._id }));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Failed to save edits. Verify JSON format.');
    } finally {
      setSaving(false);
    }
  };

  const reviewDocument = async (status) => {
    if (!doc?.id) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await admin.reviewDocument(doc.id, {
        status,
        review_note: `Document marked as ${status} by admin`
      });
      const updated = response?.data?.document;
      if (updated) {
        setDoc((previous) => ({ ...previous, ...updated, id: previous?.id || updated?._id }));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Failed to update review status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page admin-document-details-page">
      <header className="admin-page-header admin-document-details-header">
        <div>
          <span className="admin-eyebrow">Document Inspection</span>
          <h1>Document Details</h1>
          <p>Review metadata and open the underlying file for manual verification.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-muted" onClick={() => navigate('/admin/documents')}>
          <ArrowLeft size={16} />
          Back to documents
        </button>
      </header>

      {loading &&
      <section className="admin-glass admin-document-details-card">
          <p className="admin-empty-line">Loading document details...</p>
        </section>
      }

      {!loading && error &&
      <section className="admin-glass admin-document-details-card">
          <p className="admin-document-error">{error}</p>
          <Link to="/admin/documents" className="admin-btn admin-btn-primary admin-inline-link">
            Go back
          </Link>
        </section>
      }

      {!loading && !error && doc &&
      <section className="admin-document-details-grid">
          <article className="admin-glass admin-document-details-card">
            <h2>
              <FileText size={18} />
              {doc.filename || doc.original_name || `Document #${id}`}
            </h2>

            <div className="admin-document-meta-grid">
              <div>
                <strong>Status</strong>
                <span className={`admin-pill ${String(doc.status).toLowerCase() === 'processed' ? 'admin-pill-success' : 'admin-pill-warning'}`}>
                  {doc.status || 'pending'}
                </span>
              </div>
              <div>
                <strong>Quality Score</strong>
                <span className={`admin-pill ${(doc.quality_score || 0) >= 50 ? 'admin-pill-success' : 'admin-pill-danger'}`}>
                  {doc.quality_score || 0}%
                </span>
              </div>
              <div>
                <strong>Type</strong>
                <span>{doc.type || 'Unknown'}</span>
              </div>
              <div>
                <strong>Owner</strong>
                <span className="admin-document-inline-icon"><User size={14} /> {doc.username || '-'}</span>
              </div>
              <div>
                <strong>CIN</strong>
                <span>{doc.cin_number || '-'}</span>
              </div>
              <div>
                <strong>Uploaded</strong>
                <span className="admin-document-inline-icon"><CalendarDays size={14} /> {formatDate(doc.created_at || doc.uploaded_at)}</span>
              </div>
              <div>
                <strong>Size</strong>
                <span>{doc.file_size ? formatBytes(doc.file_size) : doc.size || '-'}</span>
              </div>
              <div>
                <strong>Language</strong>
                <span>{doc.detected_language || 'unknown'}</span>
              </div>
            </div>

            <div className="admin-document-actions">
              <button type="button" className="admin-btn admin-btn-primary" onClick={openPreview}>
                <Download size={16} />
                Open File
              </button>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-muted admin-inline-link">
                Direct Link
              </a>
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => reviewDocument('verified')} disabled={saving}>
                Mark Verified
              </button>
              <button type="button" className="admin-btn admin-btn-muted" onClick={() => reviewDocument('rejected')} disabled={saving}>
                Mark Rejected
              </button>
            </div>
          </article>

          <article className="admin-glass admin-document-details-card">
            <h2>
              <ShieldCheck size={18} />
              Verification Notes
            </h2>
            <p className="admin-document-note">
              Manual review helps confirm OCR output and final validation decisions. If the file fails to open, verify backend
              permissions for the document endpoint.
            </p>
            <h3>Editable Extracted Entities</h3>
            <textarea
            className="admin-document-editarea"
            value={editPayload.extracted_data}
            onChange={(event) => setEditPayload((previous) => ({ ...previous, extracted_data: event.target.value }))}
            rows={12} />
          
            <h3>Editable OCR Text</h3>
            <textarea
            className="admin-document-editarea"
            value={editPayload.full_text}
            onChange={(event) => setEditPayload((previous) => ({ ...previous, full_text: event.target.value }))}
            rows={8} />
          
            <button type="button" className="admin-btn admin-btn-primary" onClick={saveExtractionEdits} disabled={saving}>
              {saving ? 'Saving...' : 'Save Extraction Changes'}
            </button>
            <pre className="admin-document-json">{JSON.stringify(doc, null, 2)}</pre>
          </article>
        </section>
      }
    </div>);

};

export default AdminDocumentDetails;
