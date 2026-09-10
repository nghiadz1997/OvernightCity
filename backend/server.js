require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const apiRoutes = require('./routes/api');
const deadlineScheduler = require('./services/deadlineScheduler');
const telegramService = require('./services/telegramService');
const zaloProvider = require('./services/zaloProvider');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-user']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Phục vụ thư mục tệp upload công khai
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Phục vụ giao diện Frontend tĩnh nếu deploy nguyên khối
const frontendDir = path.resolve(process.cwd(), 'frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
}

// Gắn router API
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    system: 'NSG SUPPORT API',
    timestamp: new Date().toISOString(),
    telegramEnabled: telegramService.isEnabled(),
    zaloEnabled: zaloProvider.isEnabled(),
    emailEnabled: emailService.isEnabled(),
    uploadsPath: uploadsDir
  });
});

// SPA fallback: Chuyển hướng các route không phải /api về index.html của frontend
if (fs.existsSync(frontendDir)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi nội bộ máy chủ.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 NSG SUPPORT API SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🤖 Telegram Bot: ${telegramService.isEnabled() ? '✅ ACTIVATED' : '⚠️ NOT CONFIGURED (.env)'}`);
  console.log(`📱 Zalo OA: ${zaloProvider.isEnabled() ? '✅ ACTIVATED' : '⚪ READY / DISABLED'}`);
  console.log(`📧 Email Service (SMTP): ${emailService.isEnabled() ? '✅ ACTIVATED' : '⚪ SIMULATION MODE'}`);
  console.log(`📁 Uploads Directory: ${uploadsDir}`);
  console.log('====================================================');

  // Bật background cron scan deadline
  deadlineScheduler.start();
});
