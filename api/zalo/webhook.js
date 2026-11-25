const DEFAULT_BOT_TOKEN = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
const FIRESTORE_API_KEY = 'AIzaSyA-Ikh0okAVnGJ9IClc1qI5sR3tYFKRnqY';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-zalo-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET Challenge verification từ Zalo Platform
  if (req.method === 'GET') {
    const challenge = req.query?.challenge || req.query?.['hub.challenge'];
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(200).json({ status: 'OK', service: 'NSG Zalo Webhook' });
  }

  // 2. POST Webhook Updates từ Zalo
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const message = body.message || {};
      const from = message.from || {};
      const chat = message.chat || {};
      const sender = body.sender || {};

      const chatId = String(chat.id || from.id || sender.id || body.chat_id || body.user_id_by_app || '').trim();
      const senderName = from.display_name || from.first_name || sender.name || 'Quản lý NSG';
      const text = (message.text || body.text || '').trim();

      console.log(`[ZaloWebhook] Incoming message from chatId: ${chatId} (${senderName}):`, text);

      if (chatId) {
        // Lưu Chat ID vào Firestore qua REST API
        try {
          const patchUrl = `https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?updateMask.fieldPaths=lastChatId&updateMask.fieldPaths=lastSenderName&updateMask.fieldPaths=lastActiveAt&key=${FIRESTORE_API_KEY}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                lastChatId: { stringValue: String(chatId) },
                lastSenderName: { stringValue: String(senderName) },
                lastActiveAt: { stringValue: new Date().toISOString() }
              }
            })
          });
          console.log(`[ZaloWebhook] Persisted Chat ID ${chatId} to Cloud Firestore.`);
        } catch (dbErr) {
          console.warn('[ZaloWebhook] Error persisting to Firestore:', dbErr.message);
        }

        // Tự động trả lời chào mừng và gửi Chat ID về Zalo cho người dùng
        const botToken = process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN;
        const replyText = `👋 Xin chào <b>${senderName}</b>!\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 <b>Bot Phản Ánh NSG</b> đã kết nối thành công với tài khoản Zalo của bạn.\n` +
          `📌 <b>Chat ID của bạn:</b> <code>${chatId}</code>\n` +
          `✅ Hệ thống đã tự động lưu Chat ID này!\n` +
          `👉 Bạn hãy quay lại trang web NSG Support, vào Cài đặt và bấm <b>"Lấy Chat ID tự động"</b> để hoàn tất kết nối nhận thông báo sự cố nhé!`;

        await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'html'
          })
        }).catch(e => console.warn('[ZaloWebhook] Auto-reply error:', e.message));
      }

      return res.status(200).json({ ok: true, chatId: chatId || null });
    } catch (err) {
      console.error('[ZaloWebhook] Handler error:', err.message);
      return res.status(200).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
