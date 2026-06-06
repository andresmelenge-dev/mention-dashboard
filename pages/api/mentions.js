import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ error: 'No session' });

  const { data: user } = await supabase.from('users').select('*').eq('id', sessionId).single();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  if (req.method === 'GET') {
    try {
      const query = encodeURIComponent('@' + user.display_name);
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

      const pending = messages
        .filter(m => !archivedLinks.has(m.permalink) && !deletedLinks.has(m.permalink))
        .map(m => ({
          id: m.ts, source: 'slack',
          channel: '#' + (m.channel?.name || 'directo'),
          message: (m.text || '').substring(0, 300),
          link: m.permalink,
          date: new Date(parseFloat(m.ts) * 1000).toISOString(),
          days: Math.floor((Date.now() - parseFloat(m.ts) * 1000) / 86400000)
        }));

      const { data: archivedItems } = await supabase
        .from('archived').select('*').eq('user_id', user.id)
        .order('archived_at', { ascending: false });

      return res.json({
        user: { name: user.display_name, avatar: user.avatar },
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
