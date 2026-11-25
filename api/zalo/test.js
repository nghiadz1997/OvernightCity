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
    const { token, recipientId } = req.body || {};
    const botToken = (token || process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'Chưa có Zalo Bot Token.' });
    }

    // 1. Kiểm tra tính hợp lệ của Bot Token
    let botInfo = null;
    try {
      const getMeRes = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/getMe`);
      const getMe = await getMeRes.json();
      if (getMe && getMe.ok) {
        botInfo = getMe.result || {};
      } else {
        return res.status(400).json({
          success: false,
          message: getMe?.description || 'Token Zalo Bot không hợp lệ.'
        });
      }
    } catch (tokenErr) {
      return res.status(400).json({
        success: false,
        message: 'Không thể kết nối tới Zalo Bot Platform: ' + tokenErr.message
      });
    }

    // 2. Nếu chưa nhập Recipient ID
    const recipient = (recipientId || '').trim();
    if (!recipient) {
      return res.status(200).json({
        success: true,
        bot: botInfo,
        message: `✅ Token Bot hợp lệ: ${botInfo.display_name || botInfo.account_name} (@${botInfo.account_name}). Hãy nhập Chat ID của bạn hoặc bấm "Lấy Chat ID tự động"!`
      });
    }

    // 3. Nếu người dùng nhập số điện thoại thay vì Chat ID
    if (/^(0|84)?[0-9]{9,10}$/.test(recipient.replace(/\s+/g, '')) && recipient.length <= 11) {
      return res.status(400).json({
        success: false,
        message: `⚠️ Bạn đang nhập số điện thoại ("${recipient}"). Chat ID Zalo Bot là dãy số định danh do Bot cung cấp. Vui lòng mở Zalo, tìm bot "Bot Phản Ánh NSG" (bot.ZHOTlNLQ), nhắn tin "/start", sau đó bấm "Lấy Chat ID tự động"!`
      });
    }

    // 4. Gửi tin nhắn thử nghiệm
    const testMsg = `🚀 <b>[NSG SUPPORT] KIỂM TRA KẾT NỐI ZALO BOT THÀNH CÔNG!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 <b>Bot gửi tin:</b> ${botInfo.display_name || 'Bot Phản Ánh NSG'} (@${botInfo.account_name})\n` +
      `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
      `📱 <b>Kênh nhận:</b> Zalo Bot Realtime (Chat ID: <code>${recipient}</code>)\n` +
      `👉 Khi có phản ánh mới từ Website, hệ thống sẽ tự động gửi thông báo đến đây để bạn mở xem tức thì!`;

    try {
      const sendRes = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: testMsg,
          parse_mode: 'html'
        })
      });

      const sendJson = await sendRes.json();
      if (sendJson && sendJson.ok) {
        return res.status(200).json({
          success: true,
          message: '✅ Đã gửi thông báo thử nghiệm thành công tới Zalo! Vui lòng mở Zalo để kiểm tra.',
          bot: botInfo
        });
      }

      return res.status(400).json({
        success: false,
        message: sendJson?.description || 'Không thể gửi tin tới Chat ID này. Vui lòng kiểm tra lại.'
      });
    } catch (sendErr) {
      return res.status(400).json({
        success: false,
        message: `Lỗi gửi tin: ${sendErr.message}. Đảm bảo bạn đã mở Zalo và nhắn tin cho Bot ít nhất 1 lần để mở cuộc trò chuyện.`
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
