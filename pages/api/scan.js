module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    var client = global._waClient;
    if (!client) return res.status(503).json({ error: 'Not connected to WhatsApp' });
    var Anthropic = require('@anthropic-ai/sdk');
    var ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    var chats = await client.getChats();
    var results = [];
    for (var i = 0; i < Math.min(chats.length, 20); i++) {
      var chat = chats[i];
      var messages = await chat.fetchMessages({ limit: 15 });
      var formatted = [];
      for (var j = 0; j < messages.length; j++) {
        var m = messages[j];
        if (!m.fromMe) {
          formatted.push({
            id: m.id._serialized,
            chatId: chat.id._serialized,
            chatName: chat.name,
            isGroup: chat.isGroup,
            from: m.author || m.from,
            body: m.body,
            hasMedia: m.hasMedia,
            mediaType: m.type,
            timestamp: m.timestamp,
          });
        }
      }
      if (formatted.length === 0) continue;
      var batch = [];
      for (var k = 0; k < Math.min(formatted.length, 10); k++) {
        batch.push({
          id: k,
          chat: formatted[k].chatName,
          isGroup: formatted[k].isGroup,
          body: formatted[k].body ? formatted[k].body.slice(0, 150) : '[media]',
        });
      }
      var prompt = 'Score these WhatsApp messages 1-10. 8-10=important/action needed, 5-7=useful, 1-4=noise/group chatter. Return ONLY JSON array: [{"id":0,"score":7,"reason":"reason"}]\n\n' + JSON.stringify(batch);
      var response = await ai.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      var raw = response.content[0].text.trim();
      var start = raw.indexOf('[');
      var end = raw.lastIndexOf(']') + 1;
      var scores = JSON.parse(raw.slice(start, end));
      for (var l = 0; l < Math.min(formatted.length, 10); l++) {
        var found = null;
        for (var n = 0; n < scores.length; n++) {
          if (scores[n].id === l) { found = scores[n]; break; }
        }
        var s = found || { score: 5, reason: '' };
        results.push(Object.assign({}, formatted[l], {
          score: s.score,
          reason: s.reason,
          priority: s.score >= 8 ? 'high' : s.score >= 5 ? 'medium' : 'low',
        }));
      }
    }
    results.sort(function(a, b) { return b.score - a.score; });
    return res.json({
      messages: results,
      stats: {
        total: results.length,
        high: results.filter(function(m) { return m.priority === 'high'; }).length,
        medium: results.filter(function(m) { return m.priority === 'medium'; }).length,
        low: results.filter(function(m) { return m.priority === 'low'; }).length,
        groups: results.filter(function(m) { return m.isGroup; }).map(function(m) { return m.chatName; }).filter(function(v, i, a) { return a.indexOf(v) === i; }),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
