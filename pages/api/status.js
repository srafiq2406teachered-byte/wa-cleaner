module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (global._waStatus === 'connected') {
        return res.json({ status: 'connected', qr: null });
      }
      global._waStatus = 'connecting';
      global._waQr = null;
      var Client = require('whatsapp-web.js').Client;
      var LocalAuth = require('whatsapp-web.js').LocalAuth;
      var QRCode = require('qrcode');
      var client = new Client({
        authStrategy: new LocalAuth({ dataPath: '/tmp/wa-session' }),
        puppeteer: {
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        },
      });
      client.on('qr', async function(qr) {
        global._waQr = await QRCode.toDataURL(qr);
        global._waStatus = 'qr_ready';
      });
      client.on('ready', function() {
        global._waStatus = 'connected';
        global._waClient = client;
        global._waQr = null;
      });
      client.on('disconnected', function() {
        global._waStatus = 'disconnected';
        global._waClient = null;
      });
      client.initialize().catch(function(e) {
        global._waStatus = 'disconnected';
      });
      return res.json({ status: 'connecting', qr: null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.json({
    status: global._waStatus || 'disconnected',
    qr: global._waQr || null,
  });
};
