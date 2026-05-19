import { useState, useEffect, useRef } from 'react';

const PRIORITY_COLOR = {
  high: { bg: '#0d2b1e', border: '#1a5c3a', text: '#4ade80', dot: '#22c55e' },
  medium: { bg: '#1e1a0d', border: '#5c4a1a', text: '#fbbf24', dot: '#f59e0b' },
  low: { bg: '#1a1a1a', border: '#333', text: '#888', dot: '#555' },
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [view, setView] = useState('home');
  const [messages, setMessages] = useState([]);
  const [media, setMedia] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  const pollRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const pollStatus = async () => {
    try {
      const r = await fetch('/api/status');
      const data = await r.json();
      setStatus(data.status);
      if (data.qr) setQr(data.qr);
      if (data.status === 'connected') {
        setQr(null);
        clearInterval(pollRef.current);
      }
    } catch (e) {
      console.log('poll error', e);
    }
  };

  const connect = async () => {
    setStatus('connecting');
    await fetch('/api/status', { method: 'POST' });
    clearInterval(pollRef.current);
    pollRef.current = setInterval(pollStatus, 2000);
    setTimeout(() => clearInterval(pollRef.current), 120000);
  };

  useEffect(() => {
    pollStatus();
    return () => clearInterval(pollRef.current);
  }, []);

  const scan = async () => {
    setView('scan');
    setLoading(true);
    setLoadingMsg('Fetching and scoring your messages with AI...');
    setMessages([]);
    setStats(null);
    setSelected(new Set());
    try {
      const r = await fetch('/api/scan', { method: 'POST' });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setMessages(data.messages);
      setStats(data.stats);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const scanMedia = async () => {
    setView('media');
    setLoading(true);
    setLoadingMsg('Scanning group chats for media...');
    setMedia([]);
    setSelected(new Set());
    try {
      const r = await fetch('/api/media', { method: 'POST' });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setMedia(data.media);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setLoadingMsg('Deleting ' + selected.size + ' messages...');
    try {
      const r = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [...selected] }),
      });
      const data = await r.json();
      showToast('Deleted ' + data.deleted + ' messages');
      setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
      setMedia((prev) => prev.filter((m) => !selected.has(m.id)));
      setSelected(new Set());
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const purgeGroup = async (chatId, chatName) => {
    if (!confirm('Delete all messages in "' + chatName + '"? This cannot be undone.')) return;
    setLoading(true);
    setLoadingMsg('Purging ' + chatName + '...');
    try {
      const r = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, mode: 'purge-group' }),
      });
      const data = await r.json();
      showToast('Purged ' + data.deleted + ' messages from ' + chatName);
      setMessages((prev) => prev.filter((m) => m.chatId !== chatId));
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectAll = (priority) => {
    const ids = messages.filter((m) => !priority || m.priority === priority).map((m) => m.id);
    setSelected(new Set(ids));
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = messages.filter((m) => filter === 'all' || m.priority === filter);
  const groups = stats ? stats.groups : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          background: toast.type === 'error' ? '#3b0a0a' : '#0d2b1e',
          border: '1px solid ' + (toast.type === 'error' ? '#7f1d1d' : '#1a5c3a'),
          color: toast.type === 'error' ? '#f87171' : '#4ade80',
          padding: '10px 16px', borderRadius: 8, fontSize: 13,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0d2b1e', border: '1px solid #1a5c3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✦</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>WA Cleaner</div>
            <div style={{ fontSize: 11, color: '#555' }}>on-demand inbox control</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status === 'connected' ? '#22c55e' : status === 'qr_ready' ? '#f59e0b' : '#555',
            boxShadow: status === 'connected' ? '0 0 6px #22c55e' : 'none',
          }} />
          <span style={{ fontSize: 11, color: '#555' }}>
            {status === 'connected' ? 'connected' : status === 'qr_ready' ? 'scan QR' : status === 'connecting' ? 'connecting...' : 'disconnected'}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {qr && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Open WhatsApp on your phone</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Three dots menu → Linked Devices → Link a Device</div>
            <img src={qr} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid #222' }} />
            <div style={{ fontSize: 12, color: '#555', marginTop: 16 }}>Waiting for scan...</div>
          </div>
        )}

        {!qr && view === 'home' && (
          <div>
            {status !== 'connected' ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 22, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#fff', marginBottom: 8 }}>WhatsApp Cleaner</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 40 }}>AI-powered inbox cleanup, on your terms</div>
                <button onClick={connect} style={{ background: '#0d2b1e', border: '1px solid #1a5c3a', color: '#22c55e', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                  Connect WhatsApp
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>What would you like to do?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <ActionCard icon="⬡" title="Scan and rank" sub="AI scores all messages by importance" onClick={scan} accent="#22c55e" />
                  <ActionCard icon="◈" title="Find media" sub="Locate large files in group chats" onClick={scanMedia} accent="#f59e0b" />
                  <ActionCard icon="◉" title="Groups" sub="See group chats and bulk purge" onClick={() => { setView('groups'); scan(); }} accent="#818cf8" />
                  <ActionCard icon="◌" title="Keep vs delete" sub="Review AI recommendations" onClick={scan} accent="#f472b6" />
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 24, marginBottom: 16, display: 'inline-block' }}>◌</div>
            <div style={{ fontSize: 13, color: '#555' }}>{loadingMsg}</div>
          </div>
        )}

        {!loading && view === 'scan' && messages.length > 0 && (
          <div>
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                <StatCard label="scanned" value={stats.total} />
                <StatCard label="important" value={stats.high} color="#22c55e" />
                <StatCard label="medium" value={stats.medium} color="#f59e0b" />
                <StatCard label="noise" value={stats.low} color="#555" />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', 'high', 'medium', 'low'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 99,
                  border: '1px solid ' + (filter === f ? '#333' : '#1a1a1a'),
                  background: filter === f ? '#1a1a1a' : 'transparent',
                  color: filter === f ? '#fff' : '#555', cursor: 'pointer',
                }}>{f}</button>
              ))}
              <div style={{ flex: 1 }} />
              {selected.size > 0 && (
                <button onClick={deleteSelected} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid #7f1d1d', background: '#3b0a0a', color: '#f87171', cursor: 'pointer' }}>
                  Delete {selected.size} selected
                </button>
              )}
              <button onClick={() => selectAll('low')} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#888', cursor: 'pointer' }}>
                Select all noise
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((msg) => {
                const p = PRIORITY_COLOR[msg.priority];
                const sel = selected.has(msg.id);
                return (
                  <div key={msg.id} onClick={() => toggle(msg.id)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid ' + (sel ? p.border : '#1a1a1a'),
                    background: sel ? p.bg : '#111',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>{msg.chatName}</span>
                        {msg.isGroup && <span style={{ fontSize: 10, color: '#555' }}>group</span>}
                        <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto' }}>{formatTime(msg.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.hasMedia ? '[' + msg.mediaType + '] ' : ''}{msg.body}
                      </div>
                      <div style={{ fontSize: 10, color: p.text, marginTop: 4 }}>{msg.reason}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: p.text, flexShrink: 0 }}>{msg.score}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && view === 'media' && media.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#555' }}>{media.length} media files found in groups</span>
              <div style={{ flex: 1 }} />
              {selected.size > 0 && (
                <button onClick={deleteSelected} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid #7f1d1d', background: '#3b0a0a', color: '#f87171', cursor: 'pointer' }}>Delete {selected.size}</button>
              )}
              <button onClick={() => setSelected(new Set(media.map((m) => m.id)))} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#888', cursor: 'pointer' }}>Select all</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {media.map((m) => {
                const sel = selected.has(m.id);
                return (
                  <div key={m.id} onClick={() => toggle(m.id)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid ' + (sel ? '#5c4a1a' : '#1a1a1a'),
                    background: sel ? '#1e1a0d' : '#111',
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 16 }}>{m.type === 'image' ? '◫' : m.type === 'video' ? '▷' : m.type === 'audio' ? '♪' : '◻'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>{m.chatName}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{m.type} · {formatTime(m.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && view === 'groups' && groups.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Group chats — tap to bulk purge</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groups.map((g) => {
                const chatId = messages.find((m) => m.chatName === g) ? messages.find((m) => m.chatName === g).chatId : null;
                const count = messages.filter((m) => m.chatName === g).length;
                const noiseCount = messages.filter((m) => m.chatName === g && m.priority === 'low').length;
                return (
                  <div key={g} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #1a1a1a', background: '#111', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#ddd', fontFamily: "'DM Sans', sans-serif" }}>{g}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{count} messages · {noiseCount} noise</div>
                    </div>
                    <button onClick={() => purgeGroup(chatId, g)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid #7f1d1d', background: '#3b0a0a', color: '#f87171', cursor: 'pointer' }}>Purge</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'connected' && !loading && (
          <div style={{ display: 'flex', gap: 8, marginTop: 32, borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
            {[['home', '⊞', 'Home'], ['scan', '⬡', 'Scan'], ['media', '◈', 'Media'], ['groups', '◉', 'Groups']].map(function(item) {
              var v = item[0]; var icon = item[1]; var label = item[2];
              return (
                <button key={v} onClick={() => v === 'scan' ? scan() : v === 'media' ? scanMedia() : setView(v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid ' + (view === v ? '#333' : '#1a1a1a'),
                  background: view === v ? '#1a1a1a' : 'transparent',
                  color: view === v ? '#fff' : '#555', cursor: 'pointer',
                  fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, sub, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      background: '#111', border: '1px solid #1a1a1a', borderRadius: 10,
      padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}>
      <div style={{ fontSize: 20, marginBottom: 8, color: accent }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#ddd', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
      <div style={{ fontSize: 12, color: '#555' }}>{sub}</div>
    </button>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: color || '#ddd', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: '#555' }}>{label}</div>
    </div>
  );
}
