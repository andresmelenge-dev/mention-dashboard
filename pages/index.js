import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!token.startsWith('xoxp-')) {
      setError('El token debe empezar con xoxp-');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (data.ok) {
      router.push('/dashboard');
    } else {
      setError('Token inválido. Verifica que sea correcto.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1a1d2e', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
        <h1 style={{ color: '#fff', marginBottom: '8px', fontSize: '24px' }}>📋 Mention Dashboard</h1>
        <p style={{ color: '#888', marginBottom: '32px' }}>Pega tu token personal de Slack para continuar</p>
        <label style={{ color: '#ccc', fontSize: '14px' }}>Tu token de Slack (xoxp-...)</label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="xoxp-..."
          style={{ width: '100%', padding: '12px', marginTop: '8px', marginBottom: '16px', background: '#0f1117', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
        />
        {error && <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#4f46e5', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
        <div style={{ marginTop: '24px', padding: '16px', background: '#0f1117', borderRadius: '8px' }}>
          <p style={{ color: '#888', fontSize: '13px', margin: '0 0 8px 0' }}>¿Cómo obtengo mi token?</p>
          <ol style={{ color: '#666', fontSize: '12px', paddingLeft: '16px', margin: 0 }}>
            <li>Ve a <a href="https://api.slack.com/legacy/custom-integrations/legacy-tokens" target="_blank" style={{ color: '#4f46e5' }}>api.slack.com/legacy/custom-integrations/legacy-tokens</a></li>
            <li>Busca el workspace "Somos"</li>
            <li>Haz clic en "Create token"</li>
            <li>Copia el token y pégalo arriba</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
