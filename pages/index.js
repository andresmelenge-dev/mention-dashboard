export default function Home() {
  const SLACK_CLIENT_ID = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const REDIRECT_URI = encodeURIComponent(process.env.NEXT_PUBLIC_URL + '/api/auth/callback');
  const SCOPES = 'channels:read,groups:read,im:read,mpim:read,search:read,users.profile:read,users:read';
  const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&user_scope=${SCOPES}&redirect_uri=${REDIRECT_URI}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f1a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ color: '#ffffff', fontSize: 32, fontWeight: 'bold', margin: '0 0 12px' }}>
          Mention Dashboard
        </h1>
        <p style={{ color: '#8888aa', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
          Centraliza todas tus menciones de Slack en un solo lugar.
          Inicia sesión con tu cuenta de Slack para continuar.
        </p>
        <a href={slackUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          background: '#4A154B', color: '#ffffff', padding: '16px 32px',
          borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 'bold'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          Iniciar sesión con Slack
        </a>
        <p style={{ color: '#555577', fontSize: 13, marginTop: 32 }}>
          Gratis · Sin publicidad · Tus datos son solo tuyos
        </p>
      </div>
    </div>
  );
}
