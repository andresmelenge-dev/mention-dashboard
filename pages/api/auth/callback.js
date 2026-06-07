import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');
  try {
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
    // LOG TEMPORAL — muestra respuesta completa de Slack
    return res.json(tokenData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
