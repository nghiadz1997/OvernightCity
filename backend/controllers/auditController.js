const { db, admin } = require('../config/firebaseAdmin');
const xlsx = require('xlsx');

// Bộ nhớ tạm phục vụ chế độ Standalone / Mock khi chưa có Firestore
const inMemoryAccessLogs = [];

/**
 * 1. Ghi nhận nhật ký đăng nhập (Google Login / System Login)
 * Endpoint: POST /api/audit/login
 */
const recordLoginLog = async (req, res) => {
  try {
    const { email, displayName, photoURL, deviceId: bodyDeviceId, provider = 'Google' } = req.body;

    const clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const deviceId = req.headers['x-device-id'] || bodyDeviceId || 'Unknown';
    const nowIso = new Date().toISOString();

    const logEntry = {
      type: 'LOGIN',
      action: `Đăng nhập qua ${provider}`,
      email: email || 'Ẩn danh',
      displayName: displayName || email?.split('@')[0] || 'Người dùng',
      photoURL: photoURL || '',
      clientIp,
      userAgent,
      deviceId,
      provider,
      createdAt: nowIso
    };

    if (db) {
      const docRef = await db.collection('access_logs').add({
        ...logEntry,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp()
      });
      logEntry.id = docRef.id;
    } else {
      logEntry.id = 'log_' + Date.now();
      inMemoryAccessLogs.unshift(logEntry);
      if (inMemoryAccessLogs.length > 500) inMemoryAccessLogs.pop();
    }

    return res.status(201).json({
      success: true,
      message: 'Ghi nhận nhật ký đăng nhập thành công.',
      data: logEntry
    });
  } catch (error) {
    console.error('[recordLoginLog] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi ghi nhật ký.', error: error.message });
  }
};

