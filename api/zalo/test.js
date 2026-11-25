const DEFAULT_BOT_TOKEN = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
const FIRESTORE_API_KEY = 'AIzaSyA-Ikh0okAVnGJ9IClc1qI5sR3tYFKRnqY';
const DEFAULT_GROUP_ID = 'zgr-ea719633836b6a35337a';
const DEFAULT_PERSONAL_ID = 'edadf78409cbe095b9da';

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
    const { token, recipientId, groupChatId } = req.body || {};
    const botToken = (token || process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'Chưa có Zalo Bot Token.' });
    }

    // 1. Kiểm tra tính hợp lệ của Bot Token (getMe)
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

    // 2. Thu thập danh sách Chat ID (Nhóm + Cá nhân)
    let candidateIds = [];
    if (groupChatId) candidateIds.push(groupChatId);
    if (recipientId) candidateIds.push(recipientId);

    // Luôn truy vấn Firestore để lấy Group ID và Chat ID cấu hình mới nhất
    try {
      const fsRes = await fetch(`https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?key=${FIRESTORE_API_KEY}`);
      if (fsRes.ok) {
        const fsData = await fsRes.json();
        const fGroup = fsData.fields?.groupChatId?.stringValue;
        const fRecip = fsData.fields?.recipientId?.stringValue;
        const fLast = fsData.fields?.lastChatId?.stringValue;
        if (fGroup) candidateIds.push(fGroup);
        if (fRecip) candidateIds.push(fRecip);
        if (fLast) candidateIds.push(fLast);
      }
    } catch (e) {}

    // Bổ sung default Group và Personal ID
    candidateIds.push(DEFAULT_GROUP_ID);
    candidateIds.push(DEFAULT_PERSONAL_ID);

    const targetIds = [...new Set(
      candidateIds
        .flatMap(s => (s || '').split(/[,;\s]+/))
        .map(s => s.trim())
        .filter(id => id && (!id.startsWith('0') || id.length > 11))
    )];

    // 3. Gửi tin nhắn thử nghiệm tới tất cả các Chat ID
    const sendTestMsg = async (targetId) => {
      const isGroup = targetId.startsWith('zgr-');
      const channelLabel = isGroup ? `Nhóm Zalo (Group ID: ${targetId})` : `Zalo Cá nhân (Chat ID: ${targetId})`;
      const testMsg = `🚀 <b>[NSG SUPPORT] KIỂM TRA KẾT NỐI ZALO BOT THÀNH CÔNG!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 <b>Bot gửi tin:</b> ${botInfo.display_name || 'Bot Phản Ánh NSG'} (@${botInfo.account_name})\n` +
        `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
        `📱 <b>Kênh nhận:</b> ${channelLabel}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 Khi có phản ánh mới từ Website, hệ thống sẽ tự động gửi thông báo trực tiếp vào đây để bạn mở xem tức thì!`;

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
      const hasGroup = successful.some(s => s.isGroup);
      const hasPersonal = successful.some(s => !s.isGroup);
      const label = (hasGroup && hasPersonal) ? 'Nhóm Zalo & Zalo Cá nhân' : (hasGroup ? 'Nhóm Zalo' : 'Zalo Cá nhân');

      return res.status(200).json({
        success: true,
        sentCount: successful.length,
        message: `✅ Đã gửi tin thử nghiệm thành công tới ${label}! Vui lòng mở Zalo kiểm tra.`,
        bot: botInfo,
        recipients: successful.map(s => s.targetId)
      });
    }

    const firstErr = results.find(r => r.status === 'fulfilled' && !r.value.success)?.value?.error || 'Lỗi gửi tin tới Chat ID';
    return res.status(400).json({
      success: false,
      message: `Không thể gửi tin tới Zalo. Chi tiết: ${firstErr}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
