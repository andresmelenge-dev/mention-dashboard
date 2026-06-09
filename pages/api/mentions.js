import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getClickUpMentions(clickupToken, clickupUserId) {
  try {
    // Obtener equipos
    const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
      headers: { 'Authorization': clickupToken }
    });
    const teamsData = await teamsRes.json();
    const teams = teamsData.teams || [];

    const mentions = [];

    for (const team of teams) {
      // Buscar comentarios donde se menciona al usuario
      const res = await fetch(
        `https://api.clickup.com/api/v2/team/${team.id}/comment?` +
        new URLSearchParams({ assignee: clickupUserId }),
        { headers: { 'Authorization': clickupToken } }
      );
      const data = await res.json();
      const comments = data.comments || [];

      for (const comment of comments) {
        const text = comment.comment_text || '';
        if (text.includes(`@${clickupUserId}`) || comment.assigned_by) {
          mentions.push({
            id: comment.id,
            source: 'clickup',
            channel: comment.parent || 'ClickUp',
            message: text.substring(0, 300),
            link: `https://app.clickup.com/t/${comment.item_id}`,
            date: new Date(comment.date).toISOString(),
            days: Math.floor((Date.now() - parseInt(comment.date)) / 86400000)
          });
        }
      }
    }
    return mentions;
  } catch (err) {
    return [];
  }
}

export default async function handler(req, res) {
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ error: 'No session' });
  const { data: user } = await supabase.from('users').select('*').eq('id', sessionId).single();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  if (req.method === 'GET') {
    try {
      // Slack mentions
      let slackMentions = [];
      if (user.slack_token) {
        const query = encodeURIComponent(`<@${user.slack_user_id}>`);
        const slackRes = await fetch(
          `https://slack.com/api/search.messages?query=${query}&count=100&sort=timestamp`,
          { headers: { 'Authorization': `Bearer ${user.slack_token}` } }
        );
        const slackData = await slackRes.json();
        const messages = slackData.messages?.matches || [];
        slackMentions = messages.map(m => ({
          id: m.ts, source: 'slack',
          channel: '#' + (m.channel?.name || 'directo'),
          message: (m.text || '').substring(0, 300),
          link: m.permalink,
          date: new Date(parseFloat(m.ts) * 1000).toISOString(),
          days: Math.floor((Date.now() - parseFloat(m.ts) * 1000) / 86400000)
        }));
      }

      // ClickUp mentions
      let clickupMentions = [];
      if (user.clickup_token && user.clickup_user_id) {
        clickupMentions = await getClickUpMentions(user.clickup_token, user.clickup_user_id);
      }

      const allMentions = [...slackMentions, ...clickupMentions];

      const { data: archived } = await supabase.from('archived').select('link').eq('user_id', user.id);
      const archivedLinks = new Set((archived || []).map(a => a.link));

      const pending = allMentions.filter(m => !archivedLinks.has(m.link));

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
    const { action, item } = req.body;
    if (action === 'archive') {
      await supabase.from('archived').insert({
        user_id: user.id, source: item.source, channel: item.channel,
        message: item.message, link: item.link,
        mention_date: item.date, archived_at: new Date().toISOString()
      });
      return res.json({ ok: true });
    }
  }
  res.status(405).json({ error: 'Method not allowed' });
}
