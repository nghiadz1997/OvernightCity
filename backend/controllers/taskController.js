const { db, admin } = require('../config/firebaseAdmin');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

/**
 * Sinh mã tự tăng atomic cho Công việc nội bộ: TASK-YYYY-000001
 */
async function generateTaskCode() {
  const year = new Date().getFullYear();
  if (!db) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `TASK-${year}-${rand}`;
  }

  const counterRef = db.collection('counters').doc(`tasks_${year}`);

  try {
    const newCode = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let currentSeq = 0;
      if (doc.exists) {
        currentSeq = doc.data().seq || 0;
      }
      const nextSeq = currentSeq + 1;
      transaction.set(counterRef, { seq: nextSeq, year: year }, { merge: true });
      return `TASK-${year}-${String(nextSeq).padStart(6, '0')}`;
    });
    return newCode;
  } catch (error) {
    console.error('[generateTaskCode] Transaction error:', error.message);
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `TASK-${year}-${String(fallbackSeq).padStart(6, '0')}`;
  }
}

/**
 * 1. Trưởng phòng chủ động giao việc mới (+ GIAO VIỆC MỚI)
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      categoryName,
      departmentId,
      departmentName,
      location,
      room,
      assignedTo,
      assignedToName,
      priority = 'TRUNG BÌNH',
      deadline,
      attachments = [],
      assignmentNote = ''
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung công việc không được để trống.' });
    }

    const code = await generateTaskCode();
    const nowIso = new Date().toISOString();

    const taskData = {
      code,
      type: 'TASK',
      title: title.trim(),
      description: description.trim(),
      categoryId: categoryId || 'OTHER',
      categoryName: categoryName || 'Công việc nội bộ',
      departmentId: departmentId || null,
      departmentName: departmentName || 'Bộ phận Kỹ thuật',
      location: (location || 'Khuôn viên trường').trim(),
      room: (room || '').trim(),
      priority: priority.toUpperCase(),
      status: assignedTo ? 'ĐÃ PHÂN CÔNG' : 'CHỜ PHÂN CÔNG',
      assignedTo: assignedTo || null,
      assignedToName: assignedToName || null,
      assignedBy: req.user ? req.user.uid : 'MANAGER',
      assignedByName: req.user ? req.user.displayName : 'Trưởng phòng Kỹ thuật',
      assignmentNote: (assignmentNote || '').trim(),
      deadline: deadline || null,
      isOverdue: false,
      attachments: attachments || [],
      beforePhotos: [],
      afterPhotos: [],
      handoverDocs: [],
      completionNote: null,
      rejectionReason: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null
    };

    let docId = null;
    if (db) {
      const docRef = await db.collection('tasks').add({
        ...taskData,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp()
      });
      docId = docRef.id;
      taskData.id = docId;

      // Đồng thời cũng có thể lưu vào collection chung nếu cần, hoặc quản lý tasks riêng
      // Ghi activity log
      await notificationService.logActivity({
        targetId: docId,
        targetCode: code,
        action: 'TẠO CÔNG VIỆC MỚI',
        actorUid: req.user ? req.user.uid : 'MANAGER',
        actorName: req.user ? req.user.displayName : 'Trưởng phòng',
        actorRole: 'MANAGER',
        details: `Tạo công việc và ${assignedTo ? `giao cho ${assignedToName}` : 'chờ phân công'}`
      });

      // Nếu đã giao cho staff, bắn thông báo ngay
      if (assignedTo) {
        notificationService.dispatchTaskAssigned(taskData, { uid: assignedTo, displayName: assignedToName }, req.user).catch(err => {
          console.error('[createTask] Assign notification error:', err.message);
        });
      }
    } else {
      taskData.id = 'mock-' + Date.now();
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo và giao công việc mới thành công!',
      code: code,
      data: taskData
    });
  } catch (error) {
    console.error('[createTask] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo công việc.', error: error.message });
  }
};

/**
 * 2. Phân công công việc (Áp dụng cho cả Phản ánh PYC- hoặc Công việc TASK-)
 */