/**
 * 2. Thống kê & Danh sách chi tiết nhật ký đăng nhập và gửi phản ánh kèm IP
 * Endpoint: GET /api/audit/logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { type, search, limit = 100 } = req.query;
    let combinedLogs = [];

    if (db) {
      // Đọc từ Firestore: 'access_logs' và 'reports'
      const [accessSnap, reportsSnap] = await Promise.all([
        db.collection('access_logs').orderBy('createdAt', 'desc').limit(parseInt(limit, 10)).get().catch(() => ({ docs: [] })),
        db.collection('reports').orderBy('createdAt', 'desc').limit(parseInt(limit, 10)).get().catch(() => ({ docs: [] }))
      ]);

      accessSnap.docs?.forEach(doc => {
        combinedLogs.push({ id: doc.id, ...doc.data() });
      });

      reportsSnap.docs?.forEach(doc => {
        const d = doc.data();
        combinedLogs.push({
          id: doc.id,
          type: 'REPORT_SUBMIT',
          action: `Gửi phản ánh #${d.code || doc.id}`,
          reportCode: d.code,
          reportTitle: d.title,
          reportPriority: d.priority,
          location: d.location ? `${d.location} ${d.room ? `(${d.room})` : ''}` : '',
          email: d.senderEmail || d.auditMeta?.verifiedEmail || '',
          displayName: d.senderName || d.auditMeta?.verifiedName || '',
          phone: d.senderPhone || '',
          clientIp: d.clientIp || d.auditMeta?.clientIp || '127.0.0.1',
          userAgent: d.userAgent || d.auditMeta?.userAgent || 'Unknown',
          deviceId: d.deviceId || d.auditMeta?.deviceId || 'Unknown',
          createdAt: d.createdAt || new Date().toISOString()
        });
      });
    } else {
      // Mock mode: lấy từ inMemoryAccessLogs + dữ liệu mô phỏng
      combinedLogs = [...inMemoryAccessLogs];

      // Thêm mẫu để Super Admin xem giao diện sinh động nếu chưa có nhiều dữ liệu thật
      if (combinedLogs.length === 0) {
        combinedLogs.push({
          id: 'mock-1',
          type: 'LOGIN',
          action: 'Đăng nhập qua Google',
          email: 'nguyenvana@gmail.com',
          displayName: 'Nguyễn Văn An',
          clientIp: '14.161.22.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
          deviceId: 'dev_84f92c10-91a2-4a7b-83c9-029471ab8201',
          provider: 'Google',
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        });
        combinedLogs.push({
          id: 'mock-2',
          type: 'REPORT_SUBMIT',
          action: 'Gửi phản ánh #PYC-2026-467804',
          reportCode: 'PYC-2026-467804',
          reportTitle: 'Kiểm tra đèn hư hỏng phòng A101',
          reportPriority: 'CAO',
          location: 'Cơ sở 1 - Khu A (Phòng A101)',
          email: 'nguyenvana@gmail.com',
          displayName: 'Nguyễn Văn An',
          phone: '0912345678',
          clientIp: '14.161.22.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
          deviceId: 'dev_84f92c10-91a2-4a7b-83c9-029471ab8201',
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        });
        combinedLogs.push({
          id: 'mock-3',
          type: 'LOGIN',
          action: 'Đăng nhập qua Google',
          email: 'tranvanb@truong.edu.vn',
          displayName: 'Trần Văn Bình',
          clientIp: '113.190.234.12',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1',
          deviceId: 'dev_e9102ca1-4f81-4b19-9801-bca81920ac34',
          provider: 'Google',
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        });
      }
    }

    // Sắp xếp thời gian mới nhất lên đầu
    combinedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Bộ lọc loại hành động
    if (type && type !== 'ALL') {
      combinedLogs = combinedLogs.filter(l => l.type === type);
    }

    // Tìm kiếm theo từ khóa (IP, Email, Tên, Mã phiếu)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      combinedLogs = combinedLogs.filter(l => 
        (l.clientIp && l.clientIp.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.displayName && l.displayName.toLowerCase().includes(q)) ||
        (l.deviceId && l.deviceId.toLowerCase().includes(q)) ||
        (l.reportCode && l.reportCode.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q))
      );
    }

    // Tính toán số liệu thống kê
    const ipCounts = {};
    const deviceSet = new Set();
    const userSet = new Set();

    combinedLogs.forEach(item => {
      const ip = item.clientIp || 'Unknown';
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      if (item.deviceId) deviceSet.add(item.deviceId);
      if (item.email) userSet.add(item.email);
    });

    const topIps = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      stats: {
        totalLogs: combinedLogs.length,
        uniqueIps: Object.keys(ipCounts).length,
        uniqueDevices: deviceSet.size,
        uniqueUsers: userSet.size,
        topIps
      },
      data: combinedLogs
    });
  } catch (error) {
    console.error('[getAuditLogs] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải nhật ký.', error: error.message });
  }
};

/**
 * 3. Xuất file Excel báo cáo nhật ký IP cho Super Admin
 * Endpoint: GET /api/audit/export
 */
const exportAuditLogs = async (req, res) => {
  try {
    // Tận dụng getAuditLogs logic nội bộ
    const reqMock = { query: { limit: 1000 } };
    let logs = [];
    const resMock = {
      status: () => ({
        json: (payload) => {
          logs = payload.data || [];
        }
      })
    };
    await getAuditLogs(reqMock, resMock);

    const rows = logs.map((l, index) => ({
      'STT': index + 1,
      'Thời gian': new Date(l.createdAt).toLocaleString('vi-VN'),
      'Loại hành động': l.type === 'REPORT_SUBMIT' ? 'GỬI PHẢN ÁNH' : 'ĐĂNG NHẬP',
      'Chi tiết hành động': l.action || '',
      'Họ và tên': l.displayName || '',
      'Email người dùng': l.email || '',
      'Số điện thoại': l.phone || '',
      'Địa chỉ IP': l.clientIp || '',
      'Mã thiết bị (Device ID)': l.deviceId || '',
      'Mã phản ánh': l.reportCode || '',
      'Vị trí sự cố': l.location || '',
      'Trình duyệt & Hệ điều hành': l.userAgent || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Nhat_Ky_IP_Truy_Cap');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Nhat_ky_IP_va_Dang_nhap_${Date.now()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    console.error('[exportAuditLogs] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xuất file Excel.', error: error.message });
  }
};

module.exports = {
  recordLoginLog,
  getAuditLogs,
  exportAuditLogs
};
