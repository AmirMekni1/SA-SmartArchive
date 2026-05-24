import React, { useState, useEffect } from 'react';
import { documents } from '../../services/api';
import './DocumentHistory.css';

const DocumentHistory = () => {
  const [historyDocuments, setHistoryDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [editPayload, setEditPayload] = useState({ extracted_data: '{}', full_text: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await documents.getHistory();
        const rows = Array.isArray(response.data) ? response.data : [];
        setHistoryDocuments(rows);
      } catch (error) {
        console.error('Failed to load document history:', error);
        setHistoryDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':return '#43e97b';
      case 'verified':return '#43e97b';
      case 'failed':return '#f5576c';
      case 'pending':return '#f093fb';
      case 'rejected':return '#f5576c';
      default:return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processed':return 'Processed';
      case 'verified':return 'Verified';
      case 'failed':return 'Failed';
      case 'pending':return 'Pending';
      case 'rejected':return 'Rejected';
      default:return 'Unknown';
    }
  };

  const filteredDocuments = historyDocuments.filter((doc) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesFilter = filter === 'all' || String(doc.status || '').toLowerCase() === filter;
    const matchesSearch =
    String(doc.name || doc.filename || '').toLowerCase().includes(normalizedSearch) ||
    String(doc.type || '').toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handleView = (doc) => {
    if (!doc?.id) {
      return;
    }
    setActionError('');
    documents.
    getById(doc.id).
    then((response) => {
      const payload = response?.data || null;
      setViewingDoc(payload);
      setEditPayload({
        extracted_data: JSON.stringify(payload?.extracted_data || {}, null, 2),
        full_text: payload?.full_text || ''
      });
    }).
    catch((error) => {
      console.error('View failed:', error);
      setActionError('Unable to load document details. Please try again.');
    });
  };

  const handleDownload = async (doc) => {
    if (!doc?.id) {
      return;
    }

    try {
      const response = await documents.getById(doc.id);
      const data = response?.data || {};
      const content = data.full_text || JSON.stringify(data.extracted_data || {}, null, 2);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(doc.name || doc.filename || 'document').replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
      setActionError('Unable to download this document right now.');
    }
  };

  const saveEdits = async () => {
    if (!viewingDoc?.id) {
      return;
    }

    setSavingEdit(true);
    setActionError('');
    try {
      const parsedEntities = JSON.parse(editPayload.extracted_data || '{}');
      const response = await documents.updateEntities(viewingDoc.id, {
        extracted_data: parsedEntities,
        full_text: editPayload.full_text
      });
      const updatedDoc = response?.data?.document;
      if (updatedDoc) {
        setViewingDoc((previous) => ({ ...previous, ...updatedDoc, id: previous?.id || updatedDoc?._id }));
        setHistoryDocuments((previous) =>
        previous.map((doc) => String(doc.id) === String(updatedDoc._id || updatedDoc.id) ? {
          ...doc,
          status: updatedDoc.status,
          quality_score: updatedDoc.quality_score
        } : doc)
        );
      }
    } catch (error) {
      console.error('Failed to save edits:', error);
      setActionError('Could not save your changes. Ensure JSON entities are valid.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="document-history">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading document history...</p>
        </div>
      </div>);

  }

  return (
    <div className="document-history">
      <div className="history-header">
        <h1 className="history-title">Document History</h1>
        <p className="history-subtitle">View and manage your uploaded documents</p>
      </div>

      <div className="history-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input" />
          
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div className="filter-container">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select">
            
            <option value="all">All Status</option>
            <option value="processed">Processed</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="documents-table-container">
        {actionError ? <p className="history-action-error">{actionError}</p> : null}
        {paginatedDocuments.length === 0 ?
        <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            <h3>No documents found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div> :

        <table className="documents-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Type</th>
                <th>Upload Date</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.map((doc) =>
            <tr key={doc.id}>
                  <td className="doc-name">{doc.name || doc.filename || 'Untitled document'}</td>
                  <td>{doc.type || '-'}</td>
                  <td>{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}</td>
                  <td>{typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(1)} KB` : doc.size || '-'}</td>
                  <td>
                    <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(doc.status) }}>
                  
                      {getStatusText(doc.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                    className="action-btn view-btn"
                    onClick={() => handleView(doc)}
                    title="View Document">
                    
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                    className="action-btn download-btn"
                    onClick={() => handleDownload(doc)}
                    title="Download Document">
                    
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        }
      </div>

      {totalPages > 1 &&
      <div className="pagination">
          <button
          className="pagination-btn"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}>
          
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
          className="pagination-btn"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}>
          
            Next
          </button>
        </div>
      }

      {viewingDoc ?
      <div className="history-modal-overlay" onClick={() => setViewingDoc(null)}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal-header">
              <h3>{viewingDoc.filename || 'Document details'}</h3>
              <button type="button" className="history-modal-close" onClick={() => setViewingDoc(null)}>
                Close
              </button>
            </div>
            <div className="history-modal-body">
              <p><strong>Status:</strong> {viewingDoc.status || '-'}</p>
              <p><strong>Type:</strong> {viewingDoc.type || '-'}</p>
              <p><strong>Uploaded:</strong> {viewingDoc.created_at ? new Date(viewingDoc.created_at).toLocaleString() : '-'}</p>
              <h4>Extracted Data</h4>
              <textarea
              className="history-edit-textarea"
              value={editPayload.extracted_data}
              onChange={(event) => setEditPayload((previous) => ({ ...previous, extracted_data: event.target.value }))}
              rows={10} />
            
              <h4>OCR Text</h4>
              <textarea
              className="history-edit-textarea"
              value={editPayload.full_text}
              onChange={(event) => setEditPayload((previous) => ({ ...previous, full_text: event.target.value }))}
              rows={8} />
            
              {viewingDoc.file_url ?
            <div>
                  <h4>Original File</h4>
                  <a className="history-open-original" href={`http://localhost:3001${viewingDoc.file_url}`} target="_blank" rel="noreferrer">
                    Open original document
                  </a>
                </div> :
            null}
              <button type="button" className="history-save-btn" onClick={saveEdits} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save corrections'}
              </button>
            </div>
          </div>
        </div> :
      null}
    </div>);

};

export default DocumentHistory;
