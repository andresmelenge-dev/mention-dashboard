import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ ok: false });

  const { data: user } = await supabase.from('users').select('*').eq('id', sessionId).single();
  if (!user) return res.status(401).json({ ok: false });

  const { token } = req.body;
  if (!token || !token.startsWith('pk_')) return res.json({ ok: false });

  try {
    // Verificar token y obtener user ID de ClickUp
    const testRes = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { 'Authorization': token }
    });
    const testData = await testRes.json();
    
    if (!testData.user) return res.json({ ok: false });

    const clickupUserId = String(testData.user.id);

    await supabase.from('users').update({
      clickup_token: token,
      clickup_user_id: clickupUserId
    }).eq('id', user.id);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
}
