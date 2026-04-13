// src/components/Admin/Statistics.jsx
import React, { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import './Statistics.css';

const Statistics = () => {
  const [stats, setStats] = useState({
    users: { total: 0, verified: 0, pending: 0, admin: 0 },
    documents: { total: 0, processed: 0, pending: 0, today: 0, thisMonth: 0 },
    monthlyData: [],
    popularTimes: []
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  const fetchStatistics = async () => {
    try {
      const response = await admin.getStatistics(period);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="statistics">
      <div className="statistics-header">
        <h1>📊 الإحصائيات والتقارير</h1>
        <div className="period-selector">
          <button 
            className={`period-btn ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            أسبوع
          </button>
          <button 
            className={`period-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            شهر
          </button>
          <button 
            className={`period-btn ${period === 'year' ? 'active' : ''}`}
            onClick={() => setPeriod('year')}
          >
            سنة
          </button>
        </div>
      </div>

      <div className="stats-summary">
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-info">
            <h3>{stats.users.total}</h3>
            <p>إجمالي المستخدمين</p>
            <div className="summary-details">
              <span>✅ {stats.users.verified} موثق</span>
              <span>⏳ {stats.users.pending} غير موثق</span>
              <span>👑 {stats.users.admin} مسؤول</span>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📄</div>
          <div className="summary-info">
            <h3>{stats.documents.total}</h3>
            <p>إجمالي المستندات</p>
            <div className="summary-details">
              <span>✅ {stats.documents.processed} تمت المعالجة</span>
              <span>⏳ {stats.documents.pending} قيد المعالجة</span>
              <span>📈 {stats.documents.today} اليوم</span>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>نشاط المستخدمين الشهري</h3>
          <div className="bar-chart">
            {stats.monthlyData.map((item, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{item.month}</div>
                <div className="bar-wrapper">
                  <div 
                    className="bar-fill" 
                    style={{ width: `${(item.count / Math.max(...stats.monthlyData.map(d => d.count))) * 100}%` }}
                  >
                    <span className="bar-value">{item.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>أوقات الذروة</h3>
          <div className="pie-chart-placeholder">
            {stats.popularTimes.map((time, index) => (
              <div key={index} className="time-stat">
                <div className="time-label">{time.hour}:00</div>
                <div className="time-bar-wrapper">
                  <div 
                    className="time-bar-fill" 
                    style={{ width: `${(time.count / Math.max(...stats.popularTimes.map(t => t.count))) * 100}%` }}
                  />
                </div>
                <div className="time-count">{time.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="export-section">
        <button className="btn-export">📥 تصدير التقرير (PDF)</button>
        <button className="btn-export">📊 تصدير التقرير (Excel)</button>
      </div>
    </div>
  );
};

export default Statistics;