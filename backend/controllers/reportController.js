const { db, admin } = require('../config/firebaseAdmin');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

/**
 * Sinh mã tự tăng atomic cho Báo cáo phản ánh: PYC-YYYY-000001
 */
async function generateReportCode() {
  const year = new Date().getFullYear();
  if (!db) {
    // Fallback nếu chạy không có Firebase
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `PYC-${year}-${rand}`;
  }

  const counterRef = db.collection('counters').doc(`reports_${year}`);

  try {
    const newCode = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let currentSeq = 0;
      if (doc.exists) {
        currentSeq = doc.data().seq || 0;
      }
      const nextSeq = currentSeq + 1;
      transaction.set(counterRef, { seq: nextSeq, year: year }, { merge: true });
      return `PYC-${year}-${String(nextSeq).padStart(6, '0')}`;
    });
    return newCode;
  } catch (error) {
    console.error('[generateReportCode] Transaction error:', error.message);
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `PYC-${year}-${String(fallbackSeq).padStart(6, '0')}`;
  }
}

/**
 * Tính toán deadline dự kiến dựa trên mức độ ưu tiên
 */
function calculateDefaultDeadline(priority) {
  const now = new Date();
  let hoursToAdd = 48; // BÌNH THƯỜNG: 48h
  if (priority === 'KHẨN CẤP') hoursToAdd = 2;
  else if (priority === 'CAO') hoursToAdd = 8;
  else if (priority === 'TRUNG BÌNH') hoursToAdd = 24;

  now.setHours(now.getHours() + hoursToAdd);
  return now.toISOString();
}

/**
 * 1. Tạo phản ánh mới (Public hoặc Logged-in User)
 */
const createReport = async (req, res) => {
  try {
    const {
      senderName,
      senderCode, // Mã SV hoặc Mã NV
      senderDept,
      senderPhone,
      senderEmail,
      type, // 'REPORT'
      categoryId,
      categoryName,
      location,
      room,
      title,
      description,
      priority = 'BÌNH THƯỜNG',
      attachments = [],
      deviceId: clientDeviceId
    } = req.body;

    // Validation cơ bản
    if (!senderName || !senderPhone || !title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các trường bắt buộc: Họ tên, Số điện thoại, Tiêu đề, Nội dung, Địa điểm.'
      });
    }

    // Thu thập chứng cứ định danh: IP, User-Agent, Device ID chống chối bỏ
    const clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.socket?.remoteAddress || req.ip || 'Unknown');
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const deviceId = req.headers['x-device-id'] || clientDeviceId || 'Unknown';

    const code = await generateReportCode();
    const nowIso = new Date().toISOString();
    const deadline = calculateDefaultDeadline(priority);

    const reportData = {
      code,
      type: 'REPORT',
      title: title.trim(),
      description: description.trim(),
      categoryId: categoryId || 'OTHER',
      categoryName: categoryName || 'Khác',
      location: location.trim(),
      room: (room || '').trim(),
      priority: priority.toUpperCase(),
      status: 'CHỜ PHÂN CÔNG', // Workflow: MỚI -> CHỜ PHÂN CÔNG
      senderName: senderName.trim(),
      senderCode: (senderCode || '').trim(),
      senderDept: (senderDept || '').trim(),
      senderPhone: senderPhone.trim(),
      senderEmail: (senderEmail || '').trim(),
      userId: req.user ? req.user.uid : null,
      // Metadata xác thực & thiết bị (Audit Trail)
      clientIp,
      userAgent,
      deviceId,
      auditMeta: {
        clientIp,
        userAgent,
        deviceId,
        verifiedEmail: (senderEmail || '').trim(),
        verifiedName: senderName.trim(),
        submittedAt: nowIso
      },
      assignedTo: null,
      assignedToName: null,
      assignedBy: null,
      assignedByName: null,
      attachments: attachments || [],
      beforePhotos: [],
      afterPhotos: [],
      handoverDocs: [],
      deadline: deadline,
      isOverdue: false,
      rating: null,
      feedback: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null
    };

    let docId = null;
    if (db) {
      const docRef = await db.collection('reports').add({
        ...reportData,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp()
      });
      docId = docRef.id;
      reportData.id = docId;
    } else {
      docId = 'mock-' + Date.now();
      reportData.id = docId;
    }

    // Bắn thông báo realtime đa kênh (Telegram + In-app + Activity Log)
    notificationService.dispatchNewReport(reportData).catch(err => {
      console.error('[createReport] Notification dispatch error:', err.message);
    });

    // Tự động gửi Email xác nhận cho người gửi nếu có email
    if (reportData.senderEmail) {
      emailService.sendReportConfirmation(reportData).catch(err => {
        console.error('[createReport] Email confirmation error:', err.message);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Gửi phản ánh thành công! Đã gửi email xác nhận kèm mã phản ánh.',
      code: code,
      data: reportData
    });
  } catch (error) {
    console.error('[createReport] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tạo phản ánh. Vui lòng thử lại.',
      error: error.message
    });
  }
};

/**
 * 2. Tra cứu chi tiết phản ánh theo Mã phiếu (Public tracking)
 */
const getReportByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Thiếu mã yêu cầu.' });
    }

    const cleanCode = code.trim().toUpperCase();

    if (!db) {
      return res.status(404).json({ success: false, message: 'Chưa cấu hình cơ sở dữ liệu.' });
    }

    const snapshot = await db.collection('reports').where('code', '==', cleanCode).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy phiếu yêu cầu với mã "${cleanCode}". Vui lòng kiểm tra lại.`
      });
    }

    const doc = snapshot.docs[0];
    const report = { id: doc.id, ...doc.data() };

    // Lấy activity logs liên quan
    const logsSnap = await db.collection('activity_logs')
      .where('targetId', '==', doc.id)
      .orderBy('timestamp', 'asc')
      .get();

    const activityLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Lấy comments
    const commentsSnap = await db.collection('comments')
      .where('targetId', '==', doc.id)
      .orderBy('createdAt', 'asc')
      .get();

    const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        activityLogs,
        comments
      }
    });
  } catch (error) {
    console.error('[getReportByCode] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tra cứu yêu cầu. Vui lòng thử lại.',
      error: error.message
    });
  }
};

/**
 * 3. Gửi đánh giá 5 sao & phản hồi sau khi hoàn thành
 */
const submitFeedback = async (req, res) => {
  try {
    const { code } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5.' });
    }

    if (!db) {
      return res.status(200).json({ success: true, message: 'Đã lưu đánh giá (mock).' });
    }

    const snapshot = await db.collection('reports').where('code', '==', code.toUpperCase()).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu yêu cầu.' });
    }

    const doc = snapshot.docs[0];
    const report = doc.data();

    if (report.status !== 'HOÀN THÀNH') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể đánh giá khi công việc đã ở trạng thái HOÀN THÀNH.'
      });
    }

    await db.collection('reports').doc(doc.id).update({
      rating: Number(rating),
      feedback: (feedback || '').trim(),
      updatedAt: new Date().toISOString()
    });

    await notificationService.logActivity({
      targetId: doc.id,
      targetCode: report.code,
      action: 'ĐÁNH GIÁ CHẤT LƯỢNG',
      actorName: report.senderName || 'Người gửi',
      actorRole: 'USER',
      details: `Đánh giá ${rating} sao. Ý kiến: "${feedback || 'Không có ý kiến'}"`
    });

    return res.status(200).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá chất lượng dịch vụ!'
    });
  } catch (error) {
    console.error('[submitFeedback] Error:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu đánh giá.', error: error.message });
  }
};

module.exports = {
  createReport,
  getReportByCode,
  submitFeedback
};
