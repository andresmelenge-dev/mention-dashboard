import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    // 1. Intercambiamos el código temporal por el Token Real de Slack
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.NEXT_PUBLIC_URL + '/api/auth/callback'
      })
    });
    
    const tokenData = await tokenRes.json();

    // Si Slack nos da un error, detenemos el proceso y avisamos
    if (!tokenData.ok) {
      return res.redirect(`/?error=${tokenData.error || 'slack_auth_failed'}`);
    }

    // 2. Extraemos los datos clave que nos devolvió Slack
    const slackUserId = tokenData.authed_user.id;
    const slackAccessToken = tokenData.authed_user.access_token;
    const teamName = tokenData.team?.name || 'Workspace';

    // 3. Guardamos o actualizamos los datos en Supabase automáticamente
    // Si el usuario ya existe, actualiza su token. Si no, lo crea (upsert).
    const { error: dbError } = await supabase
      .from('users')
      .upsert(
        { 
          slack_user_id: slackUserId, 
          slack_access_token: slackAccessToken,
          name: teamName
        }, 
        { onConflict: 'slack_user_id' }
      );

    if (dbError) {
      return res.status(500).json({ error: "Error al guardar en Supabase: " + dbError.message });
    }

    // 4. ¡ÉXITO! En lugar de mostrar el texto plano, mandamos al usuario al inicio con su sesión activa
    // Guardamos temporalmente el ID en la URL para que la pantalla sepa quién es.
    return res.redirect(`/?user_id=${slackUserId}`);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