const assignTask = async (req, res) => {
  try {
    const { targetId, targetType = 'REPORT' } = req.params; // targetType: 'REPORT' hoặc 'TASK'
    const { assignedTo, assignedToName, deadline, priority, assignmentNote } = req.body;

    if (!assignedTo || !assignedToName) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn nhân viên kỹ thuật tiếp nhận.' });
    }

    const collectionName = targetType === 'TASK' ? 'tasks' : 'reports';
    const nowIso = new Date().toISOString();

    if (!db) {
      return res.status(200).json({ success: true, message: 'Đã phân công (mock mode).' });
    }

    const docRef = db.collection(collectionName).doc(targetId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc để phân công.' });
    }

    const currentData = docSnap.data();

    const updatePayload = {
      assignedTo,
      assignedToName,
      assignedBy: req.user ? req.user.uid : 'MANAGER',
      assignedByName: req.user ? req.user.displayName : 'Trưởng phòng Kỹ thuật',
      status: 'ĐÃ PHÂN CÔNG',
      updatedAt: nowIso
    };

    if (deadline) updatePayload.deadline = deadline;
    if (priority) updatePayload.priority = priority.toUpperCase();
    if (assignmentNote) updatePayload.assignmentNote = assignmentNote.trim();

    await docRef.update(updatePayload);

    const updatedTask = { id: targetId, ...currentData, ...updatePayload };

    // Bắn thông báo realtime
    notificationService.dispatchTaskAssigned(
      updatedTask,
      { uid: assignedTo, displayName: assignedToName },
      req.user
    ).catch(e => console.error(e));

    // Gửi email cập nhật tiến độ cho người phản ánh
    if (updatedTask.senderEmail) {
      emailService.sendStatusUpdate(
        updatedTask,
        'ĐÃ PHÂN CÔNG',
        assignmentNote ? `Đã giao cho KTV: ${assignedToName}. Ghi chú: ${assignmentNote}` : `Đã giao cho KTV: ${assignedToName}`,
        assignedToName
      ).catch(e => console.error('[assignTask] Email update error:', e));
    }

    return res.status(200).json({
      success: true,
      message: `Đã phân công thành công cho ${assignedToName}!`,
      data: updatedTask
    });
  } catch (error) {
    console.error('[assignTask] Error:', error);
    return res.status(500).json({ success: false, message: 'Không thể phân công công việc.', error: error.message });
  }
};

/**
 * 3. Kỹ thuật viên nhận việc hoặc bắt đầu xử lý
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { targetId, targetType = 'REPORT' } = req.params;
    const { status, note, beforePhotos, afterPhotos, handoverDocs } = req.body;

    const collectionName = targetType === 'TASK' ? 'tasks' : 'reports';
    const nowIso = new Date().toISOString();

    if (!db) return res.status(200).json({ success: true, message: 'Cập nhật thành công (mock).' });

    const docRef = db.collection(collectionName).doc(targetId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu yêu cầu.' });
    }

    const task = docSnap.data();
    const updatePayload = { updatedAt: nowIso };

    if (status) updatePayload.status = status;
    if (note) updatePayload.latestNote = note;
    if (beforePhotos && Array.isArray(beforePhotos)) updatePayload.beforePhotos = beforePhotos;
    if (afterPhotos && Array.isArray(afterPhotos)) updatePayload.afterPhotos = afterPhotos;
    if (handoverDocs && Array.isArray(handoverDocs)) updatePayload.handoverDocs = handoverDocs;

    if (status === 'CHỜ NGHIỆM THU') {
      updatePayload.completionNote = note || 'Đã hoàn thành, chuyển chờ nghiệm thu.';
    } else if (status === 'HOÀN THÀNH') {
      updatePayload.completedAt = nowIso;
    }

    await docRef.update(updatePayload);

    // Ghi activity log
    await notificationService.logActivity({
      targetId,
      targetCode: task.code,
      action: `CHUYỂN TRẠNG THÁI: ${status}`,
      actorUid: req.user ? req.user.uid : 'STAFF',
      actorName: req.user ? req.user.displayName : 'Kỹ thuật viên',
      actorRole: req.user ? req.user.role : 'STAFF',
      details: note || `Cập nhật trạng thái thành ${status}`
    });

    // Nếu gửi nghiệm thu -> dispatch thông báo cho Manager
    if (status === 'CHỜ NGHIỆM THU') {
      notificationService.dispatchTaskCompleted({ ...task, ...updatePayload }, req.user).catch(e => console.error(e));
    }

    // Gửi email cập nhật tiến độ cho người gửi phản ánh
    const updatedTask = { ...task, ...updatePayload };
    if (updatedTask.senderEmail) {
      const staffName = req.user ? req.user.displayName : 'Kỹ thuật viên';
      emailService.sendStatusUpdate(updatedTask, status, note, staffName).catch(e => console.error('[updateTaskStatus] Email update error:', e));
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái: ${status}`,
      data: { id: targetId, ...task, ...updatePayload }
    });
  } catch (error) {
    console.error('[updateTaskStatus] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái.', error: error.message });
  }
};

/**
 * 4. Trưởng phòng Nghiệm thu hoặc Yêu cầu làm lại
 */
