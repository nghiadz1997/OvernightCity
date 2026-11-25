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

      const rawChatId = String(chat.id || from.id || sender.id || body.chat_id || body.user_id_by_app || '').trim();
      const senderName = from.display_name || from.first_name || sender.name || 'Quản lý NSG';
      const text = (message.text || body.text || '').trim();

      console.log(`[ZaloWebhook] Incoming message from chatId: ${rawChatId} (${senderName}):`, text);

      if (rawChatId) {
        const isGroup = rawChatId.startsWith('zgr-');
        // Lưu Chat ID vào Firestore qua REST API
        try {
          const updateFields = {
            lastActiveAt: { stringValue: new Date().toISOString() },
            lastSenderName: { stringValue: String(senderName) }
          };
          const mask = ['updateMask.fieldPaths=lastActiveAt', 'updateMask.fieldPaths=lastSenderName'];

          if (isGroup) {
            updateFields.groupChatId = { stringValue: rawChatId };
            mask.push('updateMask.fieldPaths=groupChatId');
          } else {
            updateFields.lastChatId = { stringValue: rawChatId };
            mask.push('updateMask.fieldPaths=lastChatId');
          }

          const patchUrl = `https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?${mask.join('&')}&key=${FIRESTORE_API_KEY}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ fields: updateFields })
          });
          console.log(`[ZaloWebhook] Persisted Chat ID ${rawChatId} (${isGroup ? 'GROUP' : 'PERSONAL'}) to Cloud Firestore.`);
        } catch (dbErr) {
          console.warn('[ZaloWebhook] Error persisting to Firestore:', dbErr.message);
        }

        // Tự động trả lời chào mừng và xác nhận kết nối
        const botToken = process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN;
        const replyText = isGroup
          ? `👋 Xin chào các thành viên nhóm!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 <b>Bot Phản Ánh NSG</b> đã kết nối thành công với Nhóm Zalo này.\n` +
            `📌 <b>Group Chat ID:</b> <code>${rawChatId}</code>\n` +
            `✅ Hệ thống website đã sẵn sàng tự động bắn mọi thông báo phản ánh sự cố mới vào nhóm này!`
          : `👋 Xin chào <b>${senderName}</b>!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 <b>Bot Phản Ánh NSG</b> đã kết nối thành công với tài khoản Zalo của bạn.\n` +
            `📌 <b>Chat ID của bạn:</b> <code>${rawChatId}</code>\n` +
            `✅ Hệ thống đã tự động lưu Chat ID này!\n` +
            `👉 Mọi phản ánh mới từ Website sẽ được gửi tức thì đến bạn.`;

        await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: rawChatId,
            text: replyText,
            parse_mode: 'html'
          })
        }).catch(e => console.warn('[ZaloWebhook] Auto-reply error:', e.message));
      }

      return res.status(200).json({ ok: true, chatId: rawChatId || null });
    } catch (err) {
      console.error('[ZaloWebhook] Handler error:', err.message);
      return res.status(200).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
