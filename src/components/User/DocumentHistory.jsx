import React, { useState, useEffect } from 'react';
import './DocumentHistory.css';

const DocumentHistory = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data - replace with API call
  useEffect(() => {
    const mockDocuments = [
      {
        id: 1,
        name: 'CIN_Document_001.jpg',
        uploadDate: '2024-01-15',
        status: 'verified',
        size: '2.5 MB',
        type: 'CIN'
      },
      {
        id: 2,
        name: 'Passport_Scan.pdf',
        uploadDate: '2024-01-10',
        status: 'pending',
        size: '1.8 MB',
        type: 'Passport'
      },
      {
        id: 3,
        name: 'ID_Card_Back.png',
        uploadDate: '2024-01-05',
        status: 'rejected',
        size: '3.2 MB',
        type: 'ID Card'
      },
      // Add more mock data as needed
    ];

    setTimeout(() => {
      setDocuments(mockDocuments);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#43e97b';
      case 'pending': return '#f093fb';
      case 'rejected': return '#f5576c';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'all' || doc.status === filter;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handleView = (doc) => {
    // Implement view functionality
    console.log('Viewing document:', doc);
  };

  const handleDownload = (doc) => {
    // Implement download functionality
    console.log('Downloading document:', doc);
  };

  if (loading) {
    return (
      <div className="document-history">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading document history...</p>
        </div>
      </div>
    );
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
            className="search-input"
          />
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div className="filter-container">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="documents-table-container">
        {paginatedDocuments.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            <h3>No documents found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
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
              {paginatedDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td className="doc-name">{doc.name}</td>
                  <td>{doc.type}</td>
                  <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                  <td>{doc.size}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(doc.status) }}
                    >
                      {getStatusText(doc.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleView(doc)}
                        title="View Document"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button
                        className="action-btn download-btn"
                        onClick={() => handleDownload(doc)}
                        title="Download Document"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentHistory;
