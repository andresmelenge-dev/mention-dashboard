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
    if (!tokenData.ok) return res.redirect('/?error=token_failed');

    const accessToken = tokenData.authed_user?.access_token;
    const slackUserId = tokenData.authed_user?.id;

    const profileRes = await fetch('https://slack.com/api/users.profile.get', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const profileData = await profileRes.json();
    const displayName = profileData.profile?.display_name || profileData.profile?.real_name || 'Usuario';
    const avatar = profileData.profile?.image_72 || '';

    const { data: user, error } = await supabase
      .from('users')
      .upsert({ slack_user_id: slackUserId, display_name: displayName, avatar, slack_token: accessToken, updated_at: new Date().toISOString() }, { onConflict: 'slack_user_id' })
      .select().single();

    if (error) return res.redirect('/?error=db_error');

    res.setHeader('Set-Cookie', `session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.redirect('/dashboard');
  } catch (err) {
    return res.redirect('/?error=server_error');
  }
}
