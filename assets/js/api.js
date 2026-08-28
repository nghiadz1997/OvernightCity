/**
 * NSG SUPPORT - PURE FIREBASE CLIENT API & DATABASE SERVICE
 * Giao tiếp trực tiếp 100% với Cloud Firestore (Không bị lỗi Failed to fetch)
 */

const ApiService = {
  getDb() {
    if (window.firebase) {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        if (window.APP_CONFIG && window.APP_CONFIG.firebaseConfig) {
          window.firebase.initializeApp(window.APP_CONFIG.firebaseConfig);
        }
      }
      if (typeof window.firebase.firestore === 'function') {
        return window.firebase.firestore();
      }
    }
    throw new Error('Firebase Firestore chưa sẵn sàng. Vui lòng tải lại trang.');
  },

  // 1. Gửi phản ánh từ người dùng (Lưu trực tiếp vào Cloud Firestore collection 'reports')
  async submitReport(reportData) {
    try {
      const db = this.getDb();
      const code = `PYC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const nowIso = new Date().toISOString();

      const fullData = {
        senderName: reportData.senderName || '',
        senderCode: reportData.senderCode || '',
        senderDept: reportData.senderDept || '',
        senderPhone: reportData.senderPhone || '',
        senderEmail: reportData.senderEmail || '',
        categoryId: reportData.categoryId || 'OTHER',
        categoryName: reportData.categoryName || 'Khác',
        priority: reportData.priority || 'BÌNH THƯỜNG',
        location: reportData.location || '',
        room: reportData.room || '',
        title: reportData.title || '',
        description: reportData.description || '',
        attachments: reportData.attachments || [],
        code: code,
        type: 'REPORT',
        status: 'CHỜ PHÂN CÔNG',
        assignedTo: null,
        assignedToName: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        isOverdue: false
      };

      const docRef = await db.collection('reports').add(fullData);
      fullData.id = docRef.id;

      // Ghi nhật ký vào collection 'activity_logs'
      try {
        await db.collection('activity_logs').add({
          targetId: docRef.id,
          targetCode: code,
          action: 'TẠO PHẢN ÁNH',
          actorName: reportData.senderName || 'Người gửi',
          actorRole: 'USER',
          details: `Gửi phản ánh tại ${reportData.location || ''} - ${reportData.room || ''}`,
          timestamp: nowIso
        });
      } catch (logErr) {
        console.warn('Lỗi ghi activity log:', logErr);
      }

      // Gửi thông báo Telegram tự động tới Ban Quản lý / Nhóm kỹ thuật (KÈM ẢNH NẾU CÓ)
      try {
        const priorityIcon = reportData.priority === 'KHẨN CẤP' ? '🚨 KHẨN CẤP' : reportData.priority === 'CAO' ? '🟠 CAO' : '🔵 ' + (reportData.priority || 'BÌNH THƯỜNG');
        const teleMsg = `📢 <b>[NSG SUPPORT] CÓ PHẢN ÁNH SỰ CỐ MỚI!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 <b>Mã phiếu:</b> <code>${code}</code>\n` +
          `⚠️ <b>Mức độ:</b> <b>${priorityIcon}</b>\n` +
          `📌 <b>Loại sự cố:</b> ${reportData.categoryName || 'Khác'}\n` +
          `🏢 <b>Khoa / Phòng:</b> ${reportData.senderDept || 'Chưa rõ'}\n` +
          `📍 <b>Vị trí:</b> ${reportData.location || ''} - ${reportData.room || ''}\n` +
          `📝 <b>Tiêu đề:</b> ${reportData.title || ''}\n` +
          `👤 <b>Người gửi:</b> ${reportData.senderName || 'Ẩn danh'} (SĐT: ${reportData.senderPhone || 'Không có'})\n` +
          `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
          `👉 <i>Vui lòng đăng nhập hệ thống để tiếp nhận & phân công xử lý.</i>`;

        let firstImage = null;
        if (Array.isArray(reportData.attachments) && reportData.attachments.length > 0) {
          const imgAtt = reportData.attachments.find(a => (a.mimetype && a.mimetype.startsWith('image/')) || (a.url && (a.url.startsWith('data:image') || a.url.endsWith('.jpg') || a.url.endsWith('.png'))));
          if (imgAtt) firstImage = imgAtt.url;
        }

        this.sendTelegramNotification(teleMsg, null, null, firstImage);
      } catch (teleErr) {
        console.warn('Lỗi gửi Telegram tự động:', teleErr);
      }

      return { success: true, code, data: fullData };
    } catch (err) {
      console.error('[ApiService] submitReport error:', err);
      throw new Error('Lỗi gửi phản ánh lên Firebase: ' + err.message);
    }
  },

  // 2. Tra cứu tiến độ phản ánh theo mã phiếu
  async trackReport(code) {
    try {
      const db = this.getDb();
      const cleanCode = code.trim().toUpperCase();
      const snap = await db.collection('reports').where('code', '==', cleanCode).limit(1).get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }

      // Thử tìm trong collection tasks
      const taskSnap = await db.collection('tasks').where('code', '==', cleanCode).limit(1).get();
      if (!taskSnap.empty) {
        const doc = taskSnap.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }

      return { success: false, message: `Không tìm thấy phiếu yêu cầu với mã "${cleanCode}". Vui lòng kiểm tra lại.` };
    } catch (err) {
      console.error('[ApiService] trackReport error:', err);
      throw new Error('Lỗi tra cứu từ Firebase: ' + err.message);
    }
  },

  // 3. Đánh giá chất lượng sau khi hoàn thành
  async submitFeedback(code, rating, feedback) {
    try {
      const db = this.getDb();
      const cleanCode = code.trim().toUpperCase();
      const snap = await db.collection('reports').where('code', '==', cleanCode).limit(1).get();

      if (!snap.empty) {
        await snap.docs[0].ref.update({
          rating: Number(rating),
          feedback: feedback || '',
          updatedAt: new Date().toISOString()
        });
        return { success: true };
      }
      throw new Error('Không tìm thấy phiếu để đánh giá.');
    } catch (err) {
      console.error('[ApiService] submitFeedback error:', err);
      throw err;
    }
  },

  // 4. Upload tệp/ảnh (Lưu Base64 Data URL kiên cố phục vụ hiển thị và gửi trực tiếp Telegram)
  async uploadFiles(fileList) {
    const files = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(f);
      });
      if (dataUrl) {
        files.push({
          name: f.name,
          url: dataUrl,
          size: f.size,
          mimetype: f.type
        });
      }
    }
    return { success: true, files };
  },

  // 5. Trưởng phòng chủ động giao việc mới (+ GIAO VIỆC MỚI)
  async createTask(taskData) {
    try {
      const db = this.getDb();
      const code = `TASK-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const nowIso = new Date().toISOString();

      const fullData = {
        ...taskData,
        code,
        type: 'TASK',
        status: (taskData.assignedTo && (Array.isArray(taskData.assignedTo) ? taskData.assignedTo.length > 0 : true)) ? 'ĐÃ PHÂN CÔNG' : 'CHỜ PHÂN CÔNG',
        createdAt: nowIso,
        updatedAt: nowIso,
        isOverdue: false
      };

      const docRef = await db.collection('tasks').add(fullData);
      fullData.id = docRef.id;

      return { success: true, code, data: fullData };
    } catch (err) {
      console.error('[ApiService] createTask error:', err);
      throw new Error('Lỗi tạo nhiệm vụ trên Firebase: ' + err.message);
    }
  },

  // 6. Phân công công việc cho kỹ thuật viên (Hỗ trợ 1 người hoặc nhóm 2-3 KTV)
  async assignTask(targetId, targetType, assignData) {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';
      const docRef = db.collection(col).doc(targetId);

      const assignees = assignData.assignees || (Array.isArray(assignData.assignedTo) ? assignData.assignedTo.map((uid, i) => ({ uid, name: (assignData.assignedToName || '').split(', ')[i] || uid })) : [{ uid: assignData.assignedTo, name: assignData.assignedToName }]);
      const assignedToIds = assignees.map(a => a.uid);
      const assignedToName = assignees.map(a => a.name).join(', ');
      const assignedTo = assignedToIds.length === 1 ? assignedToIds[0] : assignedToIds;

      const updatePayload = {
        assignedTo: assignedTo,
        assignedToName: assignedToName,
        assignedToIds: assignedToIds,
        assignees: assignees,
        status: 'ĐÃ PHÂN CÔNG',
        updatedAt: new Date().toISOString()
      };

      if (assignData.deadline) updatePayload.deadline = assignData.deadline;
      if (assignData.priority) updatePayload.priority = assignData.priority;
      if (assignData.assignmentNote) updatePayload.assignmentNote = assignData.assignmentNote;

      await docRef.set(updatePayload, { merge: true });

      // Ghi nhật ký hoạt động
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: assignData.code || targetId,
          action: 'PHÂN CÔNG CÔNG VIỆC',
          actorName: AuthService.getCurrentUser()?.displayName || 'Quản trị viên',
          actorRole: AuthService.getCurrentUser()?.role || 'SUPER_ADMIN',
          details: `Phân công cho KTV: ${assignedToName}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}

      return { success: true };
    } catch (err) {
      console.error('[ApiService] assignTask error:', err);
      throw err;
    }
  },

  // 6.1. Hủy phân công công việc (Đưa về trạng thái Chờ phân công)
  async unassignTask(targetId, targetType = 'REPORT') {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';
      await db.collection(col).doc(targetId).set({
        assignedTo: null,
        assignedToName: null,
        status: 'CHỜ PHÂN CÔNG',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return { success: true };
    } catch (err) {
      console.error('[ApiService] unassignTask error:', err);
      throw new Error('Lỗi hủy phân công trên Firebase: ' + err.message);
    }
  },

  // 6.2. Xóa công việc hoặc phiếu phản ánh khỏi Firestore (DUY NHẤT SUPER ADMIN)
  async deleteTaskOrReport(targetId, targetType = 'REPORT') {
    if (!AuthService.canDeleteTask()) {
      throw new Error('Từ chối quyền truy cập: Chỉ Quản trị viên Super Admin mới có quyền xóa task khỏi hệ thống!');
    }
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';
      let docRef = db.collection(col).doc(targetId);
      const testSnap = await docRef.get();
      if (!testSnap.exists) {
        const byCode = await db.collection(col).where('code', '==', targetId).limit(1).get();
        if (!byCode.empty) {
          docRef = byCode.docs[0].ref;
        }
      }
      await docRef.delete();
      return { success: true };
    } catch (err) {
      console.error('[ApiService] deleteTaskOrReport error:', err);
      throw new Error('Lỗi xóa trên Firebase: ' + err.message);
    }
  },

  // 7. Kỹ thuật viên cập nhật tiến độ / Gửi nghiệm thu
  async updateTaskStatus(targetId, targetType, statusData) {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';

      let docRef = db.collection(col).doc(targetId);
      let targetDocData = null;
      const testSnap = await docRef.get();
      if (!testSnap.exists) {
        // Thử tìm theo code nếu targetId là mã phiếu
        const byCode = await db.collection(col).where('code', '==', targetId).limit(1).get();
        if (!byCode.empty) {
          docRef = byCode.docs[0].ref;
          targetDocData = byCode.docs[0].data();
        }
      } else {
        targetDocData = testSnap.data();
      }

      const updatePayload = {
        status: statusData.status,
        updatedAt: new Date().toISOString()
      };

      if (statusData.note) updatePayload.latestNote = statusData.note;
      if (statusData.beforePhotos) updatePayload.beforePhotos = statusData.beforePhotos;
      if (statusData.afterPhotos) updatePayload.afterPhotos = statusData.afterPhotos;
      if (statusData.status === 'HOÀN THÀNH') updatePayload.completedAt = new Date().toISOString();

      await docRef.set(updatePayload, { merge: true });

      // Ghi nhật ký
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: statusData.code || targetDocData?.code || targetId,
          action: statusData.status === 'CHỜ NGHIỆM THU' ? 'GỬI CHỜ NGHIỆM THU' : (statusData.status === 'ĐANG XỬ LÝ' ? 'BẮT ĐẦU XỬ LÝ' : 'CẬP NHẬT TRẠNG THÁI'),
          actorName: AuthService.getCurrentUser()?.displayName || 'Kỹ thuật viên',
          actorRole: AuthService.getCurrentUser()?.role || 'STAFF',
          details: statusData.note || `Chuyển trạng thái sang ${statusData.status}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}

      // Tự động bắn thông báo Telegram khi Kỹ thuật viên gửi CHỜ NGHIỆM THU (KÈM ẢNH HOÀN THÀNH)
      if (statusData.status === 'CHỜ NGHIỆM THU') {
        try {
          const photos = statusData.afterPhotos || targetDocData?.afterPhotos || [];
          const afterPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
          const code = statusData.code || targetDocData?.code || targetId;
          const title = targetDocData?.title || 'Bảo trì thiết bị CSVC';
          const location = targetDocData?.location || '';
          const room = targetDocData?.room ? `(${targetDocData.room})` : '';
          const staffName = AuthService.getCurrentUser()?.displayName || targetDocData?.assignedToName || 'Kỹ thuật viên';

          const teleMsg = `📋 <b>[NSG SUPPORT] BÁO CÁO HOÀN TẤT & CHỜ NGHIỆM THU!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Mã phiếu:</b> <code>${code}</code>\n` +
            `📝 <b>Nội dung:</b> ${title}\n` +
            (location ? `📍 <b>Vị trí:</b> ${location} ${room}\n` : '') +
            `👨‍🔧 <b>KTV thực hiện:</b> <b>${staffName}</b>\n` +
            `💬 <b>Ghi chú KTV:</b> <i>"${statusData.note || 'Đã xử lý xong, chuyển chờ Trưởng phòng nghiệm thu.'}"</i>\n` +
            `⏰ <b>Thời gian gửi:</b> ${new Date().toLocaleString('vi-VN')}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👉 <i>Trưởng phòng & Ban Giám Hiệu vui lòng kiểm tra và duyệt nghiệm thu.</i>`;

          this.sendTelegramNotification(teleMsg, null, null, afterPhoto, 'REVIEW');
        } catch (teleErr) {
          console.warn('Lỗi gửi Telegram khi gửi nghiệm thu:', teleErr);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('[ApiService] updateTaskStatus error:', err);
      throw err;
    }
  },

  // 8. Trưởng phòng Nghiệm thu (Duyệt hoặc Yêu cầu làm lại)
  async reviewTask(targetId, targetType, reviewData) {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';
      const status = reviewData.approved ? 'HOÀN THÀNH' : 'ĐANG XỬ LÝ';

      let docRef = db.collection(col).doc(targetId);
      let targetDocData = null;
      const testSnap = await docRef.get();
      if (!testSnap.exists) {
        const byCode = await db.collection(col).where('code', '==', targetId).limit(1).get();
        if (!byCode.empty) {
          docRef = byCode.docs[0].ref;
          targetDocData = byCode.docs[0].data();
        }
      } else {
        targetDocData = testSnap.data();
      }

      const updatePayload = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (reviewData.approved) {
        updatePayload.completedAt = new Date().toISOString();
        if (reviewData.note) updatePayload.reviewNote = reviewData.note;
      } else {
        updatePayload.rejectionReason = reviewData.rejectionReason || 'Chưa đạt yêu cầu';
      }

      await docRef.set(updatePayload, { merge: true });

      const reviewer = AuthService.getCurrentUser();
      const reviewerRole = AuthService.getRoleLabel ? AuthService.getRoleLabel(reviewer?.role) : (reviewer?.role || 'Trưởng phòng');

      // Ghi nhật ký nghiệm thu
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: reviewData.code || targetDocData?.code || targetId,
          action: reviewData.approved ? 'DUYỆT NGHIỆM THU' : 'YÊU CẦU XỬ LÝ LẠI',
          actorName: reviewer?.displayName || 'Trưởng phòng',
          actorRole: reviewer?.role || 'MANAGER',
          details: reviewData.approved ? (reviewData.note || 'Duyệt hoàn thành') : reviewData.rejectionReason,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}

      // Tự động bắn thông báo Telegram khi DUYỆT HOÀN THÀNH hoặc YÊU CẦU LÀM LẠI
      try {
        const code = reviewData.code || targetDocData?.code || targetId;
        const title = targetDocData?.title || 'Sự cố cơ sở vật chất';
        const location = targetDocData?.location || '';
        const room = targetDocData?.room ? `(${targetDocData.room})` : '';
        const staffName = targetDocData?.assignedToName || 'Kỹ thuật viên';
        const photos = targetDocData?.afterPhotos || [];
        const afterPhoto = photos.length > 0 ? photos[photos.length - 1] : null;

        if (reviewData.approved) {
          const teleMsg = `✅ <b>[NSG SUPPORT] ĐÃ DUYỆT NGHIỆM THU HOÀN THÀNH!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Mã phiếu:</b> <code>${code}</code>\n` +
            `📝 <b>Nội dung:</b> ${title}\n` +
            (location ? `📍 <b>Vị trí:</b> ${location} ${room}\n` : '') +
            `👨‍🔧 <b>KTV thực hiện:</b> ${staffName}\n` +
            `👔 <b>Người duyệt:</b> <b>${reviewer?.displayName || 'Trưởng phòng'}</b> (${reviewerRole})\n` +
            `💬 <b>Đánh giá:</b> <i>"${reviewData.note || 'Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao.'}"</i>\n` +
            `🎉 <b>Trạng thái:</b> <b>ĐÃ HOÀN THÀNH & BÀN GIAO</b>\n` +
            `⏰ <b>Thời gian duyệt:</b> ${new Date().toLocaleString('vi-VN')}`;

          this.sendTelegramNotification(teleMsg, null, null, afterPhoto, 'REVIEW');
        } else {
          const teleMsg = `⚠️ <b>[NSG SUPPORT] YÊU CẦU XỬ LÝ LẠI CÔNG VIỆC!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Mã phiếu:</b> <code>${code}</code>\n` +
            `📝 <b>Nội dung:</b> ${title}\n` +
            `👨‍🔧 <b>KTV phụ trách:</b> <b>${staffName}</b>\n` +
            `👔 <b>Người kiểm tra:</b> <b>${reviewer?.displayName || 'Trưởng phòng'}</b> (${reviewerRole})\n` +
            `❌ <b>Lý do chưa đạt:</b> <i>"${reviewData.rejectionReason || 'Chưa đạt yêu cầu kỹ thuật.'}"</i>\n` +
            `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
            `👉 <i>Kỹ thuật viên vui lòng kiểm tra lại hiện trường và khắc phục theo yêu cầu!</i>`;

          this.sendTelegramNotification(teleMsg, null, null, null, 'REVIEW');
        }
      } catch (teleErr) {
        console.warn('Lỗi gửi Telegram khi duyệt nghiệm thu:', teleErr);
      }

      return { success: true };
    } catch (err) {
      console.error('[ApiService] reviewTask error:', err);
      throw err;
    }
  },

  // 9. Gửi bình luận / Tin nhắn trực tiếp 2 chiều
  async addComment(targetId, targetType, commentData) {
    try {
      const db = this.getDb();
      const user = AuthService.getCurrentUser();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';

      const isStaffUser = user && ['STAFF', 'STAFF_IT', 'STAFF_MAINTENANCE', 'STAFF_GREEN', 'STAFF_CLEANING', 'STAFF_KTX', 'MANAGER', 'DEPUTY_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

      const fullComment = {
        targetId,
        targetCode: commentData.targetCode || commentData.code || targetId,
        targetType,
        content: commentData.content,
        authorName: commentData.authorName || user?.displayName || user?.email?.split('@')[0] || 'Người gửi',
        authorEmail: commentData.authorEmail || user?.email || '',
        authorPhone: commentData.authorPhone || '',
        authorRole: commentData.authorRole || user?.role || 'USER',
        isUrgent: !!commentData.isUrgent,
        isStaff: commentData.isStaff !== undefined ? commentData.isStaff : isStaffUser,
        createdAt: new Date().toISOString()
      };

      // 1. Lưu vào collection comments
      const ref = await db.collection('comments').add(fullComment);
      fullComment.id = ref.id;

      // 2. Append vào array comments của document chính
      try {
        let docRef = db.collection(col).doc(targetId);
        const testSnap = await docRef.get();
        if (!testSnap.exists) {
          const byCode = await db.collection(col).where('code', '==', targetId).limit(1).get();
          if (!byCode.empty) docRef = byCode.docs[0].ref;
        }

        if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
          await docRef.set({
            comments: window.firebase.firestore.FieldValue.arrayUnion(fullComment),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Cannot append to document comments array:', e);
      }

      // 3. Nếu là tin nhắn KHẨN CẤP từ người dùng, bắn ngay thông báo Telegram cho Kỹ thuật/Quản trị!
      if (fullComment.isUrgent) {
        try {
          const urgentMsg = `🚨 <b>[NSG SUPPORT] TIN NHẮN KHẨN CẤP TỪ NGƯỜI DÙNG!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Mã phiếu:</b> <code>${fullComment.targetCode}</code>\n` +
            `👤 <b>Người gửi:</b> <b>${fullComment.authorName}</b> ${fullComment.authorPhone ? `(SĐT: ${fullComment.authorPhone})` : ''}\n` +
            `💬 <b>Nội dung gấp:</b> <i>"${fullComment.content}"</i>\n` +
            `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👉 <i>Vui lòng vào hệ thống phản hồi ngay cho người dùng!</i>`;

          this.sendTelegramNotification(urgentMsg, null, null, null, 'INCIDENT');
        } catch (teleErr) {
          console.warn('Lỗi gửi Telegram tin nhắn khẩn cấp:', teleErr);
        }
      }

      // 4. Phát tín hiệu realtime broadcast cho tất cả tab / component
      try {
        if (window.RealtimeService) {
          window.RealtimeService.handleIncomingComment(fullComment, true);
        }
      } catch (rtErr) {}

      return { success: true, data: fullComment };
    } catch (err) {
      console.error('[ApiService] addComment error:', err);
      throw err;
    }
  },

  // 9.1. Lấy danh sách bình luận / Tin nhắn theo mã phiếu hoặc targetId
  async getComments(targetCodeOrId) {
    try {
      const db = this.getDb();
      const commentsMap = new Map();

      // 1. Query collection comments theo targetCode
      try {
        const snap = await db.collection('comments')
          .where('targetCode', '==', targetCodeOrId)
          .get();
        snap.forEach(doc => {
          commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      } catch (e) {}

      // 2. Query collection comments theo targetId
      try {
        const snap2 = await db.collection('comments')
          .where('targetId', '==', targetCodeOrId)
          .get();
        snap2.forEach(doc => {
          if (!commentsMap.has(doc.id)) {
            commentsMap.set(doc.id, { id: doc.id, ...doc.data() });
          }
        });
      } catch (e) {}

      // 3. Đọc từ document reports hoặc tasks
      try {
        let repDoc = await db.collection('reports').doc(targetCodeOrId).get();
        if (!repDoc.exists) {
          const byCode = await db.collection('reports').where('code', '==', targetCodeOrId).limit(1).get();
          if (!byCode.empty) repDoc = byCode.docs[0];
        }
        if (repDoc.exists && repDoc.data()?.comments) {
          repDoc.data().comments.forEach((c, idx) => {
            const key = c.id || `doc_c_${idx}_${c.createdAt}`;
            if (!commentsMap.has(key)) commentsMap.set(key, c);
          });
        }
      } catch (e) {}

      let comments = Array.from(commentsMap.values());
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return comments;
    } catch (e) {
      console.warn('Lỗi lấy comments:', e);
      return [];
    }
  },

  // 10. Lấy thống kê Dashboard trực tiếp từ Cloud Firestore
  async getDashboardStats() {
    try {
      const db = this.getDb();
      const reportsSnap = await db.collection('reports').get();
      const tasksSnap = await db.collection('tasks').get();

      const all = [];
      reportsSnap.forEach(d => all.push({ id: d.id, ...d.data() }));
      tasksSnap.forEach(d => all.push({ id: d.id, ...d.data() }));

      const total = all.length;
      const pending = all.filter(x => x.status === 'CHỜ PHÂN CÔNG' || x.status === 'MỚI').length;
      const processing = all.filter(x => x.status === 'ĐANG XỬ LÝ' || x.status === 'ĐÃ PHÂN CÔNG').length;
      const review = all.filter(x => x.status === 'CHỜ NGHIỆM THU').length;
      const completed = all.filter(x => x.status === 'HOÀN THÀNH').length;
      const overdue = all.filter(x => x.isOverdue).length;

      return {
        success: true,
        data: {
          total,
          pending,
          processing,
          review,
          completed,
          overdue
        }
      };
    } catch (err) {
      console.error('[ApiService] getDashboardStats error:', err);
      return { success: true, data: { total: 0, pending: 0, processing: 0, review: 0, completed: 0, overdue: 0 } };
    }
  },

  // ========================================================
  // 11. TÍCH HỢP TELEGRAM BOT API THỜI GIAN THỰC
  // ========================================================
  getTelegramConfig() {
    try {
      const saved = localStorage.getItem('nsg_telegram_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      botToken: '', // Bot 1: Báo sự cố mới
      chatId: '',
      reviewBotToken: '', // Bot 2: Nghiệm thu công việc (nếu để trống tự dùng Bot 1)
      reviewChatId: '',
      isEnabled: true,
      notifyOnNewReport: true,
      notifyOnUrgent: true,
      notifyOnAssign: true,
      notifyOnReview: true,
      notifyOnComplete: true
    };
  },

  async loadTelegramConfig() {
    try {
      const db = this.getDb();
      const doc = await db.collection('system_settings').doc('telegram').get();
      if (doc.exists) {
        const data = doc.data();
        localStorage.setItem('nsg_telegram_config', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('[ApiService] Không thể tải Telegram config từ Firestore:', e);
    }
    return this.getTelegramConfig();
  },

  async saveTelegramConfig(config) {
    localStorage.setItem('nsg_telegram_config', JSON.stringify(config));
    if (window.firebase && window.firebase.firestore) {
      try {
        await window.firebase.firestore().collection('system_settings').doc('telegram').set(config, { merge: true });
        console.log('[ApiService] Đã đồng bộ Telegram config lên Firestore');
      } catch (err) {
        console.warn('Lỗi lưu Telegram config lên Firestore:', err);
      }
    }
  },

  async sendTelegramNotification(messageHtml, customToken = null, customChatId = null, photoData = null, channel = 'INCIDENT') {
    let config = this.getTelegramConfig();
    
    // Nếu chưa có config trong localStorage, tự động tải trực tiếp từ Cloud Firestore
    if (!customToken && ((!config.botToken && !config.reviewBotToken) || (!config.chatId && !config.reviewChatId))) {
      try {
        config = await this.loadTelegramConfig();
      } catch (e) {}
    }

    // Phân loại Token và ChatId theo kênh (INCIDENT: Báo sự cố mới | REVIEW: Nghiệm thu hoàn tất)
    let token = '';
    let chatId = '';

    if (customToken) {
      token = customToken.trim();
      chatId = (customChatId || '').trim();
    } else if (channel === 'REVIEW') {
      token = (config.reviewBotToken || config.botToken || '').trim();
      chatId = (config.reviewChatId || config.chatId || '').trim();
    } else {
      token = (config.botToken || '').trim();
      chatId = (config.chatId || '').trim();
    }

    if (config.isEnabled === false && !customToken) {
      return { success: false, error: 'Thông báo Telegram đang tắt.' };
    }

    // 1. Thử gửi qua Backend Server Relay nếu có
    try {
      const backendRes = await fetch(`${window.APP_CONFIG.apiBaseUrl}/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageHtml,
          chatId: chatId || undefined,
          token: token || undefined,
          photo: photoData || undefined,
          channel: channel
        })
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData.success) {
          console.log('[Telegram] Gửi thành công qua Secure Backend Relay');
          return { success: true, data: backendData.result };
        }
      }
    } catch (backendErr) {
      // Backend offline, fallback sang chế độ gọi trực tiếp
    }

    // 2. Chế độ Gửi Trực tiếp từ Client (Chỉ khi có token và chatId)
    if (!token || !chatId) {
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID.' };
    }

    // 2.1. Nếu có hình ảnh đính kèm, gửi bằng sendPhoto kèm caption
    if (photoData) {
      try {
        if (typeof photoData === 'string' && photoData.startsWith('data:image')) {
          const blob = Utils.dataURLtoBlob(photoData);
          if (blob) {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', blob, 'incident.jpg');
            formData.append('caption', messageHtml.substring(0, 1000));
            formData.append('parse_mode', 'HTML');

            const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            if (data.ok) {
              return { success: true, data: data.result };
            }
          }
        } else if (typeof photoData === 'string' && (photoData.startsWith('http://') || photoData.startsWith('https://'))) {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: photoData,
              caption: messageHtml.substring(0, 1000),
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          if (data.ok) {
            return { success: true, data: data.result };
          }
        }
      } catch (photoErr) {
        console.warn('[Telegram] Gửi photo thất bại, chuyển sang gửi text:', photoErr);
      }
    }

    // 2.2. Gửi tin nhắn Text chuẩn (sendMessage)
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        let errorMsg = data.description || 'Lỗi gửi tin nhắn Telegram';
        if (errorMsg.includes('chat not found')) {
          errorMsg = 'Không tìm thấy Chat ID này. Bạn hãy nhắn tin /start cho Bot trước hoặc kiểm tra lại Chat ID!';
        } else if (errorMsg.includes('Unauthorized') || errorMsg.includes('token')) {
          errorMsg = 'Bot Token không hợp lệ. Vui lòng kiểm tra lại Token từ @BotFather!';
        }
        return { success: false, error: errorMsg };
      }

      return { success: true, data: data.result };
    } catch (err) {
      return { success: false, error: 'Lỗi kết nối Telegram: ' + err.message };
    }
  },

  async testTelegram(customToken = null, customChatId = null) {
    const now = new Date().toLocaleString('vi-VN');
    const msg = `📢 <b>[NSG SUPPORT] THỬ NGHIỆM KẾT NỐI BOT BÁO SỰ CỐ MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ <b>Trạng thái:</b> Kết nối thành công 100%!\n` +
      `🏢 <b>Hệ thống:</b> NSG Support - Tiếp nhận sự cố & CSVC\n` +
      `⏰ <b>Thời gian test:</b> ${now}\n` +
      `📌 <b>Ghi chú:</b> Bot nhận thông báo sự cố mới từ Cán bộ, Giảng viên và Sinh viên.`;

    return await this.sendTelegramNotification(msg, customToken, customChatId, null, 'INCIDENT');
  },

  async testReviewTelegram(customToken = null, customChatId = null) {
    const now = new Date().toLocaleString('vi-VN');
    const msg = `📋 <b>[NSG SUPPORT] THỬ NGHIỆM KẾT NỐI BOT NGHIỆM THU CÔNG VIỆC</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ <b>Trạng thái:</b> Kết nối thành công 100%!\n` +
      `👨‍🔧 <b>Chức năng:</b> Tiếp nhận báo cáo hoàn tất xử lý & Hình ảnh thực tế từ Kỹ thuật viên\n` +
      `⏰ <b>Thời gian test:</b> ${now}\n` +
      `👉 <i>Trưởng phòng và Ban Giám Hiệu sẽ theo dõi chất lượng nghiệm thu tại đây.</i>`;

    return await this.sendTelegramNotification(msg, customToken, customChatId, null, 'REVIEW');
  },

  // ========================================================
  // 12. QUẢN LÝ DANH SÁCH PHÒNG / KHOA / BỘ PHẬN ĐỘNG
  // ========================================================
  async loadDepartments() {
    try {
      const db = this.getDb();
      const doc = await db.collection('system_settings').doc('departments').get();
      if (doc.exists && doc.data()?.list && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
        window.APP_CONFIG.DEPARTMENTS = doc.data().list;
        return doc.data().list;
      }
    } catch (e) {
      console.warn('[ApiService] Không thể tải departments từ Firestore:', e);
    }
    return window.APP_CONFIG.DEPARTMENTS;
  },

  async saveDepartments(deptList) {
    if (!Array.isArray(deptList)) return;
    window.APP_CONFIG.DEPARTMENTS = deptList;
    try {
      const db = this.getDb();
      await db.collection('system_settings').doc('departments').set({
        list: deptList,
        updatedAt: new Date().toISOString(),
        updatedBy: AuthService.getCurrentUser()?.displayName || 'Super Admin'
      }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Lỗi lưu departments:', err);
      throw new Error('Lỗi lưu danh sách phòng ban lên Firebase: ' + err.message);
    }
  },

  async addDepartment(deptName) {
    const clean = deptName.trim();
    if (!clean) throw new Error('Tên phòng/khoa không được để trống.');
    const list = await this.loadDepartments();
    if (list.includes(clean)) throw new Error(`Phòng/Khoa "${clean}" đã tồn tại trong danh sách.`);
    const newList = [...list, clean];
    await this.saveDepartments(newList);
    return newList;
  },

  async updateDepartment(oldName, newName) {
    const clean = newName.trim();
    if (!clean) throw new Error('Tên mới không được để trống.');
    const list = await this.loadDepartments();
    const idx = list.indexOf(oldName);
    if (idx === -1) throw new Error(`Không tìm thấy "${oldName}".`);
    list[idx] = clean;
    await this.saveDepartments(list);
    return list;
  },

  async deleteDepartment(deptName) {
    const list = await this.loadDepartments();
    if (list.length <= 1) throw new Error('Hệ thống phải có ít nhất 1 phòng/khoa.');
    const newList = list.filter(d => d !== deptName);
    await this.saveDepartments(newList);
    return newList;
  },

  // ========================================================
  // 13. QUẢN LÝ ĐỊA ĐIỂM PHÂN CẤP 3 TẦNG (CƠ SỞ -> KHU VỰC -> PHÒNG)
  // ========================================================
  async loadCampuses() {
    try {
      const db = this.getDb();
      const doc = await db.collection('system_settings').doc('locations').get();
      if (doc.exists && doc.data()?.list && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
        window.APP_CONFIG.CAMPUSES = doc.data().list;
        return doc.data().list;
      }
    } catch (e) {
      console.warn('[ApiService] Không thể tải locations từ Firestore:', e);
    }
    return window.APP_CONFIG.CAMPUSES;
  },

  async saveCampuses(campusesList) {
    if (!Array.isArray(campusesList)) return;
    window.APP_CONFIG.CAMPUSES = campusesList;
    try {
      const db = this.getDb();
      await db.collection('system_settings').doc('locations').set({
        list: campusesList,
        updatedAt: new Date().toISOString(),
        updatedBy: AuthService.getCurrentUser()?.displayName || 'Super Admin'
      }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Lỗi lưu locations:', err);
      throw new Error('Lỗi lưu danh sách địa điểm lên Firebase: ' + err.message);
    }
  },

  // ========================================================
  // 14. QUẢN LÝ DANH MỤC PHẢN ÁNH & LOẠI THIẾT BỊ
  // ========================================================
  async loadCategories() {
    try {
      const db = this.getDb();
      const doc = await db.collection('system_settings').doc('categories').get();
      if (doc.exists && doc.data()?.list && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
        window.APP_CONFIG.CATEGORIES = doc.data().list;
        return doc.data().list;
      }
    } catch (e) {
      console.warn('[ApiService] Không thể tải categories từ Firestore:', e);
    }
    return window.APP_CONFIG.CATEGORIES;
  },

  async saveCategories(catList) {
    if (!Array.isArray(catList)) return;
    window.APP_CONFIG.CATEGORIES = catList;
    try {
      const db = this.getDb();
      await db.collection('system_settings').doc('categories').set({
        list: catList,
        updatedAt: new Date().toISOString(),
        updatedBy: AuthService.getCurrentUser()?.displayName || 'Super Admin'
      }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Lỗi lưu categories:', err);
      throw new Error('Lỗi lưu danh sách loại thiết bị lên Firebase: ' + err.message);
    }
  }
};

window.ApiService = ApiService;
