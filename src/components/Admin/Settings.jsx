// src/components/Admin/Settings.jsx
import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    siteName: 'منصة التعريف الوطنية',
    siteDescription: 'منصة ذكية لاستخراج بيانات بطاقات التعريف',
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileSize: 10,
    allowedFileTypes: ['jpg', 'png', 'jpeg'],
    emailNotifications: true,
    autoVerifyDocuments: false,
    language: 'ar',
    theme: 'light'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // هنا سيتم إرسال الإعدادات إلى الخادم
    setTimeout(() => {
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }, 1000);
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>⚙️ إعدادات النظام</h1>
        <p>تكوين وإدارة إعدادات المنصة</p>
      </div>

      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-section">
          <h2>الإعدادات العامة</h2>
          <div className="form-group">
            <label>اسم الموقع</label>
            <input
              type="text"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>وصف الموقع</label>
            <textarea
              name="siteDescription"
              value={settings.siteDescription}
              onChange={handleChange}
              rows="3"
            />
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="maintenanceMode"
                checked={settings.maintenanceMode}
                onChange={handleChange}
              />
              وضع الصيانة
            </label>
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="registrationEnabled"
                checked={settings.registrationEnabled}
                onChange={handleChange}
              />
              فتح التسجيل للمستخدمين الجدد
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>إعدادات الملفات</h2>
          <div className="form-group">
            <label>الحد الأقصى لحجم الملف (MB)</label>
            <input
              type="number"
              name="maxFileSize"
              value={settings.maxFileSize}
              onChange={handleChange}
              min="1"
              max="50"
            />
          </div>
          <div className="form-group">
            <label>أنواع الملفات المسموحة</label>
            <div className="checkbox-group">
              {['jpg', 'png', 'jpeg', 'pdf', 'tiff'].map(type => (
                <label key={type}>
                  <input
                    type="checkbox"
                    checked={settings.allowedFileTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings({
                          ...settings,
                          allowedFileTypes: [...settings.allowedFileTypes, type]
                        });
                      } else {
                        setSettings({
                          ...settings,
                          allowedFileTypes: settings.allowedFileTypes.filter(t => t !== type)
                        });
                      }
                    }}
                  />
                  .{type}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>الإشعارات</h2>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
              />
              تفعيل الإشعارات البريدية
            </label>
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="autoVerifyDocuments"
                checked={settings.autoVerifyDocuments}
                onChange={handleChange}
              />
              التحقق التلقائي من المستندات
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>التخصيص</h2>
          <div className="form-group">
            <label>اللغة</label>
            <select name="language" value={settings.language} onChange={handleChange}>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <label>المظهر</label>
            <select name="theme" value={settings.theme} onChange={handleChange}>
              <option value="light">فاتح</option>
              <option value="dark">داكن</option>
              <option value="auto">تلقائي</option>
            </select>
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
          <button type="button" className="btn-reset" onClick={() => window.location.reload()}>
            إعادة تعيين
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;