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
    const { message, recipientId, groupChatId, token } = req.body || {};
    const botToken = (token || process.env.ZALO_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();

    // 1. Thu thập tất cả các ID người nhận tiềm năng (Nhóm + Cá nhân)
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
    } catch (fsErr) {
      console.warn('[ZaloSend] Firestore read error:', fsErr.message);
    }

    // Luôn nạp ID Nhóm và Cá nhân mặc định để đảm bảo thông báo luôn được gửi
    candidateIds.push(DEFAULT_GROUP_ID);
    candidateIds.push(DEFAULT_PERSONAL_ID);

    // Tách các ID phân cách bởi dấu phẩy, chấm phẩy, khoảng trắng và loại bỏ ID không hợp lệ (số điện thoại)
    const targetIds = [...new Set(
      candidateIds
        .flatMap(s => (s || '').split(/[,;\s]+/))
        .map(s => s.trim())
        .filter(id => id && (!id.startsWith('0') || id.length > 11))
    )];

    // Làm sạch message: chuyển br/p thành \n, loại bỏ các thẻ div/span không hỗ trợ
    let cleanMsg = String(message || '')
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<span[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '');

    if (!cleanMsg || targetIds.length === 0 || !botToken) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người nhận hoặc nội dung tin nhắn trống.' });
    }

    const sendToOne = async (targetId) => {
      try {
        const resp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: targetId,
            text: cleanMsg,
            parse_mode: 'html'
          })
        });

        const data = await resp.json();
        if (data && data.ok) {
          return { success: true, targetId, isGroup: targetId.startsWith('zgr-'), result: data.result };
        }

        // Thử lại dạng plain text nếu lỗi parse HTML
        if (data?.error_code === 400 || data?.description?.toLowerCase().includes('parse')) {
          const plainText = cleanMsg.replace(/<[^>]*>/g, '');
          const retryResp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              chat_id: targetId,
              text: plainText
            })
          });
          const retryData = await retryResp.json();
          if (retryData && retryData.ok) {
            return { success: true, targetId, isGroup: targetId.startsWith('zgr-'), result: retryData.result };
          }
        }

        return { success: false, targetId, isGroup: targetId.startsWith('zgr-'), error: data?.description || 'Lỗi gửi tin Zalo' };
      } catch (err) {
        return { success: false, targetId, isGroup: targetId.startsWith('zgr-'), error: err.message };
      }
    };

    // Gửi song song đến tất cả các Chat ID (Cả Nhóm và Cá nhân)
    const results = await Promise.allSettled(targetIds.map(id => sendToOne(id)));
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    if (successful.length > 0) {
      return res.status(200).json({
        success: true,
        sentCount: successful.length,
        recipients: successful.map(s => s.targetId),
        result: successful[0].result
      });
    }

    const firstError = results.find(r => r.status === 'fulfilled' && !r.value.success)?.value?.error || 'Không thể gửi tin Zalo';
    return res.status(400).json({ success: false, error: firstError });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
