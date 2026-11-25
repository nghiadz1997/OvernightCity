const DEFAULT_BOT_TOKEN = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';

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
    const recipient = (recipientId || '').trim();

    if (!message || !recipient || !botToken) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin gửi tin nhắn Zalo.' });
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
