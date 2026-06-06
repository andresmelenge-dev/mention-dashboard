import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resolveSlackText(text, token) {
  const allIds = [...new Set([...text.matchAll(/<@([A-Z0-9]+)(?:\|[^>]*)?>/g)].map(m => m[1]))];
  const names = {};
  await Promise.all(allIds.map(async id => {
    try {
      const r = await fetch(`https://slack.com/api/users.info?user=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await r.json();
      names[id] = d.user?.display_name || d.user?.real_name || id;
    } catch { names[id] = id; }
  }));
  return text
    .replace(/<@([A-Z0-9]+)(?:\|[^>]*)?>/g, (_, id) => `@${names[id] || id}`)
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/:\w+:/g, '')
    .trim();
}

export default async function handler(req, res) {
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ error: 'No session' });

  const { data: user } = await supabase.from('users').select('*').eq('id', sessionId).single();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  if (req.method === 'GET') {
    try {
      const slackId = user.slack_user_id;
      const query = encodeURIComponent('@' + slackId);
      const slackRes = await fetch(
        `https://slack.com/api/search.messages?query=${query}&count=100&sort=timestamp`,
        { headers: { 'Authorization': `Bearer ${user.slack_token}` } }
      );
      const slackData = await slackRes.json();
      const messages = slackData.messages?.matches || [];

      const { data: archived } = await supabase.from('archived').select('link').eq('user_id', user.id);
      const { data: deleted } = await supabase.from('deleted_mentions').select('link').eq('user_id', user.id);
      const archivedLinks = new Set((archived || []).map(a => a.link));
      const deletedLinks = new Set((deleted || []).map(d => d.link));

      const pending = await Promise.all(
        messages
          .filter(m => !archivedLinks.has(m.permalink) && !deletedLinks.has(m.permalink))
          .map(async m => ({
            id: m.ts,
            source: 'slack',
            channel: '#' + (m.channel?.name || 'directo'),
            message: await resolveSlackText((m.text || '').substring(0, 500), user.slack_token),
            link: m.permalink,
            date: new Date(parseFloat(m.ts) * 1000).toISOString(),
            days: Math.floor((Date.now() - parseFloat(m.ts) * 1000) / 86400000)
          }))
      );

      const { data: archivedItems } = await supabase
        .from('archived').select('*').eq('user_id', user.id)
        .order('archived_at', { ascending: false });

      const tokenAge = Date.now() - new Date(user.updated_at).getTime();
      const tokenWarning = tokenAge > 23 * 60 * 60 * 1000;

      return res.json({
        user: { name: user.display_name, avatar: user.avatar, tokenWarning },
        pending,
        archived: archivedItems || []
      });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action, item, ids } = req.body;

    if (action === 'archive') {
      await supabase.from('archived').insert({
        user_id: user.id, source: item.source, channel: item.channel,
        message: item.message, link: item.link,
        mention_date: item.date, archived_at: new Date().toISOString()
      });
      return res.json({ ok: true });
    }

    if (action === 'delete') {
      await supabase.from('deleted_mentions').insert({
        user_id: user.id, link: item.link, deleted_at: new Date().toISOString()
      });
      return res.json({ ok: true });
    }

    if (action === 'deleteArchived') {
      await supabase.from('archived').delete().in('id', ids).eq('user_id', user.id);
      return res.json({ ok: true });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
