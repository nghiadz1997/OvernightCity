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

    // Tách danh sách nhiều Chat ID nếu có (phân tách bởi dấu phẩy, chấm phẩy, khoảng trắng)
    let chatIds = recipient.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);

    // Fallback thông minh: Nếu không có recipientId hoặc chứa số điện thoại, tự động đọc từ Firestore
    if (chatIds.length === 0 || chatIds.every(id => /^[0-9]{9,11}$/.test(id) && id.startsWith('0'))) {
      try {
        const fsRes = await fetch(`https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?key=${FIRESTORE_API_KEY}`);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const rId = fsData.fields?.recipientId?.stringValue || '';
          const lId = fsData.fields?.lastChatId?.stringValue || '';
          // Nạp các ID hợp lệ từ Firestore (bao gồm cả cá nhân và nhóm)
          const fallbackIds = [rId, lId, 'edadf78409cbe095b9da', 'zgr-ea719633836b6a35337a']
            .flatMap(s => (s || '').split(/[,;\s]+/))
            .map(s => s.trim())
            .filter(id => id && (!id.startsWith('0') || id.length > 11));
          chatIds = [...new Set(fallbackIds)];
        }
      } catch (fsErr) {
        console.warn('[ZaloSend] Fallback Firestore error:', fsErr.message);
      }
    }

    // Luôn đảm bảo có ít nhất ID cá nhân và ID nhóm đã kết nối
    if (chatIds.length === 0) {
      chatIds = ['edadf78409cbe095b9da', 'zgr-ea719633836b6a35337a'];
    }

    if (!message || chatIds.length === 0 || !botToken) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người nhận Zalo (Chat ID).' });
    }

    const sendToOne = async (targetId) => {
      try {
        const resp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: targetId,
            text: message,
            parse_mode: 'html'
          })
        });

        const data = await resp.json();
        if (data && data.ok) {
          return { success: true, targetId, result: data.result };
        }

        // Thử lại dạng plain text nếu lỗi parse html
        if (data?.error_code === 400 || data?.description?.includes('parse')) {
          const cleanText = (message || '').replace(/<[^>]*>/g, '');
          const retryResp = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              chat_id: targetId,
              text: cleanText
            })
          });
          const retryData = await retryResp.json();
          if (retryData && retryData.ok) {
            return { success: true, targetId, result: retryData.result };
          }
        }

        return { success: false, targetId, error: data?.description || 'Lỗi gửi tin Zalo' };
      } catch (err) {
        return { success: false, targetId, error: err.message };
      }
    };

    // Gửi song song đến tất cả các Chat ID (Cá nhân + Nhóm)
    const results = await Promise.allSettled(chatIds.map(id => sendToOne(id)));
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
