import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.body;
  if (!token || !token.startsWith('xoxp-')) return res.json({ ok: false });

  try {
    // Buscar usuario existente por token parcial o crear uno nuevo
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', 'U092PG64H6F')
      .single();

    let userId;
    if (existingUser) {
      await supabase.from('users').update({
        slack_token: token,
        updated_at: new Date().toISOString()
      }).eq('id', existingUser.id);
      userId = existingUser.id;
    } else {
      const { data: newUser } = await supabase.from('users').insert({
        slack_user_id: 'U092PG64H6F',
        display_name: 'Andres Melenge',
        slack_token: token,
        updated_at: new Date().toISOString()
      }).select().single();
      userId = newUser.id;
    }

    res.setHeader('Set-Cookie', `session=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
}
