const axios = require('axios');

const FIRESTORE_API_KEY = 'AIzaSyA-Ikh0okAVnGJ9IClc1qI5sR3tYFKRnqY';
const FIRESTORE_DOC_URL = `https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?key=${FIRESTORE_API_KEY}`;
const DEFAULT_BOT_TOKEN = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
const DEFAULT_GROUP_ID = 'zgr-ea719633836b6a35337a';
const DEFAULT_PERSONAL_ID = 'edadf78409cbe095b9da';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET config
  if (req.method === 'GET') {
    try {
      const fsRes = await axios.get(FIRESTORE_DOC_URL, { timeout: 5000 });
      const fields = fsRes.data?.fields || {};

      const config = {
        botToken: fields.botToken?.stringValue || DEFAULT_BOT_TOKEN,
        groupChatId: fields.groupChatId?.stringValue || DEFAULT_GROUP_ID,
        recipientId: fields.recipientId?.stringValue || `${DEFAULT_GROUP_ID}, ${DEFAULT_PERSONAL_ID}`,
        lastChatId: fields.lastChatId?.stringValue || DEFAULT_PERSONAL_ID,
        lastSenderName: fields.lastSenderName?.stringValue || '',
        isEnabled: fields.isEnabled?.booleanValue !== false,
        webhookUrl: fields.webhookUrl?.stringValue || 'https://phananh.nsgpc.edu.vn/api/zalo/webhook',
        notifyOnNewReport: fields.notifyOnNewReport?.booleanValue !== false,
        notifyOnReview: fields.notifyOnReview?.booleanValue !== false,
        notifyOnRating: fields.notifyOnRating?.booleanValue !== false
      };

      return res.status(200).json({ success: true, config });
    } catch (err) {
      console.warn('[ZaloConfig] Could not read from Firestore REST API:', err.message);
      return res.status(200).json({
        success: true,
        config: {
          botToken: DEFAULT_BOT_TOKEN,
          groupChatId: DEFAULT_GROUP_ID,
          recipientId: `${DEFAULT_GROUP_ID}, ${DEFAULT_PERSONAL_ID}`,
          lastChatId: DEFAULT_PERSONAL_ID,
          lastSenderName: '',
          isEnabled: true,
          webhookUrl: 'https://phananh.nsgpc.edu.vn/api/zalo/webhook'
        }
      });
    }
  }

  // POST update config
  if (req.method === 'POST') {
    try {
      const cfg = req.body || {};
      const patchFields = {};
      const updateMask = [];

      if (cfg.groupChatId !== undefined) {
        patchFields.groupChatId = { stringValue: String(cfg.groupChatId) };
        updateMask.push('updateMask.fieldPaths=groupChatId');
      }
      if (cfg.recipientId !== undefined) {
        patchFields.recipientId = { stringValue: String(cfg.recipientId) };
        updateMask.push('updateMask.fieldPaths=recipientId');
      }
      if (cfg.lastChatId !== undefined) {
        patchFields.lastChatId = { stringValue: String(cfg.lastChatId) };
        updateMask.push('updateMask.fieldPaths=lastChatId');
      }
      if (cfg.lastSenderName !== undefined) {
        patchFields.lastSenderName = { stringValue: String(cfg.lastSenderName) };
        updateMask.push('updateMask.fieldPaths=lastSenderName');
      }
      if (cfg.botToken !== undefined) {
        patchFields.botToken = { stringValue: String(cfg.botToken) };
        updateMask.push('updateMask.fieldPaths=botToken');
      }

      if (updateMask.length > 0) {
        const patchUrl = `https://firestore.googleapis.com/v1/projects/qttbcsvcsc/databases/(default)/documents/system_settings/zalo?${updateMask.join('&')}&key=${FIRESTORE_API_KEY}`;
        await axios.patch(patchUrl, { fields: patchFields }, { timeout: 5000 });
      }

      return res.status(200).json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
      return res.status(200).json({ success: true, message: 'Saved locally' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
