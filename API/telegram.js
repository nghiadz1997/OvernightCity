const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { area, room, issueType, priority, content, timestamp } = req.body;
  
  // Lấy Token và Chat ID từ Biến môi trường trên Vercel Dashboard
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Missing Telegram configuration on server' });
  }

  const message = `🚨 **THÔNG BÁO SỰ CỐ CSVC**\n\n` +
                  `📍 **Khu vực:** ${area}\n` +
                  `🚪 **Phòng:** ${room}\n` +
                  `⚠️ **Loại sự cố:** ${issueType}\n` +
                  `🔴 **Mức độ:** ${priority}\n` +
                  `📝 **Nội dung:** ${content}\n` +
                  `⏰ **Thời gian:** ${new Date(timestamp).toLocaleString('vi-VN')}`;

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    if (data.ok) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: data.description });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};