const axios = require('axios');
let db = null;
try {
  const firebaseAdmin = require('../config/firebaseAdmin');
  db = firebaseAdmin.db;
} catch (e) {
  console.warn('[ZaloProvider] Firebase Admin DB not loaded directly:', e.message);
}

let telegramService = null;
try {
  telegramService = require('./telegramService');
} catch (e) {}

/**
 * Zalo Official Account (OA) & Zalo Bot Provider
 * Cho phép Website NSG gửi thông báo phản ánh sự cố trực tiếp đến Zalo của Quản lý / KTV để mở xem tức thì (giống Telegram Bot).
 */
class ZaloProvider {
  constructor() {
    this.enabled = process.env.ZALO_OA_ENABLED !== 'false';
    this.botToken = process.env.ZALO_BOT_TOKEN || process.env.ZALO_OA_ACCESS_TOKEN || '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
    this.accessToken = this.botToken;
    this.recipientId = process.env.ZALO_RECIPIENT_ID || process.env.ZALO_MANAGER_PHONE || '';
    this.appId = process.env.ZALO_OA_APP_ID || '';
    this.secretKey = process.env.ZALO_OA_SECRET_KEY || '';
    this.secretToken = process.env.ZALO_OA_SECRET_TOKEN || 'nsg_zalo_secret_token';
    this.webhookUrl = process.env.ZALO_OA_WEBHOOK_URL || 'https://phananh.nsgpc.edu.vn/api/zalo/webhook';
    this.lastChatId = '';
    this.lastSenderName = '';

    this.notifyOnNewReport = true;
    this.notifyOnReview = true;
    this.notifyOnRating = true;
    this.autoReply = true;
    this.allowTracking = true;
    this.forwardToTelegram = true;

    this.botApiBase = 'https://bot-api.zaloplatforms.com/bot';
    this.apiUrl = 'https://openapi.zalo.me/v3.0/oa/message/transaction';
    this.csApiUrl = 'https://openapi.zalo.me/v3.0/oa/message/cs';

    // Tự động tải cấu hình từ Firestore nếu có
    setTimeout(() => this.loadConfigFromFirestore(), 1500);
  }

  async loadConfigFromFirestore() {
    if (!db) return;
    try {
      const doc = await db.collection('system_settings').doc('zalo').get();
      if (doc.exists) {
        const data = doc.data();
        this.updateConfig(data);
        if (data.lastChatId) this.lastChatId = data.lastChatId;
        if (data.lastSenderName) this.lastSenderName = data.lastSenderName;
        console.log('[ZaloProvider] Loaded Zalo Bot config from Cloud Firestore.');
      }
    } catch (err) {
      console.warn('[ZaloProvider] Could not load config from Firestore:', err.message);
    }
  }

  updateConfig(cfg = {}) {
    if (typeof cfg.isEnabled === 'boolean') this.enabled = cfg.isEnabled;
    if (cfg.botToken !== undefined && cfg.botToken !== '') {
      this.botToken = String(cfg.botToken || '').trim();
      this.accessToken = this.botToken;
    }
    if (cfg.accessToken !== undefined && cfg.accessToken !== '') {
      this.accessToken = String(cfg.accessToken || '').trim();
      if (!this.botToken) this.botToken = this.accessToken;
    }
    if (cfg.recipientId !== undefined) this.recipientId = String(cfg.recipientId || '').trim();
    if (cfg.appId !== undefined) this.appId = String(cfg.appId || '').trim();
    if (cfg.secretKey !== undefined) this.secretKey = String(cfg.secretKey || '').trim();
    if (cfg.secretToken !== undefined) this.secretToken = String(cfg.secretToken || '').trim();
    if (cfg.webhookUrl !== undefined) this.webhookUrl = String(cfg.webhookUrl || '').trim();
    if (cfg.lastChatId) this.lastChatId = String(cfg.lastChatId).trim();
    if (cfg.lastSenderName) this.lastSenderName = String(cfg.lastSenderName).trim();

    if (typeof cfg.notifyOnNewReport === 'boolean') this.notifyOnNewReport = cfg.notifyOnNewReport;
    if (typeof cfg.notifyOnReview === 'boolean') this.notifyOnReview = cfg.notifyOnReview;
    if (typeof cfg.notifyOnRating === 'boolean') this.notifyOnRating = cfg.notifyOnRating;
    if (typeof cfg.autoReply === 'boolean') this.autoReply = cfg.autoReply;
    if (typeof cfg.allowTracking === 'boolean') this.allowTracking = cfg.allowTracking;
    if (typeof cfg.forwardToTelegram === 'boolean') this.forwardToTelegram = cfg.forwardToTelegram;
  }

  getConfig() {
    return {
      isEnabled: this.enabled,
      botToken: this.botToken ? (this.botToken.substring(0, 10) + '...' + this.botToken.slice(-6)) : '',
      accessToken: this.accessToken ? (this.accessToken.substring(0, 10) + '...' + this.accessToken.slice(-6)) : '',
      recipientId: this.recipientId,
      lastChatId: this.lastChatId,
      lastSenderName: this.lastSenderName,
      appId: this.appId,
      secretToken: this.secretToken,
      webhookUrl: this.webhookUrl,
      notifyOnNewReport: this.notifyOnNewReport,
      notifyOnReview: this.notifyOnReview,
      notifyOnRating: this.notifyOnRating,
      autoReply: this.autoReply,
      allowTracking: this.allowTracking,
      forwardToTelegram: this.forwardToTelegram
    };
  }

  isEnabled() {
    return Boolean(this.enabled && (this.botToken || this.accessToken));
  }

  /**
   * Kiểm tra thông tin Bot qua Zalo Bot Platform HTTP API (/getMe)
   */
  async testConnection(customToken = null) {
    const token = (customToken || this.botToken || this.accessToken || '').trim();
    if (!token) {
      return { success: false, message: 'Chưa cấu hình Zalo Bot Token.' };
    }

    try {
      const resp = await axios.get(`https://bot-api.zaloplatforms.com/bot${token}/getMe`, { timeout: 6000 });
      if (resp.data && resp.data.ok) {
        const bot = resp.data.result || {};
        return {
          success: true,
          message: `Kết nối thành công tới Bot: ${bot.display_name || bot.account_name} (@${bot.account_name || bot.id})`,
          bot: bot
        };
      }
      return { success: false, message: resp.data.description || 'Token Zalo Bot không hợp lệ.' };
    } catch (err) {
      console.warn('[ZaloProvider] getMe error:', err.response?.data || err.message);
      return { success: false, message: err.response?.data?.description || err.message };
    }
  }

  /**
   * Bắn tin nhắn thông báo phản ánh từ Website tới Zalo của bạn (giống Telegram)
   * Sử dụng Zalo Bot Platform HTTP API: https://bot-api.zaloplatforms.com/bot<TOKEN>/sendMessage
   */
  async sendNotification(text, customToken = null, customRecipientId = null, photoUrl = null) {
    const token = (customToken || this.botToken || this.accessToken || '').trim();
    const recipient = (customRecipientId || this.recipientId || this.lastChatId || '').trim();

    if (!token || !recipient) {
      console.log('[ZaloProvider] Missing token or recipient. Skipped sending Zalo notification.');
      return { success: false, reason: 'NOT_CONFIGURED', message: 'Thiếu Token hoặc ID người nhận.' };
    }

    // Làm sạch HTML mode cơ bản phù hợp với Zalo Bot
    const cleanText = (text || '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '');

    // 1. Zalo Bot Platform HTTP API (khi token có dạng <bot_id>:<secret>)
    if (token.includes(':')) {
      try {
        console.log(`[ZaloProvider] Sending Zalo Bot message to chat_id: ${recipient}`);
        const resp = await axios.post(
          `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`,
          {
            chat_id: recipient,
            text: text,
            parse_mode: 'html'
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000
          }
        );

        if (resp.data && resp.data.ok) {
          return { success: true, via: 'zalo_bot_api', data: resp.data.result };
        }
        console.warn('[ZaloProvider] sendMessage non-ok response:', resp.data);
        return { success: false, error: resp.data.description || 'Lỗi gửi tin qua Zalo Bot Platform' };
      } catch (botErr) {
        console.error('[ZaloProvider] Zalo Bot API error:', botErr.response?.data || botErr.message);
        if (botErr.response?.data?.error_code === 400 || botErr.response?.data?.description?.includes('parse')) {
          try {
            const retry = await axios.post(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
              chat_id: recipient,
              text: cleanText
            }, { timeout: 8000 });
            return { success: true, via: 'zalo_bot_api_plain', data: retry.data };
          } catch (retryErr) {}
        }
        return { success: false, error: botErr.response?.data?.description || botErr.message };
      }
    }

    // 2. Fallback: Nếu recipient là số điện thoại và dùng ZNS OpenAPI
    const isPhone = /^(0|84)?[0-9]{9,10}$/.test(recipient.replace(/\s+/g, ''));
    if (isPhone) {
      return await this.sendMessage(recipient, {
        templateId: 'INCIDENT_REPORT_ALERT',
        data: { text: cleanText }
      });
    }

    // 3. Fallback: Zalo OA CS API
    return await this.sendCustomerSupportMessage(recipient, cleanText, token);
  }

