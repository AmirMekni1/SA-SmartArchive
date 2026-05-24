import React, { useEffect, useMemo, useState } from 'react';
import { File, FileCheck2, FileWarning, Trash2 } from 'lucide-react';
import { admin, documents } from '../../services/api';
import FilterPanel from './FilterPanel';
import ProTable from './ProTable';
import './DocumentsList.css';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
};

const normalizeDocType = (value) => {
  if (!value) {
    return 'unknown';
  }
  return String(value).toLowerCase();
};

const DocumentsManagement = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'all', type: 'all' });

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documents.getAll();
        setDocs(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load documents', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
      !normalizedQuery ||
      doc.filename?.toLowerCase().includes(normalizedQuery) ||
      doc.username?.toLowerCase().includes(normalizedQuery) ||
      doc.cin_number?.includes(normalizedQuery);

      const matchesStatus = filters.status === 'all' || String(doc.status || '').toLowerCase() === filters.status;
      const matchesType = filters.type === 'all' || normalizeDocType(doc.type) === filters.type;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [docs, filters.status, filters.type, query]);

  const stats = useMemo(() => {
    const total = docs.length;
    const processed = docs.filter((doc) => String(doc.status).toLowerCase() === 'processed').length;
    const pending = docs.filter((doc) => String(doc.status).toLowerCase() === 'pending').length;
    return {
      total,
      processed,
      pending: Math.max(total - processed - docs.filter((doc) => String(doc.status).toLowerCase() === 'failed').length, pending),
      failed: docs.filter((doc) => String(doc.status).toLowerCase() === 'failed').length
    };
  }, [docs]);

  const deleteDocument = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm('Delete this document permanently?')) {
      return;
    }
    try {
      await documents.delete(id);
      setDocs((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete document', error);
    }
  };

  const verifyDocument = async (event, row) => {
    event.stopPropagation();
    try {
      await admin.reviewDocument(row.id, { status: 'verified', review_note: 'Quick verify from documents table' });
      setDocs((previous) =>
      previous.map((item) => item.id === row.id ? { ...item, status: 'verified', requires_admin_review: false } : item)
      );
    } catch (error) {
      console.error('Failed to verify document', error);
    }
  };

  const columns = [
  {
    key: 'filename',
    label: 'Document',
    render: (value, row) =>
    <div className="admin-doc-cell">
					<span className="admin-pill admin-pill-muted">{row.type || 'file'}</span>
					<div>
						<strong>{value || 'Untitled'}</strong>
						<small>{row.username || 'Unknown owner'}</small>
					</div>
				</div>

  },
  {
    key: 'status',
    label: 'Status',
    render: (value) => {
      const status = String(value || 'pending').toLowerCase();
      const className =
      status === 'processed' ?
      'admin-pill admin-pill-success' :
      status === 'failed' ?
      'admin-pill admin-pill-danger' :
      'admin-pill admin-pill-warning';
      return <span className={className}>{status}</span>;
    }
  },
  {
    key: 'cin_number',
    label: 'CIN',
    render: (value) => <span className="admin-pill admin-pill-muted">{value || '-'}</span>
  },
  {
    key: 'created_at',
    label: 'Uploaded At',
    render: (value) => formatDate(value)
  },
  {
    key: 'quality_score',
    label: 'Quality',
    render: (value) => {
      const score = Number(value) || 0;
      return (
        <span className={`admin-pill ${score >= 50 ? 'admin-pill-success' : 'admin-pill-danger'}`}>
						{score}%
					</span>);

    }
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    align: 'right',
    render: (_, row) =>
    <div className="admin-row-actions">
						{(Number(row.quality_score) || 0) < 50 ?
      <button type="button" className="admin-icon-btn" onClick={(event) => verifyDocument(event, row)}>
								<FileCheck2 size={16} />
							</button> :
      null}
					<button
        type="button"
        className="admin-icon-btn"
        onClick={(event) => {
          event.stopPropagation();
          window.open(`/admin/documents/${row.id}`, '_blank', 'noopener,noreferrer');
        }}>
        
						<File size={16} />
					</button>
					<button
        type="button"
        className="admin-icon-btn admin-icon-btn-danger"
        onClick={(event) => deleteDocument(event, row.id)}>
        
						<Trash2 size={16} />
					</button>
				</div>

  }];


  return (
    <div className="admin-page documents-management-page">
			<header className="admin-page-header">
				<div>
					<span className="admin-eyebrow">Archive Oversight</span>
					<h1>Documents Management</h1>
					<p>Track processing flow, maintain quality, and keep archive records clean.</p>
				</div>
			</header>

			<section className="admin-stats-grid">
				<article className="admin-stat-card" style={{ '--delay': '0.05s' }}>
					<File size={20} />
					<h3>{stats.total}</h3>
					<p>Total documents</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.1s' }}>
					<FileCheck2 size={20} />
					<h3>{stats.processed}</h3>
					<p>Processed</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.15s' }}>
					<FileWarning size={20} />
					<h3>{stats.pending}</h3>
					<p>Pending</p>
				</article>
				<article className="admin-stat-card" style={{ '--delay': '0.2s' }}>
					<Trash2 size={20} />
					<h3>{stats.failed}</h3>
					<p>Failed</p>
				</article>
			</section>

			<FilterPanel
        query={query}
        onQueryChange={setQuery}
        filters={[
        {
          key: 'status',
          label: 'Status',
          options: [
          { label: 'All status', value: 'all' },
          { label: 'Processed', value: 'processed' },
          { label: 'Pending', value: 'pending' },
          { label: 'Failed', value: 'failed' }]

        },
        {
          key: 'type',
          label: 'Type',
          options: [
          { label: 'All types', value: 'all' },
          { label: 'Image', value: 'image' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Other', value: 'unknown' }]

        }]
        }
        values={filters}
        onValueChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
        onReset={() => {
          setQuery('');
          setFilters({ status: 'all', type: 'all' });
        }}
        loading={loading}
        placeholder="Search by file name, owner, or CIN" />
      

			<ProTable
        data={filteredDocs}
        columns={columns}
        loading={loading}
        pageSize={8}
        emptyText="No documents matched your filters"
        exportName="documents-report" />
      
		</div>);

};

export default DocumentsManagement;
