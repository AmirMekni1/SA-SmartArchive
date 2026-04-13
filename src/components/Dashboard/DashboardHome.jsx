// components/dashboard/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import './DashboardHome.css';

const DashboardHome = () => {
    const { user, isAdmin } = useAuth();
    const [stats, setStats] = useState({
        totalDocuments: 0,
        processedToday: 0,
        pendingDocuments: 0,
        accuracy: 98.5
    });

    // بيانات نموذجية للمخططات
    const recentActivity = [
        { id: 1, action: 'رفع مستند جديد', date: '2024-01-15', status: 'completed' },
        { id: 2, action: 'معالجة بطاقة تعريف', date: '2024-01-15', status: 'processing' },
        { id: 3, action: 'تحديث الملف الشخصي', date: '2024-01-14', status: 'completed' },
    ];

    const StatCard = ({ icon, title, value, trend, color }) => (
        <Card className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
            <div className="stat-card-content">
                <div className="stat-icon" style={{ background: color }}>{icon}</div>
                <div className="stat-info">
                    <h3 className="stat-value">{value}</h3>
                    <p className="stat-title">{title}</p>
                    {trend && (
                        <span className={`stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );

    return (
        <div className="dashboard-home">
            {/* الترحيب */}
            <div className="welcome-section">
                <div className="welcome-text">
                    <h1>مرحباً بعودتك, {user?.username}! 👋</h1>
                    <p>يسعدنا رؤيتك مرة أخرى. إليك ملخص نشاطك اليوم.</p>
                </div>
                <div className="welcome-date">
                    {new Date().toLocaleDateString('ar-TN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </div>
            </div>

            {/* بطاقات الإحصائيات */}
            <div className="stats-grid">
                <StatCard 
                    icon="📄" 
                    title="إجمالي المستندات" 
                    value={stats.totalDocuments}
                    trend={12}
                    color="#4361ee"
                />
                <StatCard 
                    icon="✅" 
                    title="تمت المعالجة اليوم" 
                    value={stats.processedToday}
                    trend={8}
                    color="#06d6a0"
                />
                <StatCard 
                    icon="⏳" 
                    title="قيد المعالجة" 
                    value={stats.pendingDocuments}
                    trend={-3}
                    color="#ffd166"
                />
                <StatCard 
                    icon="🎯" 
                    title="دقة الاستخراج" 
                    value={`${stats.accuracy}%`}
                    trend={2}
                    color="#f72585"
                />
            </div>

            {/* قسم الإجراءات السريعة */}
            <div className="quick-actions-section">
                <h2>الإجراءات السريعة</h2>
                <div className="quick-actions-grid">
                    <Card hoverable className="quick-action-card">
                        <div className="action-icon">📤</div>
                        <h3>رفع مستند جديد</h3>
                        <p>قم برفع بطاقة التعريف لاستخراج البيانات تلقائياً</p>
                        <Button variant="primary" size="sm">رفع مستند</Button>
                    </Card>
                    <Card hoverable className="quick-action-card">
                        <div className="action-icon">📋</div>
                        <h3>سجل المستندات</h3>
                        <p>عرض جميع المستندات التي قمت برفعها سابقاً</p>
                        <Button variant="outline" size="sm">عرض السجل</Button>
                    </Card>
                    <Card hoverable className="quick-action-card">
                        <div className="action-icon">👤</div>
                        <h3>الملف الشخصي</h3>
                        <p>تحديث بياناتك الشخصية وإعدادات الحساب</p>
                        <Button variant="outline" size="sm">تعديل البيانات</Button>
                    </Card>
                    <Card hoverable className="quick-action-card">
                        <div className="action-icon">📊</div>
                        <h3>التقارير</h3>
                        <p>عرض تقارير مفصلة عن نشاطك</p>
                        <Button variant="outline" size="sm">عرض التقارير</Button>
                    </Card>
                </div>
            </div>

            {/* النشاط الأخير والمخططات */}
            <div className="activity-section">
                <div className="recent-activity">
                    <Card title="النشاط الأخير" icon="🕒">
                        <div className="activity-list">
                            {recentActivity.map(activity => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-dot"></div>
                                    <div className="activity-content">
                                        <p className="activity-action">{activity.action}</p>
                                        <span className="activity-date">
                                            {new Date(activity.date).toLocaleDateString('ar-TN')}
                                        </span>
                                    </div>
                                    <span className={`activity-status status-${activity.status}`}>
                                        {activity.status === 'completed' ? 'تمت' : 'قيد المعالجة'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                
                <div className="chart-section">
                    <Card title="إحصائيات المعالجة" icon="📈">
                        <div className="chart-placeholder">
                            {/* هنا يمكن إضافة مخطط حقيقي باستخدام Chart.js أو Recharts */}
                            <div className="chart-bars">
                                <div className="bar" style={{ height: '60%' }}></div>
                                <div className="bar" style={{ height: '80%' }}></div>
                                <div className="bar" style={{ height: '45%' }}></div>
                                <div className="bar" style={{ height: '90%' }}></div>
                                <div className="bar" style={{ height: '70%' }}></div>
                                <div className="bar" style={{ height: '55%' }}></div>
                                <div className="bar" style={{ height: '85%' }}></div>
                            </div>
                            <div className="chart-labels">
                                <span>سبت</span><span>أحد</span><span>إثنين</span>
                                <span>ثلاثاء</span><span>أربعاء</span><span>خميس</span><span>جمعة</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;