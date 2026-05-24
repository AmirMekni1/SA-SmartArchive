import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { documents } from '../../services/api';
import './UploadDocument.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UploadDocument = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const categories = [
  { value: 'cin', label: 'CIN (National ID)', icon: '🆔' },
  { value: 'passport', label: 'Passport', icon: '🛂' },
  { value: 'license', label: 'Driver License', icon: '🚗' },
  { value: 'certificate', label: 'Certificate', icon: '📜' },
  { value: 'other', label: 'Other Document', icon: '📄' }];


  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const validateFile = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed. Please upload JPG, PNG, or PDF files.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is 10MB.`;
    }
    return null;
  }, []);

  const handleFiles = useCallback((fileList) => {
    const validFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push({
          file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0
        });
      }
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }

    if (errors.length > 0) {
      showMessage(errors.join('\n'), 'error');
    }
  }, [validateFile]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles && droppedFiles[0]) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileInput = (e) => {
    const { files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      handleFiles(selectedFiles);
    }
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      showMessage('Please select files to upload', 'error');
      return;
    }

    if (!selectedCategory) {
      showMessage('Please select a document category', 'error');
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      const uploadableFiles = files.filter((f) => f.status !== 'completed');

      if (uploadableFiles.length === 0) {
        showMessage('All selected files are already uploaded.', 'error');
        return;
      }

      for (const entry of uploadableFiles) {
        setUploadProgress((prev) => ({ ...prev, [entry.id]: 15 }));
        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' } : f));

        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('document_type', selectedCategory);
        formData.append('username', user?.username || 'User');
        formData.append('cin_number', user?.cin_number || '');
        formData.append('user_id', user?.id || user?._id || '');

        try {
          const response = await documents.upload(formData);
          successCount += 1;
          setUploadProgress((prev) => ({ ...prev, [entry.id]: 100 }));
          setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'completed' } : f));

          const quality = response?.data?.document?.quality_score;
          if (typeof quality === 'number' && quality < 50) {
            showMessage(`Uploaded ${entry.name} with low extraction quality (${quality}%). Admin review required.`, 'error');
          }
        } catch (error) {
          console.error(`Upload failed for ${entry.name}:`, error);
          setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'failed' } : f));
        }

        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[entry.id];
          return next;
        });
      }

      const failedCount = uploadableFiles.length - successCount;

      if (successCount === uploadableFiles.length) {
        showMessage(`Successfully uploaded ${successCount} document(s).`, 'success');
        setFiles([]);
        setSelectedCategory('');
      } else if (successCount > 0) {
        showMessage(
          `Uploaded ${successCount} document(s). ${failedCount} failed. Please retry failed files.`,
          'error'
        );
      } else {
        showMessage(`Upload failed for all ${uploadableFiles.length} document(s). Please try again.`, 'error');
      }
    } catch {
      showMessage('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  return (
    <div className="upload-document">
      <div className="upload-container">
        <div className="upload-header">
          <h1 className="upload-title">Upload Documents</h1>
          <p className="upload-subtitle">Securely upload and manage your important documents</p>
        </div>

        {message &&
        <div className={`message ${message.type}`}>
            {message.text}
          </div>
        }

        <div className="upload-content">
          {}
          <div className="category-section">
            <h3>Document Category</h3>
            <div className="category-grid">
              {categories.map((category) =>
              <button
                key={category.value}
                className={`category-btn ${selectedCategory === category.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.value)}>
                
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-label">{category.label}</span>
                </button>
              )}
            </div>
          </div>

          {}
          <div className="upload-section">
            <h3>Upload Files</h3>
            <div
              className={`upload-area ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileInput}
                style={{ display: 'none' }} />
              

              <div className="upload-content">
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="upload-text">
                  <strong>Drag and drop</strong> your files here
                  <br />
                  or <button
                    className="browse-btn"
                    onClick={() => fileInputRef.current?.click()}>
                    
                    browse files
                  </button>
                </p>
                <p className="upload-hint">
                  Supported: Images (JPG, PNG) and PDF • Max size: 10MB
                </p>
              </div>
            </div>
          </div>

          {}
          {files.length > 0 &&
          <div className="file-list-section">
              <h3>Selected Files ({files.length})</h3>
              <div className="file-list">
                {files.map((file) =>
              <div key={file.id} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">{getFileIcon(file.type)}</span>
                      <div className="file-details">
                        <p className="file-name">{file.name}</p>
                        <p className="file-size">{formatFileSize(file.size)}</p>
                      </div>
                    </div>

                    <div className="file-status">
                      {uploadProgress[file.id] !== undefined &&
                  <div className="progress-bar">
                          <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress[file.id]}%` }}>
                    </div>
                          <span className="progress-text">{uploadProgress[file.id]}%</span>
                        </div>
                  }

                      {file.status === 'completed' &&
                  <span className="status-completed">✓ Completed</span>
                  }

                      {file.status === 'failed' &&
                  <span className="status-failed">✕ Failed</span>
                  }

                      <button
                    className="remove-btn"
                    onClick={() => removeFile(file.id)}
                    disabled={uploading}
                    title="Remove file">
                    
                        ✕
                      </button>
                    </div>
                  </div>
              )}
              </div>
            </div>
          }

          {}
          <div className="upload-actions">
            <button
              className="upload-btn"
              onClick={uploadFiles}
              disabled={files.length === 0 || uploading || !selectedCategory}>
              
              {uploading ?
              <>
                  <div className="loading-spinner"></div>
                  Uploading...
                </> :

              <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Documents
                </>
              }
            </button>
          </div>
        </div>
      </div>
    </div>);

};

export default UploadDocument;
