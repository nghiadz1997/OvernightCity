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

      const currentUser = AuthService.getCurrentUser();
      const fullData = {
        ...taskData,
        code,
        type: 'TASK',
        status: (taskData.assignedTo && (Array.isArray(taskData.assignedTo) ? taskData.assignedTo.length > 0 : true)) ? 'ĐÃ PHÂN CÔNG' : 'CHỜ PHÂN CÔNG',
        assignedBy: taskData.assignedBy || currentUser?.uid || null,
        assignedByName: taskData.assignedByName || currentUser?.displayName || 'Trưởng phòng CSVC',
        assignedByRole: taskData.assignedByRole || currentUser?.role || 'MANAGER',
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

  // 6. Phân công công việc (Hỗ trợ: Giao Phó phòng điều phối, Giao thẳng Kỹ thuật viên, hoặc Nhóm KTV)
  async assignTask(targetId, targetType, assignData) {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';
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

      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const updatePayload = {
        status: 'ĐÃ PHÂN CÔNG',
        updatedAt: nowIso
      };

      // 1. Người quản lý / điều phối (Phó phòng / Trưởng phòng)
      if (assignData.managerId !== undefined) {
        updatePayload.assignedManagerId = assignData.managerId || null;
        updatePayload.assignedManagerName = assignData.managerName || null;
        updatePayload.assignedManagerRole = assignData.managerRole || 'DEPUTY_MANAGER';
        // Tương thích ngược
        updatePayload.deputyId = assignData.managerId || null;
        updatePayload.deputyName = assignData.managerName || null;
      }

      // 2. Kỹ thuật viên thực hiện
      if (assignData.technicianId !== undefined || assignData.assignedTo !== undefined) {
        const rawAssigned = assignData.technicianId || assignData.assignedTo;
        const rawAssignedName = assignData.technicianName || assignData.assignedToName;
        const assignees = assignData.assignees || (Array.isArray(rawAssigned) ? rawAssigned.map((uid, i) => ({ uid, name: (rawAssignedName || '').split(', ')[i] || uid })) : (rawAssigned ? [{ uid: rawAssigned, name: rawAssignedName }] : []));
        const assignedToIds = assignees.map(a => a.uid);
        const assignedToName = assignees.map(a => a.name).join(', ');
        const assignedTo = assignedToIds.length === 1 ? assignedToIds[0] : (assignedToIds.length > 1 ? assignedToIds : null);

        updatePayload.assignedTo = assignedTo;
        updatePayload.assignedToName = assignedToName || null;
        updatePayload.assignedToIds = assignedToIds;
        updatePayload.assignees = assignees;
        updatePayload.assignedToRole = assignData.technicianRole || 'STAFF';
      }

      // 3. Người nghiệm thu
      if (assignData.reviewerId !== undefined || assignData.assignedReviewerId !== undefined) {
        updatePayload.assignedReviewerId = assignData.reviewerId || assignData.assignedReviewerId || null;
        updatePayload.assignedReviewerName = assignData.reviewerName || assignData.assignedReviewerName || null;
      }

      // 4. Hạn xử lý & ghi chú
      if (assignData.deadline) updatePayload.deadline = assignData.deadline;
      if (assignData.priority) updatePayload.priority = assignData.priority;
      if (assignData.assignmentNote) updatePayload.assignmentNote = assignData.assignmentNote;
      if (!targetDocData?.assignedBy && currentUser) {
        updatePayload.assignedBy = currentUser.uid;
        updatePayload.assignedByName = currentUser.displayName;
        updatePayload.assignedByRole = currentUser.role;
      }

      // 5. Xác định chi tiết hành động cho Timeline
      let logDetail = assignData.logDetails;
      if (!logDetail) {
        if (updatePayload.assignedToName && updatePayload.assignedToName.includes(',')) {
          logDetail = `Phân công cho nhóm KTV: ${updatePayload.assignedToName}${updatePayload.assignedManagerName ? ` (Do ${updatePayload.assignedManagerName} điều phối)` : ''}`;
        } else if (updatePayload.assignedToName && updatePayload.assignedManagerName) {
          logDetail = `Chỉ định KTV ${updatePayload.assignedToName} (Do ${updatePayload.assignedManagerName} điều phối)`;
        } else if (updatePayload.assignedToName) {
          logDetail = `Phân công cho KTV: ${updatePayload.assignedToName}`;
        } else if (updatePayload.assignedManagerName) {
          logDetail = `Giao cho Phó phòng: ${updatePayload.assignedManagerName} điều phối`;
        } else {
          logDetail = 'Cập nhật phân công';
        }
      }

      const historyEntry = {
        timestamp: nowIso,
        actorId: currentUser?.uid || '',
        actorName: currentUser?.displayName || 'Người quản lý',
        actorRole: currentUser?.role || 'MANAGER',
        action: 'PHÂN CÔNG CÔNG VIỆC',
        details: logDetail,
        note: assignData.assignmentNote || ''
      };

      if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
        updatePayload.history = window.firebase.firestore.FieldValue.arrayUnion(historyEntry);
      }

      await docRef.set(updatePayload, { merge: true });

      // 6. Ghi nhật ký vào collection activity_logs
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: assignData.code || targetDocData?.code || targetId,
          action: 'PHÂN CÔNG CÔNG VIỆC',
          actorName: currentUser?.displayName || 'Người quản lý',
          actorRole: currentUser?.role || 'MANAGER',
          details: logDetail,
          note: assignData.assignmentNote || '',
          timestamp: nowIso
        });
      } catch (e) {}

      return { success: true, data: updatePayload };
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
      let docRef = db.collection(col).doc(targetId);
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const historyEntry = {
        timestamp: nowIso,
        actorId: currentUser?.uid || '',
        actorName: currentUser?.displayName || 'Người quản lý',
        actorRole: currentUser?.role || 'MANAGER',
        action: 'HỦY PHÂN CÔNG',
        details: 'Hủy phân công và đưa về danh sách Chờ phân công'
      };

      const updatePayload = {
        assignedTo: null,
        assignedToName: null,
        assignedToIds: [],
        assignees: [],
        status: 'CHỜ PHÂN CÔNG',
        updatedAt: nowIso
      };

      if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
        updatePayload.history = window.firebase.firestore.FieldValue.arrayUnion(historyEntry);
      }

      await docRef.set(updatePayload, { merge: true });
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

  // 7. Kỹ thuật viên cập nhật tiến độ / Nhận việc / Gửi nghiệm thu
  async updateTaskStatus(targetId, targetType, statusData) {
    try {
      const db = this.getDb();
      const col = targetType === 'TASK' ? 'tasks' : 'reports';

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

      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const updatePayload = {
        status: statusData.status,
        updatedAt: nowIso
      };

      if (statusData.status === 'ĐANG XỬ LÝ' && !targetDocData?.acceptedAt) {
        updatePayload.acceptedAt = nowIso;
      }
      if (statusData.status === 'CHỜ NGHIỆM THU') {
        updatePayload.submittedForReviewAt = nowIso;
      }
      if (statusData.status === 'HOÀN THÀNH') {
        updatePayload.completedAt = nowIso;
      }

      if (statusData.note) updatePayload.latestNote = statusData.note;
      if (statusData.beforePhotos) updatePayload.beforePhotos = statusData.beforePhotos;
      if (statusData.afterPhotos) updatePayload.afterPhotos = statusData.afterPhotos;
      if (statusData.materialsUsed) updatePayload.materialsUsed = statusData.materialsUsed;

      // Xác định action và details cho Timeline
      let actionName = 'CẬP NHẬT TRẠNG THÁI';
      let actionDetails = statusData.note || `Chuyển trạng thái sang ${statusData.status}`;

      if (statusData.status === 'ĐANG XỬ LÝ') {
        actionName = 'NHẬN VIỆC & BẮT ĐẦU XỬ LÝ';
        actionDetails = statusData.note || 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường';
      } else if (statusData.status === 'CHỜ NGHIỆM THU') {
        actionName = 'BÁO HOÀN TẤT & GỬI NGHIỆM THU';
        actionDetails = statusData.note || 'Đã hoàn thành công việc tại hiện trường, gửi yêu cầu nghiệm thu';
      }

      const historyEntry = {
        timestamp: nowIso,
        actorId: currentUser?.uid || '',
        actorName: currentUser?.displayName || 'Kỹ thuật viên',
        actorRole: currentUser?.role || 'STAFF',
        action: actionName,
        details: actionDetails,
        note: statusData.note || '',
        materialsUsed: statusData.materialsUsed || ''
      };

      if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
        updatePayload.history = window.firebase.firestore.FieldValue.arrayUnion(historyEntry);
      }

      await docRef.set(updatePayload, { merge: true });

      // Ghi nhật ký vào collection activity_logs
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: statusData.code || targetDocData?.code || targetId,
          action: actionName,
          actorName: currentUser?.displayName || 'Kỹ thuật viên',
          actorRole: currentUser?.role || 'STAFF',
          details: actionDetails,
          timestamp: nowIso
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
          const staffName = currentUser?.displayName || targetDocData?.assignedToName || 'Kỹ thuật viên';

          const teleMsg = `📋 <b>[NSG SUPPORT] BÁO CÁO HOÀN TẤT & CHỜ NGHIỆM THU!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Mã phiếu:</b> <code>${code}</code>\n` +
            `📝 <b>Nội dung:</b> ${title}\n` +
            (location ? `📍 <b>Vị trí:</b> ${location} ${room}\n` : '') +
            `👨‍🔧 <b>KTV thực hiện:</b> <b>${staffName}</b>\n` +
            `💬 <b>Ghi chú KTV:</b> <i>"${statusData.note || 'Đã xử lý xong, chuyển chờ Trưởng phòng nghiệm thu.'}"</i>\n` +
            (statusData.materialsUsed ? `🔧 <b>Vật tư sử dụng:</b> ${statusData.materialsUsed}\n` : '') +
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

  // 8. Trưởng phòng / Phó phòng Nghiệm thu (Duyệt ĐẠT hoặc Yêu cầu làm lại)
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

      const currentUser = AuthService.getCurrentUser();
      const reviewerRole = AuthService.getRoleLabel ? AuthService.getRoleLabel(currentUser?.role) : (currentUser?.role || 'Trưởng phòng');
      const nowIso = new Date().toISOString();

      const updatePayload = {
        status,
        updatedAt: nowIso
      };

      if (reviewData.approved) {
        updatePayload.completedAt = nowIso;
        updatePayload.reviewNote = reviewData.note || 'Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao.';
        updatePayload.reviewedAt = nowIso;
        updatePayload.reviewedBy = currentUser?.uid || '';
        updatePayload.reviewedByName = currentUser?.displayName || 'Trưởng phòng';
        updatePayload.rejectionReason = null;
      } else {
        updatePayload.rejectionReason = reviewData.rejectionReason || 'Chưa đạt yêu cầu kỹ thuật';
        updatePayload.rejectedAt = nowIso;
        updatePayload.rejectedBy = currentUser?.uid || '';
        updatePayload.rejectedByName = currentUser?.displayName || 'Trưởng phòng';
      }

      const historyEntry = {
        timestamp: nowIso,
        actorId: currentUser?.uid || '',
        actorName: currentUser?.displayName || 'Trưởng phòng',
        actorRole: currentUser?.role || 'MANAGER',
        action: reviewData.approved ? 'DUYỆT NGHIỆM THU (ĐẠT)' : 'YÊU CẦU XỬ LÝ LẠI (CHƯA ĐẠT)',
        details: reviewData.approved ? (reviewData.note || 'Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao') : `Yêu cầu làm lại: ${reviewData.rejectionReason}`,
        note: reviewData.approved ? (reviewData.note || '') : (reviewData.rejectionReason || '')
      };

      if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
        updatePayload.history = window.firebase.firestore.FieldValue.arrayUnion(historyEntry);
      }

      await docRef.set(updatePayload, { merge: true });

      // Ghi nhật ký vào collection activity_logs
      try {
        await db.collection('activity_logs').add({
          targetId,
          targetCode: reviewData.code || targetDocData?.code || targetId,
          action: reviewData.approved ? 'DUYỆT NGHIỆM THU' : 'YÊU CẦU XỬ LÝ LẠI',
          actorName: currentUser?.displayName || 'Trưởng phòng',
          actorRole: currentUser?.role || 'MANAGER',
          details: historyEntry.details,
          timestamp: nowIso
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
            `👔 <b>Người duyệt:</b> <b>${currentUser?.displayName || 'Trưởng phòng'}</b> (${reviewerRole})\n` +
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
            `👔 <b>Người kiểm tra:</b> <b>${currentUser?.displayName || 'Trưởng phòng'}</b> (${reviewerRole})\n` +
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
  },

  // ========================================================
  // 15. MODULE QUẢN LÝ NHÂN SỰ (EMPLOYEES)
  // ========================================================
  async loadEmployees() {
    try {
      const db = this.getDb();
      const snap = await db.collection('employees').get();
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });

      return list.sort((a, b) => (a.employeeCode || '').localeCompare(b.employeeCode || ''));
    } catch (e) {
      console.error('[ApiService] Lỗi tải danh sách nhân sự:', e);
      return [];
    }
  },

  async createEmployee(empData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const currentYear = new Date().getFullYear();

      const docData = {
        employeeCode: empData.employeeCode || `NSG-NV${Math.floor(100 + Math.random() * 900)}`,
        fullName: empData.fullName || '',
        dateOfBirth: empData.dateOfBirth || '',
        citizenId: empData.citizenId || '',
        position: empData.position || 'Chuyên Viên Bảo Trì',
        qualification: empData.qualification || '',
        phone: empData.phone || '',
        email: empData.email || '',
        departmentName: empData.departmentName || 'Phòng Quản trị Thiết bị và Cơ sở vật chất',
        status: empData.status || 'ACTIVE',
        userId: empData.userId || null,
        notes: empData.notes || '',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Làm sạch các giá trị undefined để tránh lỗi Firestore
      Object.keys(docData).forEach(key => {
        if (docData[key] === undefined) {
          docData[key] = '';
        }
      });

      const docRef = await db.collection('employees').add(docData);
      docData.id = docRef.id;

      // Khởi tạo ngay bản ghi ngày phép năm hiện tại
      const initialAnnualLeave = Number(empData.annualLeave) || 12;
      const initialCarryForward = Number(empData.carryForward) || 0;
      const balanceId = `${docRef.id}_${currentYear}`;

      await db.collection('leave_balances').doc(balanceId).set({
        id: balanceId,
        employeeId: docRef.id,
        employeeName: docData.fullName,
        year: currentYear,
        annualLeave: initialAnnualLeave,
        carryForward: initialCarryForward,
        usedLeave: 0,
        remainingLeave: initialAnnualLeave + initialCarryForward,
        negativeLeave: (initialAnnualLeave + initialCarryForward) < 0 ? Math.abs(initialAnnualLeave + initialCarryForward) : 0,
        notes: `Khởi tạo nhân sự năm ${currentYear}`,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      // Ghi audit log
      await db.collection('leave_audit_logs').add({
        employeeId: docRef.id,
        employeeName: docData.fullName,
        year: currentYear,
        action: 'TẠO NHÂN SỰ MỚI',
        oldValue: null,
        newValue: docData,
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Thêm nhân sự mới ${docData.fullName} (${docData.employeeCode})`
      });

      return { success: true, data: docData };
    } catch (e) {
      console.error('[ApiService] Lỗi tạo nhân sự:', e);
      throw new Error('Lỗi khi tạo nhân sự: ' + e.message);
    }
  },

  async updateEmployee(empId, empData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const currentYear = new Date().getFullYear();

      const updatePayload = {
        fullName: empData.fullName || '',
        dateOfBirth: empData.dateOfBirth || '',
        citizenId: empData.citizenId || '',
        position: empData.position || 'Nhân viên',
        qualification: empData.qualification || '',
        phone: empData.phone || '',
        email: empData.email || '',
        departmentName: empData.departmentName || 'Phòng Quản trị Thiết bị và Cơ sở vật chất',
        status: empData.status || 'ACTIVE',
        notes: empData.notes || '',
        updatedAt: nowIso
      };

      if (empData.employeeCode) updatePayload.employeeCode = empData.employeeCode;
      if (empData.userId) updatePayload.userId = empData.userId;

      // Loại bỏ hoàn toàn bất kỳ trường undefined nào
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          updatePayload[key] = '';
        }
      });

      await db.collection('employees').doc(empId).set(updatePayload, { merge: true });

      // Nếu có cập nhật tên, đồng bộ sang leave_balances
      if (empData.fullName) {
        const balancesSnap = await db.collection('leave_balances').where('employeeId', '==', empId).get();
        const batch = db.batch();
        balancesSnap.forEach(d => {
          batch.update(d.ref, { employeeName: empData.fullName });
        });
        await batch.commit();
      }

      // Ghi audit log
      await db.collection('leave_audit_logs').add({
        employeeId: empId,
        employeeName: empData.fullName || '',
        year: currentYear,
        action: 'CẬP NHẬT THÔNG TIN NHÂN SỰ',
        oldValue: null,
        newValue: updatePayload,
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Cập nhật thông tin nhân sự ${empData.fullName || ''}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi cập nhật nhân sự:', e);
      throw new Error('Lỗi cập nhật nhân sự: ' + e.message);
    }
  },

  async deleteEmployee(empId, hardDelete = false) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      if (hardDelete) {
        // XÓA VĨNH VIỄN KHỎI HỆ THỐNG
        await db.collection('employees').doc(empId).delete();

        // Xóa sạch các kỳ ngày phép liên quan
        const balancesSnap = await db.collection('leave_balances').where('employeeId', '==', empId).get();
        if (!balancesSnap.empty) {
          const batch = db.batch();
          balancesSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } else {
        // Soft delete (Ngưng hoạt động)
        await db.collection('employees').doc(empId).update({
          status: 'INACTIVE',
          updatedAt: nowIso
        });
      }

      await db.collection('leave_audit_logs').add({
        employeeId: empId,
        year: new Date().getFullYear(),
        action: hardDelete ? 'XÓA NHÂN SỰ VĨNH VIỄN' : 'NGƯNG HOẠT ĐỘNG NHÂN SỰ',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Thao tác xóa/ngưng nhân sự ID: ${empId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi xóa nhân sự:', e);
      throw new Error('Lỗi xóa nhân sự: ' + e.message);
    }
  },

  async reactivateEmployee(empId) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      await db.collection('employees').doc(empId).update({
        status: 'ACTIVE',
        updatedAt: nowIso
      });

      await db.collection('leave_audit_logs').add({
        employeeId: empId,
        year: new Date().getFullYear(),
        action: 'KÍCH HOẠT LẠI NHÂN SỰ',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Kích hoạt lại trạng thái làm việc cho nhân sự ID: ${empId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi kích hoạt lại nhân sự:', e);
      throw new Error('Lỗi kích hoạt lại nhân sự: ' + e.message);
    }
  },

  async purgeAllInactiveEmployees() {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const snap = await db.collection('employees').where('status', '==', 'INACTIVE').get();
      if (snap.empty) return { count: 0 };

      const batch = db.batch();
      const empIds = [];
      snap.forEach(doc => {
        empIds.push(doc.id);
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Xóa các leave_balances của các nhân sự này
      for (const id of empIds) {
        const balSnap = await db.collection('leave_balances').where('employeeId', '==', id).get();
        if (!balSnap.empty) {
          const balBatch = db.batch();
          balSnap.forEach(d => balBatch.delete(d.ref));
          await balBatch.commit();
        }
      }

      await db.collection('leave_audit_logs').add({
        year: new Date().getFullYear(),
        action: 'XÓA SẠCH DANH SÁCH NGƯNG HOẠT ĐỘNG',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Super Admin',
        performedAt: nowIso,
        note: `Xóa vĩnh viễn ${empIds.length} nhân sự đã ngưng hoạt động`
      });

      return { count: empIds.length };
    } catch (e) {
      console.error('[ApiService] Lỗi xóa sạch nhân sự ngưng hoạt động:', e);
      throw new Error('Lỗi xóa sạch danh sách ngưng: ' + e.message);
    }
  },

  // ========================================================
  // 16. HỆ THỐNG QUẢN LÝ NGÀY PHÉP (LEAVE MANAGEMENT)
  // ========================================================
  async loadLeavePolicy() {
    try {
      const db = this.getDb();
      const doc = await db.collection('system_settings').doc('leave_policy').get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) {}

    return {
      defaultAnnualLeave: 12,
      allowNegativeLeave: true,
      allowCarryForwardPositive: false,
      maxCarryForwardPositiveDays: 3,
      excludeWeekends: true,
      warningThresholdDays: 3
    };
  },

  async saveLeavePolicy(policyData) {
    try {
      const db = this.getDb();
      await db.collection('system_settings').doc('leave_policy').set({
        ...policyData,
        updatedAt: new Date().toISOString(),
        updatedBy: AuthService.getCurrentUser()?.displayName || 'Trưởng phòng'
      }, { merge: true });
      return { success: true };
    } catch (e) {
      throw new Error('Lỗi lưu cấu hình chính sách ngày phép: ' + e.message);
    }
  },

  calculateLeaveDays(startDate, endDate, excludeWeekends = true) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (!excludeWeekends || (day !== 0 && day !== 6)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  },

  async getOrCreateLeaveBalance(empId, empName, year) {
    try {
      const db = this.getDb();
      const balanceId = `${empId}_${year}`;
      const doc = await db.collection('leave_balances').doc(balanceId).get();

      if (doc.exists) {
        return doc.data();
      }

      const policy = await this.loadLeavePolicy();
      const defaultLeave = Number(policy.defaultAnnualLeave) || 12;
      let carryForward = 0;

      // Kiểm tra số dư năm trước (year - 1)
      const prevBalanceId = `${empId}_${year - 1}`;
      const prevDoc = await db.collection('leave_balances').doc(prevBalanceId).get();

      if (prevDoc.exists) {
        const prevData = prevDoc.data();
        const prevRemaining = Number(prevData.remainingLeave) || 0;
        
        // NGUYÊN TẮC: Phép âm năm trước TỰ ĐỘNG chuyển sang năm sau
        if (prevRemaining < 0) {
          carryForward = prevRemaining; // e.g. -2
        } else if (prevRemaining > 0 && policy.allowCarryForwardPositive) {
          const maxPositive = Number(policy.maxCarryForwardPositiveDays) || 3;
          carryForward = Math.min(prevRemaining, maxPositive);
        }
      }

      const remainingLeave = defaultLeave + carryForward;
      const negativeLeave = remainingLeave < 0 ? Math.abs(remainingLeave) : 0;
      const nowIso = new Date().toISOString();

      const newBalance = {
        id: balanceId,
        employeeId: empId,
        employeeName: empName || 'Nhân viên',
        year: Number(year),
        annualLeave: defaultLeave,
        carryForward: carryForward,
        usedLeave: 0,
        remainingLeave: remainingLeave,
        negativeLeave: negativeLeave,
        notes: `Tự động tạo kỳ phép năm ${year}`,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await db.collection('leave_balances').doc(balanceId).set(newBalance);
      return newBalance;
    } catch (e) {
      console.error('[ApiService] Lỗi getOrCreateLeaveBalance:', e);
      return null;
    }
  },

  async loadLeaveBalances(year) {
    try {
      const db = this.getDb();
      const snap = await db.collection('leave_balances').where('year', '==', Number(year)).get();
      const list = [];
      snap.forEach(d => list.push(d.data()));
      return list;
    } catch (e) {
      console.error('[ApiService] Lỗi tải leave_balances:', e);
      return [];
    }
  },

  async loadLeaveRequests(year = null, employeeId = null) {
    try {
      const db = this.getDb();
      let query = db.collection('leave_requests');
      if (year) {
        query = query.where('year', '==', Number(year));
      }
      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      const snap = await query.get();
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (e) {
      console.error('[ApiService] Lỗi tải leave_requests:', e);
      return [];
    }
  },

  async submitLeaveRequest(reqData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const policy = await this.loadLeavePolicy();

      const leaveDays = reqData.leaveDays || this.calculateLeaveDays(reqData.startDate, reqData.endDate, policy.excludeWeekends);
      const reqYear = new Date(reqData.startDate).getFullYear();
      const code = `NP-${reqYear}-${Math.floor(10000 + Math.random() * 90000)}`;

      const newReq = {
        requestCode: code,
        employeeId: reqData.employeeId,
        employeeName: reqData.employeeName,
        startDate: reqData.startDate,
        endDate: reqData.endDate,
        leaveDays: Number(leaveDays),
        leaveType: reqData.leaveType || 'ANNUAL',
        reason: reqData.reason || '',
        status: reqData.status || 'PENDING', // PENDING, APPROVED, REJECTED, CANCELLED
        year: reqYear,
        notes: reqData.notes || '',
        approvedBy: reqData.approvedBy || null,
        approvedByName: reqData.approvedByName || null,
        approvedAt: reqData.approvedAt || null,
        rejectionReason: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Đảm bảo hồ sơ phép năm đó đã tồn tại
      await this.getOrCreateLeaveBalance(reqData.employeeId, reqData.employeeName, reqYear);

      const docRef = await db.collection('leave_requests').add(newReq);
      newReq.id = docRef.id;

      // Nếu được duyệt ngay lúc tạo
      if (newReq.status === 'APPROVED') {
        await this.recalculateEmployeeLeave(reqData.employeeId, reqYear);
      }

      // Ghi audit log
      await db.collection('leave_audit_logs').add({
        employeeId: reqData.employeeId,
        employeeName: reqData.employeeName,
        year: reqYear,
        action: 'ĐĂNG KÝ NGHỈ PHÉP',
        oldValue: null,
        newValue: newReq,
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || reqData.employeeName,
        performedAt: nowIso,
        note: `Tạo đơn nghỉ phép ${code} (${leaveDays} ngày)`
      });

      return { success: true, data: newReq };
    } catch (e) {
      console.error('[ApiService] Lỗi gửi đơn nghỉ phép:', e);
      throw new Error('Lỗi gửi đơn nghỉ phép: ' + e.message);
    }
  },

  async approveLeaveRequest(requestId) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const docRef = db.collection('leave_requests').doc(requestId);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error('Không tìm thấy đơn nghỉ phép.');

      const reqData = snap.data();
      if (reqData.status === 'APPROVED') {
        return { success: true, message: 'Đơn này đã được duyệt trước đó.' };
      }

      const updateData = {
        status: 'APPROVED',
        approvedBy: currentUser?.uid || '',
        approvedByName: currentUser?.displayName || 'Trưởng phòng',
        approvedAt: nowIso,
        updatedAt: nowIso
      };

      await docRef.update(updateData);

      // Tính toán lại phép của nhân viên ngay lập tức
      await this.recalculateEmployeeLeave(reqData.employeeId, reqData.year);

      // Ghi audit log
      await db.collection('leave_audit_logs').add({
        employeeId: reqData.employeeId,
        employeeName: reqData.employeeName,
        year: reqData.year,
        action: 'DUYỆT NGHỈ PHÉP',
        oldValue: { status: reqData.status },
        newValue: updateData,
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Lãnh đạo',
        performedAt: nowIso,
        note: `Duyệt đơn nghỉ phép ${reqData.requestCode} (${reqData.leaveDays} ngày)`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi duyệt đơn nghỉ phép:', e);
      throw new Error('Lỗi duyệt đơn: ' + e.message);
    }
  },

  async rejectLeaveRequest(requestId, reason = '') {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const docRef = db.collection('leave_requests').doc(requestId);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error('Không tìm thấy đơn nghỉ phép.');

      const reqData = snap.data();
      const updateData = {
        status: 'REJECTED',
        rejectionReason: reason || 'Lãnh đạo từ chối đơn',
        approvedBy: currentUser?.uid || '',
        approvedByName: currentUser?.displayName || 'Lãnh đạo',
        approvedAt: nowIso,
        updatedAt: nowIso
      };

      await docRef.update(updateData);

      // Nếu đơn trước đó từng là APPROVED thì phải tính lại để hoàn phép
      if (reqData.status === 'APPROVED') {
        await this.recalculateEmployeeLeave(reqData.employeeId, reqData.year);
      }

      await db.collection('leave_audit_logs').add({
        employeeId: reqData.employeeId,
        employeeName: reqData.employeeName,
        year: reqData.year,
        action: 'TỪ CHỐI NGHỈ PHÉP',
        oldValue: { status: reqData.status },
        newValue: updateData,
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Lãnh đạo',
        performedAt: nowIso,
        note: `Từ chối đơn ${reqData.requestCode}. Lý do: ${reason}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi từ chối đơn:', e);
      throw new Error('Lỗi từ chối đơn: ' + e.message);
    }
  },

  async cancelLeaveRequest(requestId, reason = '') {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const docRef = db.collection('leave_requests').doc(requestId);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error('Không tìm thấy đơn nghỉ phép.');

      const reqData = snap.data();
      const prevStatus = reqData.status;

      await docRef.update({
        status: 'CANCELLED',
        notes: (reqData.notes ? reqData.notes + ' | ' : '') + `Đã hủy: ${reason || 'Người dùng hủy đơn'}`,
        updatedAt: nowIso
      });

      // Nếu đơn trước đó ĐÃ DUYỆT -> TỰ ĐỘNG HOÀN LẠI NGÀY PHÉP
      if (prevStatus === 'APPROVED') {
        await this.recalculateEmployeeLeave(reqData.employeeId, reqData.year);
      }

      await db.collection('leave_audit_logs').add({
        employeeId: reqData.employeeId,
        employeeName: reqData.employeeName,
        year: reqData.year,
        action: 'HỦY ĐƠN NGHỈ PHÉP',
        oldValue: { status: prevStatus },
        newValue: { status: 'CANCELLED' },
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Người dùng',
        performedAt: nowIso,
        note: `Hủy đơn ${reqData.requestCode}. Lý do: ${reason}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi hủy đơn:', e);
      throw new Error('Lỗi hủy đơn: ' + e.message);
    }
  },

  async recalculateEmployeeLeave(employeeId, year) {
    try {
      const db = this.getDb();
      const yearNum = Number(year);
      const balanceId = `${employeeId}_${yearNum}`;

      // 1. Lấy tất cả đơn nghỉ phép ĐÃ DUYỆT tính vào phép năm của nhân sự trong năm đó
      const snap = await db.collection('leave_requests')
        .where('employeeId', '==', employeeId)
        .where('year', '==', yearNum)
        .where('status', '==', 'APPROVED')
        .get();

      let totalUsedAnnual = 0;
      snap.forEach(d => {
        const r = d.data();
        if (r.leaveType === 'ANNUAL' || !r.leaveType) {
          totalUsedAnnual += (Number(r.leaveDays) || 0);
        }
      });

      // 2. Lấy balance hiện tại
      let balDoc = await db.collection('leave_balances').doc(balanceId).get();
      let annualLeave = 12;
      let carryForward = 0;
      let empName = 'Nhân viên';

      if (balDoc.exists) {
        const balData = balDoc.data();
        annualLeave = Number(balData.annualLeave) || 12;
        carryForward = Number(balData.carryForward) || 0;
        empName = balData.employeeName || empName;
      } else {
        const empDoc = await db.collection('employees').doc(employeeId).get();
        if (empDoc.exists) empName = empDoc.data().fullName || empName;
      }

      const remainingLeave = annualLeave + carryForward - totalUsedAnnual;
      const negativeLeave = remainingLeave < 0 ? Math.abs(remainingLeave) : 0;
      const nowIso = new Date().toISOString();

      const updatedBalance = {
        id: balanceId,
        employeeId: employeeId,
        employeeName: empName,
        year: yearNum,
        annualLeave: annualLeave,
        carryForward: carryForward,
        usedLeave: totalUsedAnnual,
        remainingLeave: remainingLeave,
        negativeLeave: negativeLeave,
        updatedAt: nowIso
      };

      await db.collection('leave_balances').doc(balanceId).set(updatedBalance, { merge: true });
      return updatedBalance;
    } catch (e) {
      console.error('[ApiService] Lỗi tính lại ngày phép:', e);
      return null;
    }
  },

  async rolloverNewYearBalances(targetYear) {
    try {
      const db = this.getDb();
      const employees = await this.loadEmployees();
      const policy = await this.loadLeavePolicy();
      const defaultLeave = Number(policy.defaultAnnualLeave) || 12;
      const prevYear = Number(targetYear) - 1;
      const createdCount = [];

      for (const emp of employees) {
        const balanceId = `${emp.id}_${targetYear}`;
        const existingDoc = await db.collection('leave_balances').doc(balanceId).get();

        if (!existingDoc.exists) {
          let carryForward = 0;
          const prevBalanceId = `${emp.id}_${prevYear}`;
          const prevDoc = await db.collection('leave_balances').doc(prevBalanceId).get();

          if (prevDoc.exists) {
            const prevData = prevDoc.data();
            const prevRemaining = Number(prevData.remainingLeave) || 0;

            if (prevRemaining < 0) {
              // Phép âm chuyển tiếp sang năm sau
              carryForward = prevRemaining;
            } else if (prevRemaining > 0 && policy.allowCarryForwardPositive) {
              const maxPositive = Number(policy.maxCarryForwardPositiveDays) || 3;
              carryForward = Math.min(prevRemaining, maxPositive);
            }
          }

          const remainingLeave = defaultLeave + carryForward;
          const negativeLeave = remainingLeave < 0 ? Math.abs(remainingLeave) : 0;
          const nowIso = new Date().toISOString();

          await db.collection('leave_balances').doc(balanceId).set({
            id: balanceId,
            employeeId: emp.id,
            employeeName: emp.fullName,
            year: Number(targetYear),
            annualLeave: defaultLeave,
            carryForward: carryForward,
            usedLeave: 0,
            remainingLeave: remainingLeave,
            negativeLeave: negativeLeave,
            notes: `Chuyển kỳ phép từ năm ${prevYear}`,
            createdAt: nowIso,
            updatedAt: nowIso
          });

          createdCount.push(emp.fullName);
        }
      }

      return { success: true, count: createdCount.length, employees: createdCount };
    } catch (e) {
      console.error('[ApiService] Lỗi chuyển kỳ phép sang năm mới:', e);
      throw new Error('Lỗi chuyển kỳ phép: ' + e.message);
    }
  },

  // ========================================================
  // 17. MODULE QUẢN LÝ PHÒNG NSG & THIẾT BỊ / MÁY TÍNH PC
  // ========================================================
  getDefaultRoomDevices() {
    return [
      { id: 'dev_1', name: 'Máy chiếu', type: 'PROJECTOR', quantity: 0, unit: 'Bộ', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_2', name: 'Máy lạnh', type: 'AC', quantity: 0, unit: 'Bộ', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '', brand: 'Daikin', capacityBtu: '2 HP (18000 BTU)', maintenanceSchedule: { intervalMonths: 6, lastDate: '', nextDate: '' }, maintenanceHistory: [] },
      { id: 'dev_3', name: 'Tivi', type: 'TV', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_4', name: 'Loa', type: 'SPEAKER', quantity: 0, unit: 'Cặp', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_5', name: 'Dây HDMI', type: 'CABLE', quantity: 0, unit: 'Sợi', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_6', name: 'Bàn', type: 'FURNITURE', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_7', name: 'Ghế', type: 'FURNITURE', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_8', name: 'Màn chiếu', type: 'SCREEN', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_9', name: 'Máy in', type: 'PRINTER', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' },
      { id: 'dev_10', name: 'Máy scan', type: 'SCANNER', quantity: 0, unit: 'Cái', assetCode: '', serialNumber: '', status: 'Tốt', inUseDate: '', purchaseDate: '', manager: '', notes: '' }
    ];
  },

  async addACMaintenanceLog(roomId, deviceId, logData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const roomDoc = await db.collection('rooms').doc(roomId).get();
      if (!roomDoc.exists) throw new Error('Không tìm thấy thông tin phòng');

      const room = roomDoc.data();
      const devices = Array.isArray(room.devices) ? [...room.devices] : [];
      let devIndex = devices.findIndex(d => d.id === deviceId);
      if (devIndex === -1) {
        devIndex = devices.findIndex(d => d.type === 'AC' || (d.name && d.name.toLowerCase().includes('máy lạnh')));
      }

      if (devIndex === -1) throw new Error('Không tìm thấy thiết bị máy lạnh trong phòng');

      const ac = devices[devIndex];
      const history = Array.isArray(ac.maintenanceHistory) ? [...ac.maintenanceHistory] : [];

      const newEntry = {
        id: 'ac_maint_' + Date.now(),
        date: logData.date || new Date().toISOString().split('T')[0],
        type: logData.type || 'Vệ sinh lưới lọc & xịt dàn lạnh',
        content: logData.content || '',
        performer: logData.performer || currentUser?.displayName || 'Kỹ thuật viên',
        statusAfter: logData.statusAfter || 'Tốt',
        cost: Number(logData.cost) || 0,
        notes: logData.notes || '',
        createdAt: nowIso
      };

      history.unshift(newEntry);

      const schedule = ac.maintenanceSchedule || { intervalMonths: 6 };
      schedule.lastDate = newEntry.date;
      schedule.nextDate = this.calculateNextMaintenanceDate(newEntry.date, schedule.intervalMonths || 6);

      ac.maintenanceHistory = history;
      ac.maintenanceSchedule = schedule;
      if (logData.statusAfter) ac.status = logData.statusAfter === 'Tốt' ? 'Đang sử dụng' : logData.statusAfter;

      devices[devIndex] = ac;

      await db.collection('rooms').doc(roomId).update({
        devices: devices,
        updatedAt: nowIso
      });

      // Audit Log
      await db.collection('room_audit_logs').add({
        targetType: 'AC',
        targetId: `${roomId}_${deviceId || 'ac'}`,
        targetName: `Máy lạnh - ${room.roomName}`,
        action: 'VỆ SINH MÁY LẠNH',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Ghi nhận vệ sinh máy lạnh phòng ${room.roomName} ngày ${newEntry.date}`
      });

      return { success: true, entry: newEntry, schedule: schedule };
    } catch (e) {
      console.error('[ApiService] Lỗi ghi nhận vệ sinh máy lạnh:', e);
      throw new Error('Lỗi ghi nhận vệ sinh máy lạnh: ' + e.message);
    }
  },

  async loadRooms() {
    try {
      const db = this.getDb();
      const snap = await db.collection('rooms').get();
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list.sort((a, b) => (a.roomCode || '').localeCompare(b.roomCode || ''));
    } catch (e) {
      console.error('[ApiService] Lỗi tải danh sách phòng:', e);
      return [];
    }
  },

  async getRoomById(roomId) {
    try {
      const db = this.getDb();
      const doc = await db.collection('rooms').doc(roomId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (e) {
      console.error('[ApiService] Lỗi lấy thông tin phòng:', e);
      return null;
    }
  },

  async createRoom(roomData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const devices = Array.isArray(roomData.devices) ? roomData.devices : this.getDefaultRoomDevices();
      const totalDevices = devices.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

      const docData = {
        roomCode: roomData.roomCode || `P-${Math.floor(100 + Math.random() * 900)}`,
        roomName: roomData.roomName || '',
        campusId: roomData.campusId || '',
        campusName: roomData.campusName || '',
        zoneId: roomData.zoneId || '',
        zoneName: roomData.zoneName || '',
        locationDetail: roomData.locationDetail || '',
        roomType: roomData.roomType || 'Lý thuyết',
        floor: roomData.floor || 'Tầng 1',
        capacity: Number(roomData.capacity) || 0,
        area: Number(roomData.area) || 0,
        managerName: roomData.managerName || '',
        managerPhone: roomData.managerPhone || '',
        status: roomData.status || 'Đang sử dụng',
        notes: roomData.notes || '',
        devices: devices,
        deviceCount: totalDevices,
        pcCount: Number(roomData.pcCount) || 0,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Xóa các key undefined
      Object.keys(docData).forEach(k => {
        if (docData[k] === undefined) docData[k] = '';
      });

      const docRef = await db.collection('rooms').add(docData);
      docData.id = docRef.id;

      // Ghi audit log
      await db.collection('room_audit_logs').add({
        targetType: 'ROOM',
        targetId: docRef.id,
        targetName: docData.roomName || docData.roomCode,
        action: 'TẠO PHÒNG MỚI',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Tạo mới phòng ${docData.roomName} (${docData.roomCode}) - Loại: ${docData.roomType}`
      });

      return { success: true, data: docData };
    } catch (e) {
      console.error('[ApiService] Lỗi tạo phòng:', e);
      throw new Error('Lỗi khi tạo phòng: ' + e.message);
    }
  },

  async updateRoom(roomId, roomData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const devices = Array.isArray(roomData.devices) ? roomData.devices : undefined;
      const updatePayload = {
        roomName: roomData.roomName,
        campusId: roomData.campusId,
        campusName: roomData.campusName,
        zoneId: roomData.zoneId,
        zoneName: roomData.zoneName,
        locationDetail: roomData.locationDetail,
        roomType: roomData.roomType,
        floor: roomData.floor,
        capacity: Number(roomData.capacity) || 0,
        area: Number(roomData.area) || 0,
        managerName: roomData.managerName,
        managerPhone: roomData.managerPhone,
        status: roomData.status,
        notes: roomData.notes,
        updatedAt: nowIso
      };

      if (roomData.roomCode) updatePayload.roomCode = roomData.roomCode;
      if (devices) {
        updatePayload.devices = devices;
        updatePayload.deviceCount = devices.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      }
      if (roomData.pcCount !== undefined) {
        updatePayload.pcCount = Number(roomData.pcCount) || 0;
      }

      // Xóa các key undefined
      Object.keys(updatePayload).forEach(k => {
        if (updatePayload[k] === undefined) delete updatePayload[k];
      });

      await db.collection('rooms').doc(roomId).set(updatePayload, { merge: true });

      // Ghi audit log
      await db.collection('room_audit_logs').add({
        targetType: 'ROOM',
        targetId: roomId,
        targetName: roomData.roomName || roomId,
        action: 'CẬP NHẬT PHÒNG',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Cập nhật thông tin phòng ${roomData.roomName || roomId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi cập nhật phòng:', e);
      throw new Error('Lỗi cập nhật phòng: ' + e.message);
    }
  },

  async deleteRoom(roomId, hardDelete = true) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      if (hardDelete) {
        await db.collection('rooms').doc(roomId).delete();

        // Xóa các máy PC liên thuộc phòng này
        const pcSnap = await db.collection('pcs').where('roomId', '==', roomId).get();
        if (!pcSnap.empty) {
          const batch = db.batch();
          pcSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } else {
        await db.collection('rooms').doc(roomId).update({
          status: 'Không sử dụng',
          updatedAt: nowIso
        });
      }

      await db.collection('room_audit_logs').add({
        targetType: 'ROOM',
        targetId: roomId,
        action: hardDelete ? 'XÓA PHÒNG VĨNH VIỄN' : 'NGƯNG HOẠT ĐỘNG PHÒNG',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Thao tác xóa phòng ID: ${roomId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi xóa phòng:', e);
      throw new Error('Lỗi xóa phòng: ' + e.message);
    }
  },

  // ========================================================
  // MÁY TÍNH BỘ PC (FACULTY OFFICE & LAB PCs)
  // ========================================================
  async loadPCs(roomId = null) {
    try {
      const db = this.getDb();
      let query = db.collection('pcs');
      if (roomId) {
        query = query.where('roomId', '==', roomId);
      }
      const snap = await query.get();
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list.sort((a, b) => (a.pcCode || '').localeCompare(b.pcCode || ''));
    } catch (e) {
      console.error('[ApiService] Lỗi tải danh sách máy PC:', e);
      return [];
    }
  },

  async getPCById(pcId) {
    try {
      const db = this.getDb();
      const doc = await db.collection('pcs').doc(pcId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (e) {
      console.error('[ApiService] Lỗi lấy thông tin máy PC:', e);
      return null;
    }
  },

  async createPC(pcData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const docData = {
        pcCode: pcData.pcCode || `PC-${Math.floor(100 + Math.random() * 900)}`,
        pcName: pcData.pcName || '',
        roomId: pcData.roomId || '',
        roomName: pcData.roomName || '',
        campusId: pcData.campusId || '',
        zoneId: pcData.zoneId || '',
        userName: pcData.userName || '',
        positionDetail: pcData.positionDetail || '',
        handoverDate: pcData.handoverDate || new Date().toISOString().split('T')[0],
        status: pcData.status || 'Đang sử dụng',

        // 2. Hardware
        hardware: {
          mainboardSerial: pcData.hardware?.mainboardSerial || '',
          mainboardBrand: pcData.hardware?.mainboardBrand || '',
          mainboardModel: pcData.hardware?.mainboardModel || '',
          cpu: pcData.hardware?.cpu || '',
          cpuSerial: pcData.hardware?.cpuSerial || '',
          ram: pcData.hardware?.ram || '',
          ramSerial: pcData.hardware?.ramSerial || '',
          storage: pcData.hardware?.storage || '',
          storageSerial: pcData.hardware?.storageSerial || '',
          vga: pcData.hardware?.vga || '',
          vgaSerial: pcData.hardware?.vgaSerial || '',
          screen: pcData.hardware?.screen || '',
          screenSerial: pcData.hardware?.screenSerial || '',
          psu: pcData.hardware?.psu || '',
          psuSerial: pcData.hardware?.psuSerial || ''
        },

        // 3. OS Windows
        os: {
          name: pcData.os?.name || 'Windows 11',
          isLicensed: Boolean(pcData.os?.isLicensed),
          duration: pcData.os?.duration || 'Vĩnh viễn',
          licenseType: pcData.os?.licenseType || 'OEM',
          licenseKey: pcData.os?.licenseKey || '',
          activationDate: pcData.os?.activationDate || '',
          expirationDate: pcData.os?.expirationDate || ''
        },

        // 4. Microsoft Office
        office: {
          version: pcData.office?.version || 'Office 2021',
          isLicensed: Boolean(pcData.office?.isLicensed),
          duration: pcData.office?.duration || 'Vĩnh viễn'
        },

        // 5. Softwares
        softwares: Array.isArray(pcData.softwares) ? pcData.softwares : [],

        // 6. Maintenance Schedule
        maintenanceSchedule: {
          intervalMonths: Number(pcData.maintenanceSchedule?.intervalMonths) || 6,
          lastDate: pcData.maintenanceSchedule?.lastDate || new Date().toISOString().split('T')[0],
          nextDate: pcData.maintenanceSchedule?.nextDate || '',
          notes: pcData.maintenanceSchedule?.notes || ''
        },

        // 7. Maintenance History
        maintenanceHistory: Array.isArray(pcData.maintenanceHistory) ? pcData.maintenanceHistory : [],

        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Tự động tính next maintenance date nếu chưa có
      if (!docData.maintenanceSchedule.nextDate && docData.maintenanceSchedule.lastDate) {
        docData.maintenanceSchedule.nextDate = this.calculateNextMaintenanceDate(
          docData.maintenanceSchedule.lastDate,
          docData.maintenanceSchedule.intervalMonths
        );
      }

      const docRef = await db.collection('pcs').add(docData);
      docData.id = docRef.id;

      // Cập nhật số lượng PC trong phòng
      if (docData.roomId) {
        await this.recalculateRoomPCCount(docData.roomId);
      }

      // Ghi audit log
      await db.collection('room_audit_logs').add({
        targetType: 'PC',
        targetId: docRef.id,
        targetName: docData.pcName || docData.pcCode,
        action: 'TẠO MÁY PC MỚI',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Thêm máy tính PC ${docData.pcName} (${docData.pcCode}) vào phòng ${docData.roomName}`
      });

      return { success: true, data: docData };
    } catch (e) {
      console.error('[ApiService] Lỗi tạo máy PC:', e);
      throw new Error('Lỗi khi tạo máy PC: ' + e.message);
    }
  },

  async updatePC(pcId, pcData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const updatePayload = {
        pcName: pcData.pcName,
        roomId: pcData.roomId,
        roomName: pcData.roomName,
        campusId: pcData.campusId,
        zoneId: pcData.zoneId,
        userName: pcData.userName,
        positionDetail: pcData.positionDetail,
        handoverDate: pcData.handoverDate,
        status: pcData.status,
        hardware: pcData.hardware,
        os: pcData.os,
        office: pcData.office,
        softwares: pcData.softwares,
        maintenanceSchedule: pcData.maintenanceSchedule,
        maintenanceHistory: pcData.maintenanceHistory,
        updatedAt: nowIso
      };

      if (pcData.pcCode) updatePayload.pcCode = pcData.pcCode;

      // Tính lại next maintenance date nếu cần
      if (updatePayload.maintenanceSchedule && updatePayload.maintenanceSchedule.lastDate) {
        updatePayload.maintenanceSchedule.nextDate = this.calculateNextMaintenanceDate(
          updatePayload.maintenanceSchedule.lastDate,
          updatePayload.maintenanceSchedule.intervalMonths
        );
      }

      // Xóa các key undefined
      Object.keys(updatePayload).forEach(k => {
        if (updatePayload[k] === undefined) delete updatePayload[k];
      });

      await db.collection('pcs').doc(pcId).set(updatePayload, { merge: true });

      if (pcData.roomId) {
        await this.recalculateRoomPCCount(pcData.roomId);
      }

      await db.collection('room_audit_logs').add({
        targetType: 'PC',
        targetId: pcId,
        targetName: pcData.pcName || pcId,
        action: 'CẬP NHẬT MÁY PC',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Cập nhật cấu hình máy PC ${pcData.pcName || pcId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi cập nhật máy PC:', e);
      throw new Error('Lỗi cập nhật máy PC: ' + e.message);
    }
  },

  async deletePC(pcId) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();

      const pcDoc = await db.collection('pcs').doc(pcId).get();
      const roomId = pcDoc.exists ? pcDoc.data().roomId : null;

      await db.collection('pcs').doc(pcId).delete();

      if (roomId) {
        await this.recalculateRoomPCCount(roomId);
      }

      await db.collection('room_audit_logs').add({
        targetType: 'PC',
        targetId: pcId,
        action: 'XÓA MÁY PC VĨNH VIỄN',
        performedBy: currentUser?.uid || '',
        performedByName: currentUser?.displayName || 'Quản trị viên',
        performedAt: nowIso,
        note: `Xóa máy tính PC ID: ${pcId}`
      });

      return { success: true };
    } catch (e) {
      console.error('[ApiService] Lỗi xóa máy PC:', e);
      throw new Error('Lỗi xóa máy PC: ' + e.message);
    }
  },

  async addPCMaintenanceLog(pcId, logData) {
    try {
      const db = this.getDb();
      const currentUser = AuthService.getCurrentUser();
      const nowIso = new Date().toISOString();
      const pcDoc = await db.collection('pcs').doc(pcId).get();
      if (!pcDoc.exists) throw new Error('Không tìm thấy máy PC');

      const pc = pcDoc.data();
      const history = Array.isArray(pc.maintenanceHistory) ? [...pc.maintenanceHistory] : [];
      
      const newEntry = {
        id: 'maint_' + Date.now(),
        date: logData.date || new Date().toISOString().split('T')[0],
        type: logData.type || 'Vệ sinh máy',
        content: logData.content || '',
        performer: logData.performer || currentUser?.displayName || 'Kỹ thuật viên',
        cost: Number(logData.cost) || 0,
        statusBefore: logData.statusBefore || 'Bình thường',
        statusAfter: logData.statusAfter || 'Tốt',
        notes: logData.notes || '',
        createdAt: nowIso
      };

      history.unshift(newEntry);

      // Cập nhật ngày bảo trì gần nhất và tính ngày tiếp theo
      const schedule = pc.maintenanceSchedule || { intervalMonths: 6 };
      schedule.lastDate = newEntry.date;
      schedule.nextDate = this.calculateNextMaintenanceDate(newEntry.date, schedule.intervalMonths);

      await db.collection('pcs').doc(pcId).update({
        maintenanceHistory: history,
        maintenanceSchedule: schedule,
        updatedAt: nowIso
      });

      return { success: true, entry: newEntry };
    } catch (e) {
      console.error('[ApiService] Lỗi ghi nhận bảo trì:', e);
      throw new Error('Lỗi ghi nhận bảo trì: ' + e.message);
    }
  },

  calculateNextMaintenanceDate(lastDateStr, intervalMonths = 6) {
    if (!lastDateStr) return '';
    try {
      const d = new Date(lastDateStr);
      d.setMonth(d.getMonth() + Number(intervalMonths));
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  },

  async recalculateRoomPCCount(roomId) {
    try {
      const db = this.getDb();
      const pcSnap = await db.collection('pcs').where('roomId', '==', roomId).get();
      const count = pcSnap.size;
      await db.collection('rooms').doc(roomId).update({
        pcCount: count,
        updatedAt: new Date().toISOString()
      });
      return count;
    } catch (e) {
      console.warn('[ApiService] Lỗi cập nhật số lượng PC của phòng:', e);
    }
  }
};

window.ApiService = ApiService;
