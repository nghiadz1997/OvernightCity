const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const taskController = require('../controllers/taskController');
const statsController = require('../controllers/statsController');
const auditController = require('../controllers/auditController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { reportSubmitLimiter, checkHoneypot } = require('../middleware/rateLimiter');
const upload = require('../middleware/uploadMiddleware');
const telegramService = require('../services/telegramService');
const zaloProvider = require('../services/zaloProvider');

// ==========================================
// 1. PUBLIC ROUTES (Người dùng & Khách)
// ==========================================

// Gửi phản ánh (có rate limiter & honeypot chống spam)
router.post('/reports', reportSubmitLimiter, checkHoneypot, reportController.createReport);

// Tra cứu tiến độ theo mã yêu cầu
router.get('/reports/track/:code', reportController.getReportByCode);

// Đánh giá sau hoàn thành (1 - 5 sao)
router.post('/reports/feedback/:code', reportController.submitFeedback);

// Upload file/ảnh đính kèm
router.post('/upload', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa chọn tệp để tải lên.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;

    const fileUrls = req.files.map(file => ({
      name: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: `${protocol}://${host}/uploads/${file.filename}`
    }));

    return res.status(200).json({
      success: true,
      message: `Tải lên thành công ${fileUrls.length} tệp!`,
      files: fileUrls
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tải lên tệp.', error: error.message });
  }
});

// Test cấu hình Telegram Bot qua Server (Bảo mật tuyệt đối - Không lộ Token ra F12)
router.post('/telegram/test', async (req, res) => {
  try {
    const { token, chatId } = req.body || {};
    const text = '🚀 <b>NSG SUPPORT</b> - Kiểm tra kết nối Telegram Bot thành công lúc ' + new Date().toLocaleString('vi-VN');
    
    if (token && chatId) {
      const axios = require('axios');
      const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      return res.status(200).json({ success: true, result: response.data });
    }

    const result = await telegramService.sendTelegramMessage(text, chatId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.response?.data?.description || error.message });
  }
});

// Gửi thông báo Telegram qua Server Relay (Ẩn 100% Bot Token khỏi F12 Client)
router.post('/telegram/send', async (req, res) => {
  try {
    const { message, chatId, token } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung tin nhắn.' });
    }

    if (token && chatId) {
      const axios = require('axios');
      const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      return res.status(200).json({ success: true, result: response.data });
    }

    const result = await telegramService.sendTelegramMessage(message, chatId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.response?.data?.description || error.message });
  }
});

// ==========================================
// BOT 3: ZALO OA - WEBHOOK & BOT TIẾP NHẬN PHẢN ÁNH
// ==========================================

// 1. Zalo OA Webhook Verification (Challenge endpoint cho Zalo for Developers)
router.get('/zalo/webhook', (req, res) => {
  try {
    const challenge = req.query.challenge || req.query['hub.challenge'];
    if (challenge) {
      console.log('[ZaloWebhook] Verification Challenge received:', challenge);
      return res.status(200).send(challenge);
    }
    return res.status(200).json({
      status: 'OK',
      service: 'NSG ZALO OA WEBHOOK',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// 2. Tiếp nhận sự kiện Webhook từ Zalo Official Account (Người dùng gửi tin nhắn/ảnh phản ánh)
router.post('/zalo/webhook', async (req, res) => {
  try {
    if (!zaloProvider.verifyWebhook(req)) {
      console.warn('[ZaloWebhook] Rejected unauthorized request (invalid secret token)');
      return res.status(401).json({ error: -1, message: 'Invalid Secret Token' });
    }

    // Xử lý sự kiện bất đồng bộ để phản hồi HTTP 200 ngay lập tức cho Zalo server (< 2s)
    zaloProvider.handleWebhookEvent(req.body).catch(err => {
      console.error('[ZaloWebhook] Error handling event:', err);
    });

    return res.status(200).json({ error: 0, message: 'Success' });
  } catch (err) {
    console.error('[ZaloWebhook] Webhook endpoint error:', err);
    return res.status(200).json({ error: 0, message: 'Error caught' });
  }
});

// 3. Test kết nối Zalo OA Token & Secret
router.post('/zalo/test', async (req, res) => {
  try {
    const { accessToken, secretToken } = req.body || {};
    const result = await zaloProvider.testConnection(accessToken, secretToken);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// 4. Lấy & Cập nhật cấu hình Zalo OA
router.get('/zalo/config', (req, res) => {
  res.json({ success: true, config: zaloProvider.getConfig() });
});

router.post('/zalo/config', (req, res) => {
  zaloProvider.updateConfig(req.body || {});
  res.json({ success: true, message: 'Cập nhật cấu hình Zalo OA thành công' });
});

// ==========================================
// 2. AUTHENTICATED / MANAGEMENT ROUTES
// ==========================================

// Thống kê Dashboard
router.get('/stats/dashboard', statsController.getDashboardStats);

// Xuất file báo cáo Excel / CSV
router.get('/stats/export', statsController.exportReportsData);

// Trưởng phòng giao việc mới (+ GIAO VIỆC MỚI)
router.post('/tasks/create', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), taskController.createTask);

// Phân công công việc (Trưởng phòng/Admin)
router.post('/tasks/:targetId/assign', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), taskController.assignTask);

// Kỹ thuật viên cập nhật tiến độ / Nhận việc / Gửi nghiệm thu
router.post('/tasks/:targetId/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), taskController.updateTaskStatus);

// Nghiệm thu công việc (Duyệt hoặc Yêu cầu làm lại)
router.post('/tasks/:targetId/review', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), taskController.reviewTask);

// Thêm bình luận trao đổi xử lý
router.post('/tasks/:targetId/comments', requireAuth, taskController.addComment);

// ==========================================
// 3. AUDIT & IP TRACKING ROUTES (Super Admin)
// ==========================================

// Ghi nhận nhật ký đăng nhập (Client gọi sau khi Google Sign-In)
router.post('/audit/login', auditController.recordLoginLog);

// Lấy danh sách thống kê nhật ký IP & Đăng nhập (Dành cho Super Admin)
router.get('/audit/logs', auditController.getAuditLogs);

// Xuất file Excel nhật ký truy cập & IP
router.get('/audit/export', auditController.exportAuditLogs);

module.exports = router;
