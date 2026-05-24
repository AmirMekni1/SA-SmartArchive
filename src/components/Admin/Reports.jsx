import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import { admin, documents } from '../../services/api';
import './Statistics.css';

const COLORS = ['#006d77', '#e29578', '#83c5be', '#ffb703', '#219ebc'];

const uniqueLimited = (values = [], limit = 10) =>
Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).slice(0, limit);

const buildMonthlySeries = (docs = []) => {
  const buckets = new Map();
  docs.forEach((doc) => {
    if (!doc.created_at) {
      return;
    }
    const date = new Date(doc.created_at);
    const monthLabel = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    buckets.set(monthLabel, (buckets.get(monthLabel) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([month, total]) => ({ month, total })).slice(-6);
};

const detectIntent = (text) => {
  const tail = String(text || '').toLowerCase().split(/\s+/).slice(-8).join(' ');
  if (/(first\s*name|last\s*name|firstname|lastname|الاسم|اللقب|prenom|nom)/i.test(tail)) return 'keyvalue';
  if (/(certificate|certificat|cert)/i.test(tail)) return 'certificate';
  if (/\bcin\b/i.test(tail)) return 'cin';
  if (/\buser\b|\bname\b/i.test(tail)) return 'user';
  return 'generic';
};

const flattenObjectEntries = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const entries = [];
  Object.entries(value).forEach(([key, entryValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
      entries.push(...flattenObjectEntries(entryValue, nextKey));
      return;
    }

    const text = String(entryValue ?? '').trim();
    if (!text) return;
    entries.push({ key: nextKey, value: text });
  });

  return entries;
};

const normalizeText = (value) =>
String(value || '').
toLowerCase().
replace(/\s+/g, ' ').
trim();

const detectRequestedField = (query) => {
  const source = normalizeText(query);
  if (!source) return '';
  if (/(first\s*name|firstname|الاسم\s*الشخصي|الاسم\s*الاول|prenom)/i.test(source)) return 'first_name';
  if (/(last\s*name|lastname|nom|اللقب|اسم\s*العائلة)/i.test(source)) return 'last_name';
  if (/(certificate\s*number|cert\s*number|رقم\s*الشهادة)/i.test(source)) return 'certificate_number';
  if (/(cin\s*number|identity\s*number|رقم\s*البطاقة|رقم\s*التعريف)/i.test(source)) return 'cin_number';
  return '';
};

const extractFragment = (text) => {
  const source = String(text || '');
  if (!source) return '';
  const parts = source.split(/\s+/);
  return String(parts[parts.length - 1] || '').trim();
};

const extractSelectedUser = (text) => {
  const source = String(text || '').trim();
  const latinMatch = source.match(/(?:user|name)\s+(.+)$/i);
  if (latinMatch && latinMatch[1]) {
    return latinMatch[1].trim();
  }

  const cinOfMatch = source.match(/cin\s+(?:of|for|de)?\s*(.+)$/i);
  if (cinOfMatch && cinOfMatch[1]) {
    return cinOfMatch[1].trim();
  }

  const arabicMatch = source.match(/(?:اسم|المستخدم|cin)\s*(?:ل|لل|of)?\s*(.+)$/i);
  return arabicMatch && arabicMatch[1] ? arabicMatch[1].trim() : '';
};

const extractSelectedCin = (text) => {
  const match = String(text || '').match(/cin\s+([0-9A-Za-z-]+)/i);
  return match ? match[1] : '';
};

const localTokenFallback = (intent, fragment, docs = [], users = [], topK = 6) => {
  const q = String(fragment || '').toLowerCase();
  const names = uniqueLimited([
  ...docs.map((doc) => doc.username),
  ...users.map((user) => user.username)],
  300);

  const cins = uniqueLimited([
  ...docs.map((doc) => doc.cin_number),
  ...users.map((user) => user.cin_number)],
  300);

  const certificates = uniqueLimited(
    docs.flatMap((doc) => {
      const data = doc.extracted_data || {};
      const cert = data.certificate_number || data.certificate_no || data.cert_number || '';
      if (!cert) return [];
      return [`${doc.username || 'Unknown'} - ${cert}`, cert];
    }),
    300
  );

  const keyValueCandidates = uniqueLimited([
  ...users.flatMap((user) => {
    const base = {
      username: user.username || '',
      cin_number: user.cin_number || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || ''
    };

    return flattenObjectEntries(base).flatMap((entry) => [
    `${entry.key}: ${entry.value}`,
    `${entry.value} -> ${entry.key}`,
    user.username ? `${user.username} | ${entry.key}: ${entry.value}` : '',
    user.cin_number ? `${user.cin_number} -> ${entry.key}: ${entry.value}` : '']
    );
  }),
  ...docs.flatMap((doc) => {
    const entries = flattenObjectEntries(doc.extracted_data || {});
    return entries.flatMap((entry) => [
    `${entry.key}: ${entry.value}`,
    `${entry.value} -> ${entry.key}`,
    doc.username ? `${doc.username} | ${entry.key}: ${entry.value}` : '',
    doc.cin_number ? `${doc.cin_number} -> ${entry.key}: ${entry.value}` : '']
    );
  })],
  2000);

  let candidates = [];
  if (intent === 'user') candidates = names;else
  if (intent === 'cin') candidates = cins;else
  if (intent === 'certificate') candidates = certificates;else
  if (intent === 'keyvalue') {
    const requestedField = detectRequestedField(fragment);
    candidates = requestedField ?
    keyValueCandidates.filter((value) => normalizeText(value).includes(requestedField)) :
    keyValueCandidates;
  } else
  candidates = uniqueLimited([...names, ...cins, ...certificates], 400);

  return candidates.filter((value) => !q || value.toLowerCase().includes(q)).slice(0, topK);
};

const replaceLastToken = (text, suggestion) => {
  const source = String(text || '');
  if (!source.trim()) {
    return suggestion;
  }

  if (/\s$/.test(source)) {
    return `${source}${suggestion}`;
  }

  const parts = source.split(/\s+/);
  parts[parts.length - 1] = suggestion;
  return parts.join(' ');
};

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);

  const [reportDraft, setReportDraft] = useState('');
  const [textSuggestions, setTextSuggestions] = useState([]);
  const [textAutocompleteLoading, setTextAutocompleteLoading] = useState(false);
  const [textAutocompleteError, setTextAutocompleteError] = useState('');
  const [currentIntent, setCurrentIntent] = useState('generic');

  const [nameQuery, setNameQuery] = useState('');
  const [cinQuery, setCinQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ names: [], cins: [] });
  const [reportRows, setReportRows] = useState([]);

  const requestTokenSuggestions = async (draft, force = false) => {
    const query = String(draft || '').trim();
    const intent = detectIntent(query);
    const fragment = extractFragment(query);
    setCurrentIntent(intent);

    if (!force && (!query || query.length < 2)) {
      setTextSuggestions([]);
      setTextAutocompleteError('');
      return;
    }

    try {
      setTextAutocompleteLoading(true);
      setTextAutocompleteError('');
      const response = await admin.getReportTokenAutocomplete({
        q: query,
        fragment,
        selectedUser: extractSelectedUser(query),
        selectedCin: extractSelectedCin(query),
        topK: 8
      });
      setTextSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
    } catch (error) {
      console.error('Failed to load token autocomplete', error);
      const fallback = localTokenFallback(intent, fragment, docs, users, 8);
      setTextSuggestions(fallback);
      setTextAutocompleteError('Using local fallback suggestions. Restart backend/Ollama for smarter ranking.');
    } finally {
      setTextAutocompleteLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResponse, usersResponse, docsResponse] = await Promise.all([
        admin.getStatistics(),
        admin.getAllUsers(),
        documents.getAll()]
        );
        setStats(statsResponse.data || {});
        setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        setDocs(Array.isArray(docsResponse.data) ? docsResponse.data : []);
      } catch (error) {
        console.error('Failed to load reports data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await admin.getReportSuggestions({ nameQuery, cinQuery });
        setSuggestions({
          names: Array.isArray(response.data?.names) ? response.data.names : [],
          cins: Array.isArray(response.data?.cins) ? response.data.cins : []
        });
      } catch (error) {
        console.error('Failed to load report suggestions', error);
      }
    };

    loadSuggestions();
  }, [nameQuery, cinQuery]);

  useEffect(() => {
    const loadReportRows = async () => {
      try {
        const response = await admin.getReports({ name: nameQuery, cin: cinQuery });
        setReportRows(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load filtered report rows', error);
      }
    };

    loadReportRows();
  }, [nameQuery, cinQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await requestTokenSuggestions(reportDraft, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [reportDraft, docs, users]);

  const handleDraftKeyDown = (event) => {
    const isCtrlSpace = (event.ctrlKey || event.metaKey) && (event.code === 'Space' || event.key === ' ');
    if (!isCtrlSpace) {
      return;
    }

    event.preventDefault();
    void requestTokenSuggestions(reportDraft, true);
  };

  const chartData = useMemo(() => {
    const statusMap = docs.reduce(
      (acc, doc) => {
        const key = String(doc.status || 'pending').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { processed: 0, pending: 0, failed: 0 }
    );

    const roleMap = users.reduce(
      (acc, user) => {
        const key = String(user.role || 'user').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { admin: 0, user: 0 }
    );

    return {
      monthlySeries: buildMonthlySeries(docs),
      documentsByStatus: [
      { name: 'Processed', value: statusMap.processed },
      { name: 'Pending', value: statusMap.pending },
      { name: 'Failed', value: statusMap.failed }],

      usersByRole: [
      { role: 'User', total: roleMap.user },
      { role: 'Admin', total: roleMap.admin }]

    };
  }, [docs, users]);

  const applySuggestion = (suggestion) => {
    setReportDraft((previous) => replaceLastToken(previous, suggestion));
    setTextSuggestions([]);
    setTextAutocompleteError('');
  };

  const exportReportText = () => {
    const content = String(reportDraft || '').trim();
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-draft-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="admin-page reports-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Intelligence Layer</span>
          <h1>Analytics and Reports</h1>
          <p>Measure growth, identify bottlenecks, and validate archive quality in real time.</p>
        </div>
      </header>

      <section className="admin-stats-grid">
        <article className="admin-stat-card" style={{ '--delay': '0.05s' }}>
          <h3>{stats.totalUsers || users.length || 0}</h3>
          <p>Total users</p>
        </article>
        <article className="admin-stat-card" style={{ '--delay': '0.1s' }}>
          <h3>{stats.verifiedUsers || users.filter((user) => user.is_verified).length || 0}</h3>
          <p>Verified users</p>
        </article>
        <article className="admin-stat-card" style={{ '--delay': '0.15s' }}>
          <h3>{stats.totalDocuments || docs.length || 0}</h3>
          <p>Total documents</p>
        </article>
        <article className="admin-stat-card" style={{ '--delay': '0.2s' }}>
          <h3>{stats.documentsToday || 0}</h3>
          <p>Documents today</p>
        </article>
      </section>

      <section className="admin-chart-grid">
        <article className="admin-chart-card admin-glass admin-chart-card-wide">
          <h3>AI Writing Zone</h3>
          <p>
            Write report text word-by-word. Type keywords like <strong>user</strong>, <strong>cin</strong>, or{' '}
            <strong>certificate</strong>. Current mode: <strong>{currentIntent}</strong>.
          </p>

          <textarea
            value={reportDraft}
            onChange={(event) => setReportDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Start writing your report..."
            rows={8}
            style={{ width: '100%', borderRadius: 12, padding: '0.8rem', resize: 'vertical' }} />
          

          <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', opacity: 0.8 }}>
            Tip: press Ctrl+Space to request suggestions instantly.
          </p>

          <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={exportReportText}
              className="admin-btn admin-btn-primary"
              disabled={!reportDraft.trim()}>
              
              Export Text (.txt)
            </button>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {textAutocompleteLoading ? <span>Loading AI suggestions...</span> : null}
            {textAutocompleteError ? <span style={{ color: '#b42318' }}>{textAutocompleteError}</span> : null}
            {!textAutocompleteLoading && textSuggestions.map((suggestion) =>
            <button
              type="button"
              key={suggestion}
              onClick={() => applySuggestion(suggestion)}
              className="admin-btn admin-btn-muted"
              style={{ fontSize: '0.82rem' }}>
              
                {suggestion}
              </button>
            )}
          </div>
        </article>

        <article className="admin-chart-card admin-glass admin-chart-card-wide">
          <h3>Smart Report Generator</h3>
          <div className="admin-report-filters">
            <input
              type="text"
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              list="report-name-suggestions"
              placeholder="Type a user name" />
            
            <datalist id="report-name-suggestions">
              {suggestions.names.map((name) =>
              <option key={name} value={name} />
              )}
            </datalist>

            <input
              type="text"
              value={cinQuery}
              onChange={(event) => setCinQuery(event.target.value)}
              list="report-cin-suggestions"
              placeholder="Type CIN" />
            
            <datalist id="report-cin-suggestions">
              {suggestions.cins.map((cin) =>
              <option key={cin} value={cin} />
              )}
            </datalist>
          </div>

          <div className="admin-report-table-wrap">
            <table className="admin-report-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>CIN</th>
                  <th>File</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Quality</th>
                  <th>Language</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.slice(0, 30).map((row) =>
                <tr key={row.id}>
                    <td>{row.username || '-'}</td>
                    <td>{row.cin_number || '-'}</td>
                    <td>{row.filename || '-'}</td>
                    <td>{row.type || '-'}</td>
                    <td>{row.status || '-'}</td>
                    <td>{row.quality_score || 0}%</td>
                    <td>{row.detected_language || '-'}</td>
                  </tr>
                )}
                {reportRows.length === 0 ?
                <tr>
                    <td colSpan={7}>No report data for current filters.</td>
                  </tr> :
                null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-chart-card admin-glass">
          <h3>Archive Activity (Last 6 Months)</h3>
          <div className="admin-chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#006d77" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-chart-card admin-glass">
          <h3>Documents by Status</h3>
          <div className="admin-chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={chartData.documentsByStatus} dataKey="value" innerRadius={55} outerRadius={95}>
                  {chartData.documentsByStatus.map((entry, index) =>
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-chart-card admin-glass admin-chart-card-wide">
          <h3>Users by Role</h3>
          <div className="admin-chart-area">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData.usersByRole}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="role" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#e29578" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {loading && <p className="admin-loading-note">Loading analytics...</p>}
    </div>);

};

export default Reports;
