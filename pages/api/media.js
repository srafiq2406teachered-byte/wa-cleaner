export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var chatId = req.body.chatId;
  try {
    var client = global._waClient;
    if (!client) return res.status(503).json({ error: 'Not connected' });
    var allChats;
    if (chatId) {
      allChats = [await client.getChatById(chatId)];
    } else {
      var chats = await client.getChats();
      allChats = chats.filter(function(c) { return c.isGroup; }).slice(0, 15);
    }
    var mediaMessages = [];
    for (var i = 0; i < allChats.length; i++) {
      var chat = allChats[i];
      var messages = await chat.fetchMessages({ limit: 50 });
      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j];
        if (msg.hasMedia && ['image','video','document','audio'].indexOf(msg.type) !== -1) {
          mediaMessages.push({
            id: msg.id._serialized,
            chatId: chat.id._serialized,
            chatName: chat.name,
            type: msg.type,
            caption: msg.body || '',
            from: msg.author || msg.from,
            timestamp: msg.timestamp,
          });
        }
      }
    }
    mediaMessages.sort(function(a, b) { return a.timestamp - b.timestamp; });
    return res.json({ media: mediaMessages, total: mediaMessages.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
