import React, { useEffect, useMemo, useState } from 'react';
import { documents } from '../../services/api';
import './Notifications.css';

const STORAGE_KEY = 'smartarchive.notifications';

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError('');

      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (Array.isArray(saved) && saved.length) {
            setItems(saved);
            return;
          }
        }

        const historyResponse = await documents.getHistory();
        const rows = Array.isArray(historyResponse.data) ? historyResponse.data : [];
        const generated = rows.slice(0, 20).map((row) => ({
          id: row.id,
          type: ['processed', 'verified'].includes(String(row.status || '').toLowerCase()) ? 'success' : 'info',
          title: ['processed', 'verified'].includes(String(row.status || '').toLowerCase()) ?
          'Document processed' :
          'Document received',
          message: `${row.name || row.filename || 'Document'} is ${row.status || 'pending review'}`,
          date: row.uploadDate || row.created_at || new Date().toISOString(),
          read: false
        }));
        setItems(generated);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError('Unable to load notifications right now.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') {
      return items.filter((item) => !item.read);
    }
    if (filter === 'read') {
      return items.filter((item) => item.read);
    }
    return items;
  }, [filter, items]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const markAsRead = (id) => {
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const markAllAsRead = () => {
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  };

  const clearRead = () => {
    setItems((previous) => previous.filter((item) => !item.read));
  };

  return (
    <div className="notifications-page">
			<div className="notifications-header">
				<div>
					<h2>Notifications</h2>
					<p>{unreadCount} unread</p>
				</div>
				<div className="notifications-actions">
					<button type="button" onClick={markAllAsRead} disabled={!items.length || unreadCount === 0}>
						Mark all as read
					</button>
					<button type="button" onClick={clearRead} disabled={!items.some((item) => item.read)}>
						Clear read
					</button>
				</div>
			</div>

			<div className="notifications-filter">
				<button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
					All
				</button>
				<button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
					Unread
				</button>
				<button type="button" className={filter === 'read' ? 'active' : ''} onClick={() => setFilter('read')}>
					Read
				</button>
			</div>

			{loading ? <p className="notifications-state">Loading notifications...</p> : null}
			{!loading && error ? <p className="notifications-state error">{error}</p> : null}
			{!loading && !error && filteredItems.length === 0 ?
      <p className="notifications-state">No notifications for this filter.</p> :
      null}

			{!loading && !error && filteredItems.length > 0 ?
      <div className="notifications-list">
					{filteredItems.map((item) =>
        <article key={item.id} className={`notification-item ${item.read ? 'read' : 'unread'}`}>
							<div className={`notification-dot ${item.type}`} />
							<div className="notification-content">
								<h3>{item.title}</h3>
								<p>{item.message}</p>
								<small>{new Date(item.date).toLocaleString()}</small>
							</div>
							{!item.read ?
          <button type="button" onClick={() => markAsRead(item.id)}>
									Mark read
								</button> :
          null}
						</article>
        )}
				</div> :
      null}
		</div>);

};

export default Notifications;
