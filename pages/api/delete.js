module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var body = req.body;
  var messageIds = body.messageIds || [];
  var chatId = body.chatId;
  var mode = body.mode;
  try {
    var client = global._waClient;
    if (!client) return res.status(503).json({ error: 'Not connected' });
    var deleted = 0;
    var errors = [];
    if (mode === 'purge-group' && chatId) {
      var chat = await client.getChatById(chatId);
      var messages = await chat.fetchMessages({ limit: 100 });
      for (var i = 0; i < messages.length; i++) {
        try { await messages[i].delete(false); deleted++; } catch (e) { errors.push(e.message); }
      }
    } else {
      for (var j = 0; j < messageIds.length; j++) {
        try {
          var msg = await client.getMessageById(messageIds[j]);
          if (msg) { await msg.delete(false); deleted++; }
        } catch (e) { errors.push(e.message); }
      }
    }
    return res.json({ deleted: deleted, errors: errors });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
