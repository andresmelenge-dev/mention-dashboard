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
  const [sourceTab, setSourceTab] = useState('all');
  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedArchived, setSelectedArchived] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/mentions');
      if (res.status === 401) { router.push('/'); return; }
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  const handleLogout = () => {
    document.cookie = 'session=; Path=/; Max-Age=0';
    router.push('/');
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
  const tokenWarning = data?.user?.tokenWarning;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'Arial, sans-serif', color: COLORS.text }}>

      {/* Aviso token por expirar */}
      {tokenWarning && (
        <div style={{ background: '#4a3a00', borderBottom: `1px solid #ffd700`, padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#ffd700', fontSize: 13 }}>⚠️ Tu sesión de Slack lleva más de 23 horas activa. Si las menciones no cargan correctamente, vuelve a iniciar sesión.</span>
          <button onClick={handleLogout} style={{ background: '#ffd700', color: '#0f0f1a', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12 }}>Renovar sesión</button>
        </div>
      )}

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
          <button onClick={fetchData} style={{ background: COLORS.accent, color: '#0f0f1a', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>🔄 Actualizar</button>
          <button onClick={handleLogout} style={{ background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.border}`, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

        {/* Métricas */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <MetricCard label="Pendientes" value={pending.length} color={COLORS.accent} bg="#0d1525" />
          <MetricCard label="Gestionadas" value={archived.length} color={COLORS.green} bg="#0a1f14" />
          <MetricCard label="Urgentes" value={urgentes.length} color={urgentes.length > 0 ? COLORS.red : COLORS.green} bg={urgentes.length > 0 ? "#1f0505" : "#0a1f14"} />
          <MetricCard label="Resueltas 7D" value={resueltos7d.length} color="#44cc44" bg="#0a1f0a" />
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>

            {/* Tabs vista */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[{ key: 'pending', label: `⏳ Pendientes (${pending.length})` }, { key: 'archived', label: `📦 Archivados (${archived.length})` }].map(t => (
                <button key={t.key} onClick={() => { setView(t.key); setSearch(''); setSelectedArchived([]); }} style={{ background: view === t.key ? COLORS.accent : COLORS.card, color: view === t.key ? '#0f0f1a' : COLORS.muted, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>{t.label}</button>
              ))}
            </div>

            {/* Tabs fuente */}
            {view === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { key: 'all', label: `🔀 Todos (${pending.length})` },
                  { key: 'slack', label: `💬 Slack (${slackCount})` },
                  { key: 'clickup', label: `✅ ClickUp (${clickupCount})` }
                ].map(t => (
                  <button key={t.key} onClick={() => setSourceTab(t.key)} style={{ background: sourceTab === t.key ? '#2d0a3e' : COLORS.card, color: sourceTab === t.key ? COLORS.purple : COLORS.muted, border: `1px solid ${sourceTab === t.key ? COLORS.purple : COLORS.border}`, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{t.label}</button>
                ))}
              </div>
            )}

            {/* Búsqueda */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.muted, fontSize: 14 }}>🔍</span>
              <input type="text" placeholder="Buscar por canal, mensaje o palabra clave..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>

            {/* Lista pendientes */}
            {view === 'pending' && (
              filteredPending.length === 0 ? (
                <div style={{ background: COLORS.card, borderRadius: 12, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ color: COLORS.muted }}>{search ? 'No hay resultados para tu búsqueda' : 'Todo al día — no hay menciones pendientes'}</div>
                </div>
              ) : (
                filteredPending.map((item, i) => <MentionCard key={i} item={item} onArchive={handleArchive} onDelete={handleDelete} />)
              )
            )}

            {/* Lista archivados */}
            {view === 'archived' && (
              <>
                {selectedArchived.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2a0a0a', border: `1px solid #4a1a1a`, borderRadius: 8, padding: '10px 16px', marginBottom: 12 }}>
                    <span style={{ color: COLORS.red, fontSize: 13 }}>{selectedArchived.length} seleccionado(s)</span>
                    <button onClick={handleDeleteArchived} style={{ background: COLORS.red, color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>🗑️ Eliminar seleccionados</button>
                  </div>
                )}
                {filteredArchived.length === 0 ? (
                  <div style={{ background: COLORS.card, borderRadius: 12, padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div style={{ color: COLORS.muted }}>{search ? 'No hay resultados' : 'No hay items archivados aún'}</div>
                  </div>
                ) : (
                  filteredArchived.map((item, i) => (
                    <div key={i} style={{ background: selectedArchived.includes(item.id) ? '#1a1a3a' : COLORS.card, border: `1px solid ${selectedArchived.includes(item.id) ? COLORS.accent : COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={selectedArchived.includes(item.id)} onChange={() => toggleSelectArchived(item.id)} style={{ marginTop: 4, cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 13 }}>{item.channel}</span>
                            <span style={{ color: COLORS.muted, fontSize: 11 }}>Gestionado: {new Date(item.archived_at).toLocaleDateString('es-CO')}</span>
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer" style={{ color: COLORS.accent, fontSize: 12, textDecoration: 'none' }}>🔗 Ver mensaje</a>
                        </div>
                        <p style={{ color: '#aaaaaa', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{item.message?.substring(0, 200)}</p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Top canales */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ background: COLORS.card, borderRadius: 12, padding: 16 }}>
              <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>🏆 Top Canales</div>
              {topCanales.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: COLORS.muted, fontSize: 12, width: 20 }}>#{i + 1}</span>
                    <span style={{ color: COLORS.text, fontSize: 12 }}>{c.nombre.length > 18 ? c.nombre.substring(0, 18) + '...' : c.nombre}</span>
                  </div>
                  <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 'bold' }}>{c.total}</span>
                </div>
              ))}
              {topCanales.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>Sin datos aún</div>}
            </div>
            <div style={{ background: '#111122', borderRadius: 12, padding: 14, marginTop: 12 }}>
              <div style={{ color: '#666688', fontSize: 12, lineHeight: 1.5 }}>💡 Los canales del top 3 representan tu mayor carga — úsalo en tus reuniones de SLA.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
