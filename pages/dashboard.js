import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const COLORS = {
  bg: '#0f0f1a', card: '#16162a', header: '#1a1a2e',
  accent: '#7b9fff', purple: '#bb86fc', green: '#00e5a0',
  red: '#ff4444', yellow: '#ffd700', text: '#ffffff',
  muted: '#8888aa', border: '#2a2a4a'
};

function SemaforoTag({ days }) {
  if (days === 0) return <span style={{ background: '#1a4a2a', color: '#00e5a0', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>🟢 Hoy</span>;
  if (days <= 2) return <span style={{ background: '#4a3a00', color: '#ffd700', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>🟡 {days} día(s)</span>;
  return <span style={{ background: '#4a0f0f', color: '#ff4444', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>🔴 {days} días</span>;
}

function MetricCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg || COLORS.card, borderRadius: 12, padding: '20px 16px', textAlign: 'center', flex: 1, minWidth: 120 }}>
      <div style={{ color: color || COLORS.accent, fontSize: 36, fontWeight: 'bold', lineHeight: 1 }}>{value}</div>
      <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function MentionCard({ item, onArchive, onDelete }) {
  const rowBg = item.days === 0 ? '#0d1f14' : item.days <= 2 ? '#1a1a00' : '#1a0505';
  return (
    <div style={{ background: rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ background: '#2d0a3e', color: COLORS.purple, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 'bold' }}>
              {item.source === 'slack' ? '💬 SLACK' : '✅ CLICKUP'}
            </span>
            <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 'bold' }}>{item.channel}</span>
            <SemaforoTag days={item.days} />
            <span style={{ color: COLORS.muted, fontSize: 11 }}>
              {new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p style={{ color: '#cccccc', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{item.message}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <a href={item.link} target="_blank" rel="noreferrer" style={{ background: COLORS.accent, color: '#0f0f1a', padding: '6px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap', textAlign: 'center' }}>🔗 Ir al mensaje</a>
          <button onClick={() => onArchive(item)} style={{ background: '#1a4a2a', color: COLORS.green, padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap' }}>✅ Gestionar</button>
          <button onClick={() => onDelete(item)} style={{ background: '#2a0a0a', color: COLORS.red, padding: '6px 12px', border: `1px solid #4a1a1a`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap' }}>🗑️ Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceTab, setSourceTab] = useState('all');
  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedArchived, setSelectedArchived] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [clickupToken, setClickupToken] = useState('');
  const [savingClickup, setSavingClickup] = useState(false);
  const [clickupMsg, setClickupMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/mentions');
      if (res.status === 401) { router.push('/'); return; }
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleArchive = async (item) => {
    await fetch('/api/mentions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', item })
    });
    fetchData();
  };

  const handleDelete = async (item) => {
    await fetch('/api/mentions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', item })
    });
    fetchData();
  };

  const handleDeleteArchived = async () => {
    if (selectedArchived.length === 0) return;
    await fetch('/api/mentions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteArchived', ids: selectedArchived })
    });
    setSelectedArchived([]);
    fetchData();
  };

  const toggleSelectArchived = (id) => {
    setSelectedArchived(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSaveClickup = async () => {
    if (!clickupToken.startsWith('pk_')) {
      setClickupMsg('El token debe empezar con pk_');
      return;
    }
    setSavingClickup(true);
    setClickupMsg('');
    const res = await fetch('/api/auth/clickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: clickupToken })
    });
    const d = await res.json();
    if (d.ok) {
      setClickupMsg('✅ ClickUp conectado correctamente');
      setClickupToken('');
      fetchData();
    } else {
      setClickupMsg('❌ Token inválido. Verifica que sea correcto.');
    }
    setSavingClickup(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.muted, fontSize: 18 }}>Cargando menciones...</div>
    </div>
  );

  const pending = data?.pending || [];
  const archived = data?.archived || [];
  const urgentes = pending.filter(m => m.days >= 3);
  const resueltos7d = archived.filter(a => (Date.now() - new Date(a.archived_at).getTime()) < 7 * 24 * 60 * 60 * 1000);

  const canalCount = {};
  pending.forEach(m => { const c = m.channel || 'directo'; canalCount[c] = canalCount[c] || { pend: 0, arch: 0 }; canalCount[c].pend++; });
  archived.forEach(m => { const c = m.channel || 'directo'; canalCount[c] = canalCount[c] || { pend: 0, arch: 0 }; canalCount[c].arch++; });
  const topCanales = Object.entries(canalCount).map(([nombre, v]) => ({ nombre, ...v, total: v.pend + v.arch })).sort((a, b) => b.total - a.total).slice(0, 5);

  const filteredPending = pending
    .filter(m => sourceTab === 'all' || m.source === sourceTab)
    .filter(m => search === '' || m.message?.toLowerCase().includes(search.toLowerCase()) || m.channel?.toLowerCase().includes(search.toLowerCase()));

  const filteredArchived = archived
    .filter(m => search === '' || m.message?.toLowerCase().includes(search.toLowerCase()) || m.channel?.toLowerCase().includes(search.toLowerCase()));

  const slackCount = pending.filter(m => m.source === 'slack').length;
  const clickupCount = pending.filter(m => m.source === 'clickup').length;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'Arial, sans-serif', color: COLORS.text }}>

      {/* Header */}
      <div style={{ background: COLORS.header, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Mention Dashboard</div>
            <div style={{ color: COLORS.muted, fontSize: 12 }}>{data?.user?.name && `👤 ${data.user.name}`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && <span style={{ color: COLORS.muted, fontSize: 12 }}>Actualizado: {lastUpdate.toLocaleTimeString('es-CO')}</span>}
          <button onClick={() => setShowConfig(!showConfig)} style={{ background: COLORS.card, color: COLORS.muted, border: `1px solid ${COLORS.border}`, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>⚙️ Config</button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ background: refreshing ? '#3a4a6a' : COLORS.accent, color: '#0f0f1a', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: refreshing ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: 13 }}
          >
            {refreshing ? '⏳ Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Panel Config ClickUp */}
      {showConfig && (
        <div style={{ background: '#1a1a2e', borderBottom: `1px solid ${COLORS.border}`, padding: '20px 24px' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 12, color: COLORS.purple }}>⚙️ Conectar ClickUp</div>
            <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>
              Ve a <strong style={{ color: COLORS.text }}>app.clickup.com</strong> → tu avatar → Settings → Apps → copia tu API Token
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                value={clickupToken}
                onChange={e => setClickupToken(e.target.value)}
                placeholder="pk_..."
                style={{ flex: 1, padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color:
