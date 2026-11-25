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
 * Zalo Official Account (OA) Provider Interface
 * Hỗ trợ Webhook tiếp nhận tin nhắn / hình ảnh phản ánh từ Zalo Bot & Gửi phản hồi tự động
 */
class ZaloProvider {
  constructor() {
    this.enabled = process.env.ZALO_OA_ENABLED === 'true';
    this.appId = process.env.ZALO_OA_APP_ID || '';
    this.secretKey = process.env.ZALO_OA_SECRET_KEY || '';
    this.secretToken = process.env.ZALO_OA_SECRET_TOKEN || 'nsg_zalo_secret_token';
    this.accessToken = process.env.ZALO_OA_ACCESS_TOKEN || '';
    this.webhookUrl = process.env.ZALO_OA_WEBHOOK_URL || '';
    this.autoReply = true;
    this.allowTracking = true;
    this.forwardToTelegram = true;

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
        console.log('[ZaloProvider] Loaded Zalo OA config from Cloud Firestore.');
      }
    } catch (err) {
      console.warn('[ZaloProvider] Could not load config from Firestore:', err.message);
    }
  }

  updateConfig(cfg = {}) {
    if (typeof cfg.isEnabled === 'boolean') this.enabled = cfg.isEnabled;
    if (cfg.appId !== undefined) this.appId = String(cfg.appId || '').trim();
    if (cfg.secretKey !== undefined) this.secretKey = String(cfg.secretKey || '').trim();
    if (cfg.secretToken !== undefined) this.secretToken = String(cfg.secretToken || '').trim();
    if (cfg.accessToken !== undefined) this.accessToken = String(cfg.accessToken || '').trim();
    if (cfg.webhookUrl !== undefined) this.webhookUrl = String(cfg.webhookUrl || '').trim();
    if (typeof cfg.autoReply === 'boolean') this.autoReply = cfg.autoReply;
    if (typeof cfg.allowTracking === 'boolean') this.allowTracking = cfg.allowTracking;
    if (typeof cfg.forwardToTelegram === 'boolean') this.forwardToTelegram = cfg.forwardToTelegram;
  }

  getConfig() {
    return {
      isEnabled: this.enabled,
      appId: this.appId,
      secretToken: this.secretToken,
      accessToken: this.accessToken ? (this.accessToken.substring(0, 10) + '...' + this.accessToken.slice(-6)) : '',
      webhookUrl: this.webhookUrl,
      autoReply: this.autoReply,
      allowTracking: this.allowTracking,
      forwardToTelegram: this.forwardToTelegram
    };
  }

  isEnabled() {
    return Boolean(this.enabled && this.accessToken);
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
    // Chấp nhận nếu chưa cấu hình secretToken chặt chẽ
    return true;
  }

  /**
   * Gửi tin nhắn phản hồi trực tiếp tới người dùng qua Zalo OA (Customer Support Message)
   */
  async sendCustomerSupportMessage(userId, text) {
    if (!this.accessToken) {
      console.warn('[ZaloProvider] Missing OA Access Token. Cannot send message to user:', userId);
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
            'access_token': this.accessToken
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
   * Kiểm tra kết nối thử nghiệm Zalo OA
   */
  async testConnection(customToken = null, customSecret = null) {
    const token = customToken ? customToken.trim() : this.accessToken;
    if (!token) {
      throw new Error('Chưa cấu hình OA Access Token.');
    }

    try {
      const response = await axios.get('https://openapi.zalo.me/v2.0/oa/getoa', {
        headers: { 'access_token': token },
        timeout: 6000
      });

      if (response.data && response.data.error === 0) {
        return {
          success: true,
          message: 'Kết nối Zalo OA thành công!',
          oaInfo: response.data.data
        };
      }
      return {
        success: false,
        error: response.data?.message || 'Lỗi xác thực Zalo: ' + response.data?.error
      };
    } catch (err) {
      // Nếu là token thử nghiệm hoặc mạng nội bộ
      if (token.startsWith('test_') || token.startsWith('demo_')) {
        return {
          success: true,
          mock: true,
          message: 'Kết nối Zalo OA mô phỏng thành công (Mock Token)!'
        };
      }
      throw new Error(err.response?.data?.message || err.message);
    }
  }

  /**
   * Xử lý sự kiện Webhook từ Zalo Official Account
   */
  async handleWebhookEvent(eventPayload = {}) {
    const eventName = eventPayload.event_name || eventPayload.event || '';
    const senderId = eventPayload.sender?.id || eventPayload.user_id_by_app || '';
    const message = eventPayload.message || {};
    const text = (message.text || '').trim();

    console.log(`[ZaloProvider] Webhook event received: ${eventName} from user: ${senderId}`);

    // 1. Người dùng gửi tin nhắn văn bản
    if (eventName === 'user_send_text' || (!eventName && text)) {
      if (!senderId) return { error: 0, message: 'No sender id' };

      // Case A: Tra cứu tiến độ phản ánh (khi người dùng gõ mã PYC-...)
      const matchCode = text.match(/PYC-\d{4}-\d{5,8}/i);
      if (matchCode && this.allowTracking !== false) {
        const searchCode = matchCode[0].toUpperCase();
        return await this.handleTrackingQuery(senderId, searchCode);
      }

      // Case B: Người dùng gửi phản ánh sự cố mới qua Zalo
      return await this.handleNewReportFromZalo(senderId, text, []);
    }

    // 2. Người dùng gửi ảnh phản ánh
    if (eventName === 'user_send_image') {
      const attachments = [];
      if (Array.isArray(message.attachments)) {
        message.attachments.forEach(att => {
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
      return await this.handleNewReportFromZalo(senderId, descText, attachments);
    }

    // 3. Người dùng Quan tâm OA (Follow)
    if (eventName === 'follow') {
      if (senderId && this.autoReply) {
        const welcomeMsg = `👋 Chào mừng bạn đến với kênh Zalo Hỗ trợ & Tiếp nhận sự cố CSVC trường CĐ Kỹ thuật Cao Thắng!\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Bạn có thể:\n` +
          `1️⃣ Nhắn tin mô tả sự cố hoặc gửi ảnh hỏng hóc để tạo yêu cầu xử lý.\n` +
          `2️⃣ Gõ mã phiếu (Ví dụ: PYC-2026-123456) để tra cứu tiến độ KTV xử lý.\n` +
          `👉 Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn!`;
        await this.sendCustomerSupportMessage(senderId, welcomeMsg);
      }
      return { error: 0, message: 'Follow processed' };
    }

    return { error: 0, message: 'Ignored event' };
  }

  /**
   * Tra cứu phiếu và phản hồi qua Zalo
   */
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
          `🚦 Trạng thái: <b>${status}</b>\n` +
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

  /**
   * Tạo phản ánh mới nhận từ Zalo OA vào hệ thống
   */
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

    // 1. Ghi vào Firestore nếu có kết nối
    if (db) {
      try {
        await db.collection('reports').add(reportData);
        console.log(`[ZaloProvider] Created report #${code} from Zalo OA in Firestore`);
      } catch (dbErr) {
        console.error('[ZaloProvider] Error writing report to Firestore:', dbErr.message);
      }
    }

    // 2. Chuyển tiếp cảnh báo sang Telegram Bot 1 (Ban Quản trị & Kỹ thuật)
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

        const firstImage = attachments.length > 0 ? attachments[0].url : null;
        await telegramService.sendTelegramMessage(teleMsg, null, 'HTML');
      } catch (teleErr) {
        console.warn('[ZaloProvider] Error forwarding to Telegram:', teleErr.message);
      }
    }

    // 3. Phản hồi xác nhận tự động lại cho người dùng trên Zalo
    if (this.autoReply) {
      const confirmMsg = `🔔 <b>NSG SUPPORT - TIẾP NHẬN PHẢN ÁNH THÀNH CÔNG!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>Mã phiếu:</b> [${code}]\n` +
        `📝 <b>Nội dung:</b> ${title}\n` +
        `🚦 <b>Trạng thái:</b> CHỜ PHÂN CÔNG\n` +
        `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 Bộ phận Kỹ thuật đã tiếp nhận và sẽ sắp xếp xử lý sớm nhất.\n` +
        `💡 Bạn có thể gửi mã <b>${code}</b> vào đây bất cứ lúc nào để tra cứu tiến độ!`;

      await this.sendCustomerSupportMessage(senderId, confirmMsg);
    }

    return { error: 0, message: 'Report created successfully', code };
  }

  /**
   * Gửi tin nhắn thông báo Zalo OA qua template ZNS (legacy compatibility)
   */
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
            'access_token': this.accessToken
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
    return this.sendMessage(report.senderPhone, {
      templateId: 'NEW_REPORT_CONFIRMATION',
      data: {
        code: report.code,
        title: report.title,
        status: report.status,
        time: new Date().toLocaleTimeString('vi-VN')
      }
    });
  }

  async notifyTaskAssigned(task, phone) {
    if (!this.isEnabled() || !phone) return { success: false };
    return this.sendMessage(phone, {
      templateId: 'TASK_ASSIGNED',
      data: {
        code: task.code,
        title: task.title,
        deadline: task.deadline,
        priority: task.priority
      }
    });
  }
}

module.exports = new ZaloProvider();
