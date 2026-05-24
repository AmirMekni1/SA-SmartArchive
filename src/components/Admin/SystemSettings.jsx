import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Globe2, LockKeyhole, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { admin } from '../../services/api';
import './Settings.css';

const SETTINGS_TABS = [
{ key: 'general', label: 'General', icon: Globe2 },
{ key: 'security', label: 'Security', icon: LockKeyhole },
{ key: 'notifications', label: 'Notifications', icon: BellRing },
{ key: 'automation', label: 'Automation', icon: Sparkles }];


const DEFAULT_SETTINGS = {
  siteName: 'SmartArchive',
  locale: 'en',
  timezone: 'Africa/Tunis',
  enforce2FA: true,
  sessionTimeout: 30,
  notifyByEmail: true,
  notifyBySms: false,
  autoClassify: true,
  autoVerifyThreshold: 92
};

const SETTINGS_STORAGE_KEY = 'admin.systemSettings';

const sanitizeSettings = (value) => ({
  ...DEFAULT_SETTINGS,
  ...(value || {}),
  sessionTimeout: Number(value?.sessionTimeout ?? DEFAULT_SETTINGS.sessionTimeout),
  autoVerifyThreshold: Number(value?.autoVerifyThreshold ?? DEFAULT_SETTINGS.autoVerifyThreshold)
});

const getSettingsErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error;

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to manage system settings.';
  }
  if (status && status >= 500) {
    return apiMessage || 'The server is unavailable right now. Please try again in a moment.';
  }
  if (!status) {
    return 'Could not reach backend server. Make sure backend is running on port 3001.';
  }

  return apiMessage || fallback;
};

const SystemSettings = () => {
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [initialState, setInitialState] = useState(DEFAULT_SETTINGS);
  const [state, setState] = useState(DEFAULT_SETTINGS);

  const hasChanges = useMemo(() => {
    const baseline = sanitizeSettings(initialState);
    const current = sanitizeSettings(state);
    return JSON.stringify(baseline) !== JSON.stringify(current);
  }, [initialState, state]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await admin.getSettings();
        const next = sanitizeSettings(response?.data);
        setInitialState(next);
        setState(next);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          try {
            const next = sanitizeSettings(JSON.parse(cached));
            setInitialState(next);
            setState(next);
            setError(getSettingsErrorMessage(error, 'Showing locally cached configuration because server settings could not be loaded.'));
          } catch {
            setInitialState(DEFAULT_SETTINGS);
            setState(DEFAULT_SETTINGS);
            setError('Could not parse cached settings. Using default values.');
          }
        } else {
          setInitialState(DEFAULT_SETTINGS);
          setState(DEFAULT_SETTINGS);
          setError(getSettingsErrorMessage(error, 'Could not load settings from server. Using default values.'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const update = (key, value) => {
    setState((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = sanitizeSettings(state);
      await admin.updateSettings(payload);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      setInitialState(payload);
      setState(payload);
      setSaved(true);
    } catch (error) {
      const payload = sanitizeSettings(state);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      setError(getSettingsErrorMessage(error, 'Could not save settings to server. Changes are saved locally, and you can retry when backend is available.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page admin-settings-page">
			<header className="admin-page-header">
				<div>
					<span className="admin-eyebrow">Platform Governance</span>
					<h1>System Settings</h1>
					<p>Configure security, localization, messaging, and intelligent automation defaults.</p>
				</div>
			</header>

			<section className="admin-settings-layout">
				<aside className="admin-settings-tabs admin-glass">
					{SETTINGS_TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.key}
                className={`admin-tab-btn ${tab === item.key ? 'is-active' : ''}`}
                onClick={() => setTab(item.key)}>
                
								<Icon size={17} />
								{item.label}
							</button>);

          })}
				</aside>

				<form className="admin-settings-panel admin-glass" onSubmit={save}>
					{loading && <p className="admin-settings-note">Loading settings...</p>}
					{error && <p className="admin-settings-error">{error}</p>}
					{tab === 'general' &&
          <div className="admin-settings-group">
							<label>
								Site Name
								<input value={state.siteName} onChange={(event) => update('siteName', event.target.value)} />
							</label>
							<label>
								Locale
								<select value={state.locale} onChange={(event) => update('locale', event.target.value)}>
									<option value="en">English</option>
									<option value="fr">Francais</option>
									<option value="ar">Arabic</option>
								</select>
							</label>
							<label>
								Timezone
								<input value={state.timezone} onChange={(event) => update('timezone', event.target.value)} />
							</label>
						</div>
          }

					{tab === 'security' &&
          <div className="admin-settings-group">
							<label className="admin-switch-row">
								<div>
									<strong>Enforce 2FA</strong>
									<small>Require multi-factor verification for privileged sessions.</small>
								</div>
								<input
                type="checkbox"
                checked={state.enforce2FA}
                onChange={(event) => update('enforce2FA', event.target.checked)} />
              
							</label>
							<label>
								Session Timeout (minutes)
								<input
                type="number"
                min="5"
                max="180"
                value={state.sessionTimeout}
                onChange={(event) => update('sessionTimeout', Number(event.target.value))} />
              
							</label>
							<div className="admin-callout">
								<ShieldCheck size={18} />
								Security policy score is strong. Keep timeout under 60 minutes for compliance.
							</div>
						</div>
          }

					{tab === 'notifications' &&
          <div className="admin-settings-group">
							<label className="admin-switch-row">
								<div>
									<strong>Email notifications</strong>
									<small>Send archive and verification status updates by email.</small>
								</div>
								<input
                type="checkbox"
                checked={state.notifyByEmail}
                onChange={(event) => update('notifyByEmail', event.target.checked)} />
              
							</label>
							<label className="admin-switch-row">
								<div>
									<strong>SMS notifications</strong>
									<small>Send concise alerting messages for high-priority events.</small>
								</div>
								<input
                type="checkbox"
                checked={state.notifyBySms}
                onChange={(event) => update('notifyBySms', event.target.checked)} />
              
							</label>
						</div>
          }

					{tab === 'automation' &&
          <div className="admin-settings-group">
							<label className="admin-switch-row">
								<div>
									<strong>Auto classify incoming documents</strong>
									<small>Run classification directly after upload pipeline completion.</small>
								</div>
								<input
                type="checkbox"
                checked={state.autoClassify}
                onChange={(event) => update('autoClassify', event.target.checked)} />
              
							</label>
							<label>
								Auto verification threshold (%)
								<input
                type="number"
                min="50"
                max="100"
                value={state.autoVerifyThreshold}
                onChange={(event) => update('autoVerifyThreshold', Number(event.target.value))} />
              
							</label>
						</div>
          }

					<footer className="admin-settings-actions">
						{saved && <p className="admin-saved-message">Settings saved successfully.</p>}
						<button type="submit" className="admin-btn admin-btn-primary" disabled={saving || loading || !hasChanges}>
							<Save size={16} />
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</footer>
				</form>
			</section>
		</div>);

};

export default SystemSettings;
