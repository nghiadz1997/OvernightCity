const DEFAULT_BOT_TOKEN = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
const FIRESTORE_API_KEY = 'AIzaSyA-Ikh0okAVnGJ9IClc1qI5sR3tYFKRnqY';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { message, recipientId, token } = req.body || {};
    const botToken = (token || process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    let recipient = (recipientId || '').trim();

    // Fallback thông minh: Nếu không có recipientId hoặc là số điện thoại, tự động đọc từ Firestore system_settings/zalo
    if (!recipient || (/^[0-9]{9,11}$/.test(recipient) && recipient.startsWith('0'))) {
      try {
        const fsRes = await fetch(`https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?key=${FIRESTORE_API_KEY}`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const realChatId = fsData.fields?.recipientId?.stringValue || fsData.fields?.lastChatId?.stringValue || '';
          if (realChatId && (!realChatId.startsWith('0') || realChatId.length > 11)) {
            recipient = realChatId;
          }
        }
      } catch (fsErr) {
        console.warn('[ZaloSend] Fallback Firestore error:', fsErr.message);
      }
    }

    if (!message || !recipient || !botToken) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người nhận Zalo (Chat ID).' });
    }

    try {
      const resp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: message,
          parse_mode: 'html'
        })
      });

      const data = await resp.json();
      if (data && data.ok) {
        return res.status(200).json({ success: true, result: data.result });
      }

      // Thử lại dạng plain text nếu lỗi parse html
      if (data?.error_code === 400 || data?.description?.includes('parse')) {
        const cleanText = (message || '').replace(/<[^>]*>/g, '');
        const retryResp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: recipient,
            text: cleanText
          })
        });
        const retryData = await retryResp.json();
        if (retryData && retryData.ok) {
          return res.status(200).json({ success: true, result: retryData.result });
        }
      }

      return res.status(400).json({ success: false, error: data?.description || 'Lỗi gửi tin Zalo' });
    } catch (botErr) {
      return res.status(400).json({ success: false, error: botErr.message });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