const reviewTask = async (req, res) => {
  try {
    const { targetId, targetType = 'REPORT' } = req.params;
    const { approved, rejectionReason, note } = req.body;

    const collectionName = targetType === 'TASK' ? 'tasks' : 'reports';
    const nowIso = new Date().toISOString();

    if (!db) return res.status(200).json({ success: true, message: 'Duyệt thành công (mock).' });

    const docRef = db.collection(collectionName).doc(targetId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    const task = docSnap.data();

    if (approved) {
      // DUYỆT HOÀN THÀNH
      await docRef.update({
        status: 'HOÀN THÀNH',
        completedAt: nowIso,
        updatedAt: nowIso,
        managerApprovalNote: note || 'Đã nghiệm thu và đạt chất lượng.'
      });

      await notificationService.logActivity({
        targetId,
        targetCode: task.code,
        action: 'DUYỆT HOÀN THÀNH',
        actorUid: req.user ? req.user.uid : 'MANAGER',
        actorName: req.user ? req.user.displayName : 'Trưởng phòng',
        actorRole: 'MANAGER',
        details: note || 'Đã nghiệm thu công việc thành công.'
      });

      if (task.senderEmail) {
        emailService.sendStatusUpdate(
          task,
          'HOÀN THÀNH',
          note || 'Đã nghiệm thu và hoàn tất xử lý.',
          req.user?.displayName || 'Trưởng phòng'
        ).catch(e => console.error('[reviewTask] Email update error:', e));
      }

      return res.status(200).json({
        success: true,
        message: `Đã duyệt hoàn thành công việc ${task.code}!`
      });
    } else {
      // YÊU CẦU XỬ LÝ LẠI
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập lý do yêu cầu xử lý lại để kỹ thuật viên biết và khắc phục.'
        });
      }

      await docRef.update({
        status: 'ĐANG XỬ LÝ', // hoặc YÊU CẦU XỬ LÝ LẠI
        rejectionReason: rejectionReason.trim(),
        updatedAt: nowIso
      });

      notificationService.dispatchTaskReopened(task, req.user, rejectionReason).catch(e => console.error(e));

      if (task.senderEmail) {
        emailService.sendStatusUpdate(
          task,
          'ĐANG XỬ LÝ',
          `Yêu cầu kiểm tra & xử lý lại: ${rejectionReason}`,
          req.user?.displayName || 'Trưởng phòng'
        ).catch(e => console.error('[reviewTask] Email update error:', e));
      }

      return res.status(200).json({
        success: true,
        message: `Đã gửi yêu cầu xử lý lại cho kỹ thuật viên với lý do: "${rejectionReason}"`
      });
    }
  } catch (error) {
    console.error('[reviewTask] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi nghiệm thu công việc.', error: error.message });
  }
};

/**
 * 5. Thêm bình luận trao đổi xử lý
 */
const addComment = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { content, targetType = 'REPORT', authorName, authorRole, attachments = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được rỗng.' });
    }

    const commentData = {
      targetId,
      targetType,
      authorUid: req.user ? req.user.uid : null,
      authorName: (req.user ? req.user.displayName : authorName) || 'Người dùng',
      authorRole: (req.user ? req.user.role : authorRole) || 'GUEST',
      content: content.trim(),
      attachments: attachments || [],
      createdAt: new Date().toISOString()
    };

    if (db) {
      const docRef = await db.collection('comments').add({
        ...commentData,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp()
      });
      commentData.id = docRef.id;
    } else {
      commentData.id = 'comment-' + Date.now();
    }

    return res.status(201).json({
      success: true,
      message: 'Đã gửi bình luận thành công!',
      data: commentData
    });
  } catch (error) {
    console.error('[addComment] Error:', error);
    return res.status(500).json({ success: false, message: 'Không thể gửi bình luận.', error: error.message });
  }
};

module.exports = {
  createTask,
  assignTask,
  updateTaskStatus,
  reviewTask,
  addComment
};
