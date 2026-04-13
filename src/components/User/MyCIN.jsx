// components/User/MyCIN.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { documents } from '../../services/api';
import '../styles/user.css';

const MyCIN = () => {
  const { user } = useAuth();
  const [cinData, setCinData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCIN();
  }, []);

  const fetchMyCIN = async () => {
    try {
      const response = await documents.getMyCIN();
      setCinData(response.data);
    } catch (error) {
      console.error('Error fetching CIN data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="my-cin-page">
      <div className="page-header">
        <h1>🆔 My ID Card</h1>
        <p>The national identity information linked to your account</p>
      </div>

      {cinData ? (
        <div className="cin-card">
          <div className="cin-card-header">
            <div className="cin-logo">🏛️</div>
            <h2>Tunisian Republic</h2>
            <p>Ministry of the Interior</p>
            <h3>National Identity Card</h3>
          </div>

          <div className="cin-card-body">
            <div className="cin-photo">
              <div className="photo-placeholder">
                {cinData.photo ? (
                  <img src={cinData.photo} alt="Photo" />
                ) : (
                  <span>📸</span>
                )}
              </div>
            </div>

            <div className="cin-info">
              <div className="info-row">
                <label>ID Number:</label>
                <span className="cin-number">{cinData.cin_number}</span>
              </div>
              <div className="info-row">
                <label>Last Name:</label>
                <span>{cinData.last_name}</span>
              </div>
              <div className="info-row">
                <label>First Name:</label>
                <span>{cinData.first_name}</span>
              </div>
              <div className="info-row">
                <label>Father&apos;s Name:</label>
                <span>{cinData.father_name}</span>
              </div>
              <div className="info-row">
                <label>Mother&apos;s Name:</label>
                <span>{cinData.mother_name}</span>
              </div>
              <div className="info-row">
                <label>Date of Birth:</label>
                <span>{cinData.birth_date}</span>
              </div>
              <div className="info-row">
                <label>Place of Birth:</label>
                <span>{cinData.birth_place}</span>
              </div>
              <div className="info-row">
                <label>Governorate:</label>
                <span>{cinData.gouvernante}</span>
              </div>
              <div className="info-row">
                <label>Occupation:</label>
                <span>{cinData.job || 'Not specified'}</span>
              </div>
              <div className="info-row">
                <label>Issue Date:</label>
                <span>{cinData.cin_creation || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div className="cin-card-footer">
            <button className="btn-print" onClick={() => window.print()}>
              🖨️ Print card
            </button>
            <button className="btn-edit" onClick={() => alert('This feature will be available soon')}>
              ✏️ Request edit
            </button>
          </div>
        </div>
      ) : (
        <div className="no-cin">
          <div className="no-cin-icon">🆔</div>
          <h3>No identity card found</h3>
          <p>Please upload an image of your card to extract the data automatically</p>
          <button className="btn-upload-cin" onClick={() => window.location.href = '/upload'}>
            Upload ID card
          </button>
        </div>
      )}
    </div>
  );
};

export default MyCIN;