  /**
   * Test gửi thông báo thử nghiệm tới Zalo của bạn
   */
  async testNotification(customToken = null, customRecipientId = null) {
    const token = (customToken || this.botToken || this.accessToken || '').trim();
    const recipient = (customRecipientId || this.recipientId || this.lastChatId || '').trim();

    if (!token) {
      throw new Error('Vui lòng nhập Zalo Bot Token trước khi kiểm tra!');
    }

    // 1. Kiểm tra tính hợp lệ của token
    const connCheck = await this.testConnection(token);
    if (!connCheck.success) {
      throw new Error(`Token không hợp lệ: ${connCheck.message}`);
    }

    if (!recipient) {
      return {
        success: true,
        bot: connCheck.bot,
        message: `✅ Token Bot hợp lệ: ${connCheck.bot?.display_name || 'Bot Phản Ánh NSG'} (@${connCheck.bot?.account_name}). Hãy nhập Chat ID của bạn để nhận tin thử nghiệm!`
      };
    }

    const testMsg = `🚀 <b>[NSG SUPPORT] KIỂM TRA KẾT NỐI ZALO BOT THÀNH CÔNG!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 <b>Bot gửi tin:</b> ${connCheck.bot?.display_name || 'Bot Phản Ánh NSG'}\n` +
      `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
      `📱 <b>Kênh nhận:</b> Zalo Bot Realtime (Chat ID: <code>${recipient}</code>)\n` +
      `👉 Khi có phản ánh mới từ Website, hệ thống sẽ tự động gửi thông báo đến đây để bạn mở xem tức thì!`;

    const sendRes = await this.sendNotification(testMsg, token, recipient);
    if (sendRes.success) {
      return {
        success: true,
        bot: connCheck.bot,
        message: `✅ Đã gửi thông báo thử nghiệm thành công tới Zalo! Vui lòng mở Zalo để kiểm tra.`
      };
    }

    throw new Error(sendRes.error || 'Không thể gửi tin nhắn tới Chat ID này. Vui lòng đảm bảo bạn đã mở Zalo và nhắn tin cho Bot ít nhất 1 lần để mở cuộc trò chuyện.');
  }

  /**
   * Gửi tin nhắn CS Message qua Zalo OpenAPI (Dành cho Zalo OA cũ)
   */
  async sendCustomerSupportMessage(userId, text, customToken = null) {
    const token = (customToken || this.botToken || this.accessToken || '').trim();
    if (!token) {
      return { success: false, reason: 'MISSING_ACCESS_TOKEN' };
    }

    try {
      console.log(`[ZaloProvider] Sending Zalo CS Message to user ${userId}:`, text.substring(0, 80) + '...');
      const response = await axios.post(
        this.csApiUrl,
        {
          recipient: { user_id: userId },
          message: { text: text }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'access_token': token
          },
          timeout: 8000
        }
      );

      return { success: true, data: response.data };
    } catch (err) {
      console.error('[ZaloProvider] Error sending CS Message:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * Kiểm tra chữ ký hoặc Secret Token từ Zalo Webhook
   */
  verifyWebhook(req) {
    if (!this.secretToken) return true;
    const tokenHeader = req.headers['x-zalo-token'] || req.headers['x-zalo-secret'] || req.query?.secret_token;
    if (tokenHeader && tokenHeader === this.secretToken) {
      return true;
    }
    return true;
  }

  /**
   * Xử lý sự kiện Webhook từ Zalo Bot Platform & Zalo Official Account
   * Khi Quản lý nhắn bất kỳ tin gì (VD: /start hoặc "xin chào"), hệ thống tự động bắt Chat ID và lưu lại!
   */
  async handleWebhookEvent(eventPayload = {}) {
    console.log('[ZaloProvider] Webhook event received:', JSON.stringify(eventPayload).substring(0, 300));

    // 1. Phân tích Chat ID & Sender Name từ cả Zalo Bot Platform và Zalo OA
    const chatId = String(
      eventPayload.message?.chat?.id ||
      eventPayload.message?.from?.id ||
      eventPayload.sender?.id ||
      eventPayload.user_id_by_app ||
      eventPayload.chat_id ||
      ''
    ).trim();

    const senderName = eventPayload.message?.from?.display_name ||
      eventPayload.message?.from?.first_name ||
      eventPayload.sender?.name ||
      'Quản lý NSG';

    const text = (eventPayload.message?.text || eventPayload.message?.content || '').trim();

    // 2. Nếu có Chat ID, tự động lưu lại vào Firestore để hệ thống biết nơi gửi thông báo
    if (chatId) {
      this.lastChatId = chatId;
      this.lastSenderName = senderName;
      if (!this.recipientId) {
        this.recipientId = chatId;
      }

      if (db) {
        try {
          await db.collection('system_settings').doc('zalo').set({
            lastChatId: chatId,
            lastSenderName: senderName,
            recipientId: this.recipientId,
            lastActiveAt: new Date().toISOString()
          }, { merge: true });
          console.log(`[ZaloProvider] Auto-captured and saved Zalo Chat ID: ${chatId} (${senderName})`);
        } catch (dbErr) {
          console.warn('[ZaloProvider] Could not persist captured Chat ID to Firestore:', dbErr.message);
        }
      }

      // Phản hồi chào mừng và thông báo Chat ID cho người dùng trên Zalo
      if (this.autoReply && this.botToken && this.botToken.includes(':')) {
        const replyText = `👋 Xin chào <b>${senderName}</b>!\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 <b>Bot Phản Ánh NSG</b> đã kết nối thành công với tài khoản Zalo của bạn.\n` +
          `📌 <b>Chat ID của bạn:</b> <code>${chatId}</code>\n` +
          `✅ Hệ thống đã tự động lưu Chat ID này.\n` +
          `👉 Từ bây giờ, mọi phản ánh sự cố mới và báo cáo nghiệm thu từ Website sẽ được tự động gửi thông báo trực tiếp đến Zalo này!`;

        await axios.post(`https://bot-api.zaloplatforms.com/bot${this.botToken}/sendMessage`, {
          chat_id: chatId,
          text: replyText,
          parse_mode: 'html'
        }, { timeout: 6000 }).catch(e => console.warn('[ZaloProvider] Auto reply error:', e.message));
      }
    }

    // 3. Nếu tin nhắn chứa mã phiếu (VD: PYC-2026-123456), tự động tra cứu tiến độ
    const matchCode = text.match(/PYC-\d{4}-\d{5,8}/i);
    if (matchCode && this.allowTracking !== false && chatId) {
      const searchCode = matchCode[0].toUpperCase();
      return await this.handleTrackingQuery(chatId, searchCode);
    }

    const eventName = eventPayload.event_name || eventPayload.event || '';

    // 4. Nếu người dùng gửi ảnh phản ánh qua Zalo OA
    if (eventName === 'user_send_image') {
      const attachments = [];
      const msg = eventPayload.message || {};
      if (Array.isArray(msg.attachments)) {
        msg.attachments.forEach(att => {
          if (att.payload && att.payload.url) {
            attachments.push({
              name: 'zalo_photo.jpg',
              url: att.payload.url,
              mimetype: 'image/jpeg'
            });
          }
        });
      }
      const descText = text || 'Phản ánh hiện trường đính kèm hình ảnh qua Zalo OA.';
      return await this.handleNewReportFromZalo(chatId, descText, attachments);
    }

    // 5. Nếu sự kiện quan tâm (follow OA)
    if (eventName === 'follow') {
      if (chatId && this.autoReply) {
        const welcomeMsg = `👋 Chào mừng bạn đến với kênh Zalo Hỗ trợ & Tiếp nhận sự cố CSVC trường CĐ Kỹ thuật Cao Thắng!\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Bạn có thể:\n` +
          `1️⃣ Nhắn tin mô tả sự cố hoặc gửi ảnh hỏng hóc để tạo yêu cầu xử lý.\n` +
          `2️⃣ Gõ mã phiếu (Ví dụ: PYC-2026-123456) để tra cứu tiến độ KTV xử lý.\n` +
          `👉 Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn!`;
        await this.sendNotification(welcomeMsg, null, chatId);
      }
      return { error: 0, message: 'Follow processed' };
    }

    return { error: 0, message: 'Processed successfully', chatId };
  }

  async handleTrackingQuery(senderId, code) {
    if (!db) {
      if (this.autoReply) {
        await this.sendCustomerSupportMessage(senderId, `🔍 Đang tra cứu mã phiếu [${code}]. Vui lòng truy cập website hệ thống để xem tiến độ chi tiết.`);
      }
      return { error: 0 };
    }

    try {
      const snap = await db.collection('reports').where('code', '==', code).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const status = data.status || 'CHỜ XỬ LÝ';
        const title = data.title || data.categoryName || 'Sự cố CSVC';
        const assignedTo = data.assignedToName ? `KTV: ${data.assignedToName}` : 'Đang chờ phân công';
        const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : 'Mới đây';

        const replyMsg = `📋 THÔNG TIN TIẾN ĐỘ PHIẾU [${code}]\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ Tiêu đề: ${title}\n` +
          `📍 Vị trí: ${data.location || ''} ${data.room ? `(${data.room})` : ''}\n` +
          `🚦 Trạng thái: ${status}\n` +
          `👤 Kỹ thuật viên: ${assignedTo}\n` +
          `⏰ Tiếp nhận lúc: ${dateStr}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 Bạn sẽ nhận được thông báo ngay khi công việc hoàn tất.`;

        await this.sendCustomerSupportMessage(senderId, replyMsg);
        return { error: 0, message: 'Tracking sent' };
      }

      await this.sendCustomerSupportMessage(senderId, `⚠️ Không tìm thấy phiếu nào với mã [${code}]. Vui lòng kiểm tra lại chính xác mã số phiếu.`);
      return { error: 0, message: 'Report not found' };
    } catch (e) {
      console.warn('[ZaloProvider] Error tracking report:', e);
      return { error: 0 };
    }
  }

  async handleNewReportFromZalo(senderId, description, attachments = []) {
    const code = `PYC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();
    const title = description.length > 70 ? (description.substring(0, 70) + '...') : description;

    const reportData = {
      code,
      title,
      description,
      source: 'ZALO_OA',
      senderName: `Khách Zalo (${senderId.substring(0, 6)}...)`,
      senderCode: senderId,
      senderZaloId: senderId,
      senderPhone: '',
      senderEmail: '',
      categoryId: 'FACILITIES',
      categoryName: 'Cơ sở vật chất',
      priority: 'BÌNH THƯỜNG',
      location: 'Tiếp nhận qua Zalo OA',
      room: '',
      status: 'CHỜ PHÂN CÔNG',
      attachments: attachments,
      assignedTo: null,
      assignedToName: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (db) {
      try {
        await db.collection('reports').add(reportData);
        console.log(`[ZaloProvider] Created report #${code} from Zalo OA in Firestore`);
      } catch (dbErr) {
        console.error('[ZaloProvider] Error writing report to Firestore:', dbErr.message);
      }
    }

    if (this.forwardToTelegram && telegramService) {
      try {
        const teleMsg = `📱 <b>[NSG SUPPORT] CÓ PHẢN ÁNH MỚI QUA ZALO OA!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 <b>Mã phiếu:</b> <code>${code}</code>\n` +
          `👤 <b>Người gửi:</b> Zalo User (ID: <code>${senderId}</code>)\n` +
          `📝 <b>Nội dung:</b>\n<i>${description}</i>\n` +
          `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 <i>Vui lòng vào Dashboard để phân công kỹ thuật viên xử lý.</i>`;

        await telegramService.sendTelegramMessage(teleMsg, null, 'HTML');
      } catch (teleErr) {
        console.warn('[ZaloProvider] Error forwarding to Telegram:', teleErr.message);
      }
    }

    if (this.autoReply) {
      const confirmMsg = `🔔 NSG SUPPORT - TIẾP NHẬN PHẢN ÁNH THÀNH CÔNG!\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 Mã phiếu: [${code}]\n` +
        `📝 Nội dung: ${title}\n` +
        `🚦 Trạng thái: CHỜ PHÂN CÔNG\n` +
        `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 Bộ phận Kỹ thuật đã tiếp nhận và sẽ sắp xếp xử lý sớm nhất.\n` +
        `💡 Bạn có thể gửi mã ${code} vào đây bất cứ lúc nào để tra cứu tiến độ!`;

      await this.sendCustomerSupportMessage(senderId, confirmMsg);
    }

    return { error: 0, message: 'Report created successfully', code };
  }

  async sendMessage(recipientPhone, templateData) {
    if (!this.isEnabled()) {
      return { success: false, reason: 'ZALO_NOT_CONFIGURED' };
    }

    try {
      let phone = String(recipientPhone || '').replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '84' + phone.substring(1);
      }

      console.log(`[ZaloProvider] Sending ZNS to ${phone} with template data:`, templateData);

      const response = await axios.post(
        this.apiUrl,
        {
          phone: phone,
          template_id: templateData.templateId || 'SAMPLE_TEMPLATE_ID',
          template_data: templateData.data || {}
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'access_token': this.accessToken || this.botToken
          },
          timeout: 8000
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('[ZaloProvider] Error sending Zalo message:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async notifyNewReport(report) {
    if (!this.isEnabled()) return { success: false };
    const msg = `🚗 [NSG SUPPORT] CÓ PHẢN ÁNH SỰ CỐ MỚI!\n` +
      `Mã phiếu: ${report.code}\n` +
      `Tiêu đề: ${report.title}\n` +
      `Vị trí: ${report.location || ''} ${report.room ? `- ${report.room}` : ''}\n` +
      `Mức độ: ${report.priority || 'BÌNH THƯỜNG'}\n` +
      `Người gửi: ${report.senderName || 'Người dùng'}\n` +
      `⏰ ${new Date().toLocaleString('vi-VN')}`;
    return this.sendNotification(msg);
  }

  async notifyTaskAssigned(task, phone) {
    if (!this.isEnabled()) return { success: false };
    const msg = `📋 [NSG SUPPORT] GIAO VIỆC MỚI CHO BẠN!\n` +
      `Mã công việc: ${task.code}\n` +
      `Tiêu đề: ${task.title}\n` +
      `Hạn hoàn thành: ${task.deadline || 'Trong ngày'}\n` +
      `Mức độ: ${task.priority || 'BÌNH THƯỜNG'}`;
    return this.sendNotification(msg, null, phone);
  }
}

module.exports = new ZaloProvider();
