import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.body;
  if (!token || !token.startsWith('xoxp-')) return res.status(400).json({ ok: false });

  try {
    const testRes = await fetch(`https://slack.com/api/auth.test?token=${token}`);
    const testData = await testRes.json();
    if (!testData.ok) return res.json({ ok: false });

    const profileRes = await fetch('https://slack.com/api/users.profile.get', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    const displayName = profileData.profile?.display_name || profileData.profile?.real_name || 'Usuario';
    const avatar = profileData.profile?.image_72 || '';
    const slackUserId = testData.user_id;

    const { data: user, error } = await supabase
      .from('users')
      .upsert({ slack_user_id: slackUserId, display_name: displayName, avatar, slack_token: token, updated_at: new Date().toISOString() }, { onConflict: 'slack_user_id' })
      .select().single();

    if (error) return res.json({ ok: false });

    res.setHeader('Set-Cookie', `session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
}
