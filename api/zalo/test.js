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

    // 2. Phân tích danh sách Chat ID
    let rawInput = (recipientId || '').trim();
    let targetIds = rawInput.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);

    // Nếu để trống hoặc là số điện thoại, tự động nạp các Chat ID từ Firestore
    if (targetIds.length === 0 || targetIds.every(id => /^[0-9]{9,11}$/.test(id) && id.startsWith('0'))) {
      try {
        const fsRes = await fetch(`https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?key=${FIRESTORE_API_KEY}`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const rId = fsData.fields?.recipientId?.stringValue || '';
          const lId = fsData.fields?.lastChatId?.stringValue || '';
          const fallbackIds = [rId, lId, 'edadf78409cbe095b9da', 'zgr-ea719633836b6a35337a']
            .flatMap(s => (s || '').split(/[,;\s]+/))
            .map(s => s.trim())
            .filter(id => id && (!id.startsWith('0') || id.length > 11));
          targetIds = [...new Set(fallbackIds)];
        }
      } catch (e) {}
    }

    if (targetIds.length === 0) {
      targetIds = ['edadf78409cbe095b9da', 'zgr-ea719633836b6a35337a'];
    }

    // 3. Gửi tin nhắn thử nghiệm tới tất cả các Chat ID
    const sendTestMsg = async (targetId) => {
      const isGroup = targetId.startsWith('zgr-');
      const channelLabel = isGroup ? `Nhóm Zalo (ID: ${targetId})` : `Zalo Cá nhân (ID: ${targetId})`;
      const testMsg = `🚀 <b>[NSG SUPPORT] KIỂM TRA KẾT NỐI ZALO BOT THÀNH CÔNG!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 <b>Bot gửi tin:</b> ${botInfo.display_name || 'Bot Phản Ánh NSG'} (@${botInfo.account_name})\n` +
        `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
        `📱 <b>Kênh nhận:</b> ${channelLabel}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 Khi có phản ánh mới từ Website, hệ thống sẽ tự động gửi thông báo đến đây để bạn mở xem tức thì!`;

      try {
        const sendRes = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: targetId,
            text: testMsg,
            parse_mode: 'html'
          })
        });

        const sendJson = await sendRes.json();
        return { success: Boolean(sendJson?.ok), targetId, isGroup, result: sendJson?.result, error: sendJson?.description };
      } catch (err) {
        return { success: false, targetId, isGroup, error: err.message };
      }
    };

    const results = await Promise.allSettled(targetIds.map(id => sendTestMsg(id)));
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).map(r => r.value);

    if (successful.length > 0) {
      const channels = successful.map(s => s.isGroup ? 'Nhóm Zalo' : 'Zalo Cá nhân').join(' & ');
      return res.status(200).json({
        success: true,
        sentCount: successful.length,
        message: `✅ Đã gửi thông báo thử nghiệm thành công tới: ${channels}! Vui lòng mở Zalo để kiểm tra.`,
        bot: botInfo,
        recipients: successful.map(s => s.targetId)
      });
    }

    const firstErr = results.find(r => r.status === 'fulfilled' && !r.value.success)?.value?.error || 'Lỗi gửi tin tới Chat ID';
    return res.status(400).json({
      success: false,
      message: `Không thể gửi tin tới Chat ID. Chi tiết: ${firstErr}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
