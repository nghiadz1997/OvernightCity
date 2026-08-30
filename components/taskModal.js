/**
 * NSG SUPPORT - COMPREHENSIVE REFACTORED TASK & REPORT DETAIL MODAL
 * Mô hình: "MỘT PHIẾU – MỘT LUỒNG – NHIỀU VAI TRÒ"
 * Cấu trúc trực quan 5 khối: Header & Stepper -> Phân công -> Địa điểm -> Thao tác thông minh theo Role -> Lịch sử Timeline -> Kênh Trao đổi Realtime
 */

const TaskModalComponent = {
  currentData: null,
  activeTab: 'overview', // 'overview' (Tổng quan & Xử lý) hoặc 'comments' (Trao đổi)
  staffList: [],
  commentsRealtimeUnsub: null,
  commentsPollTimer: null,

  async open(targetId, code, targetType = 'REPORT', defaultTab = 'overview') {
    this.activeTab = defaultTab;

    // Tìm dữ liệu trong cache realtime trước
    let item = null;
    if (targetType === 'TASK') {
      item = RealtimeService.tasks.find(t => t.id === targetId || t.code === code);
    } else {
      item = RealtimeService.reports.find(r => r.id === targetId || r.code === code);
    }

    if (!item) {
      try {
        const res = await ApiService.trackReport(code);
        if (res.success && res.data) {
          item = res.data;
        }
      } catch (e) {
        Utils.showToast('Không thể tải thông tin công việc: ' + e.message, 'error');
        return;
      }
    }

    this.currentData = item;

    // Tải danh sách nhân sự thực tế từ Cloud Firestore nếu chưa có
    if (window.firebase && window.firebase.firestore && (!this.staffList || this.staffList.length === 0)) {
      try {
        const snap = await window.firebase.firestore().collection('users').get();
        const list = [];
        snap.forEach(d => {
          const u = { uid: d.id, ...d.data() };
          if (u.isActive !== false) list.push(u);
        });
        this.staffList = list;
      } catch (e) {
        console.warn('[TaskModalComponent] Lỗi tải danh sách users:', e);
      }
    }

    this.renderModal();
    if (this.activeTab === 'comments') {
      this.startCommentsPolling();
    }
  },

  close() {
    this.stopCommentsPolling();
    const modal = document.getElementById('task-detail-modal');
    if (modal) modal.remove();
  },

  setTab(tabName) {
    this.activeTab = tabName;
    this.renderModal();
    if (tabName === 'comments') {
      this.startCommentsPolling();
      setTimeout(() => {
        const box = document.getElementById('modal-comments-list');
        if (box) box.scrollTop = box.scrollHeight;
        const input = document.getElementById('comment-text-input');
        if (input) input.focus();
      }, 50);
    } else {
      this.stopCommentsPolling();
    }
  },

  startCommentsPolling() {
    this.stopCommentsPolling();
    if (!this.currentData) return;

    const code = this.currentData.code || this.currentData.id;

    // 1. Lắng nghe tức thì qua RealtimeService Broadcast
    if (window.RealtimeService) {
      this.commentsRealtimeUnsub = RealtimeService.subscribeComments((newComment) => {
        if (!newComment || !this.currentData) return;
        if (newComment.targetCode === code || newComment.targetId === code || newComment.targetCode === this.currentData.id) {
          if (!this.currentData.comments) this.currentData.comments = [];
          const exists = this.currentData.comments.some(c => (c.id && c.id === newComment.id) || (c.content === newComment.content && c.createdAt === newComment.createdAt));
          if (!exists) {
            this.currentData.comments.push(newComment);
            SoundService.playNotification();
            if (this.activeTab === 'comments') this.renderModal();
          }
        }
      });
    }

    // 2. Polling 1.2s khi đang mở tab Chat
    this.commentsPollTimer = setInterval(async () => {
      if (this.activeTab !== 'comments' || !document.getElementById('modal-comments-list') || !this.currentData) return;
      try {
        const latest = await ApiService.getComments(code);
        const currentCount = this.currentData.comments?.length || 0;
        if (latest && latest.length > currentCount) {
          this.currentData.comments = latest;
          SoundService.playNotification();
          this.renderModal();
        }
      } catch (e) {}
    }, 1200);
  },

  stopCommentsPolling() {
    if (this.commentsPollTimer) {
      clearInterval(this.commentsPollTimer);
      this.commentsPollTimer = null;
    }
    if (this.commentsRealtimeUnsub) {
      this.commentsRealtimeUnsub();
      this.commentsRealtimeUnsub = null;
    }
  },

  renderModal() {
    const item = this.currentData;
    if (!item) return;

    const existing = document.getElementById('task-detail-modal');
    if (existing) existing.remove();

    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';
    const status = item.status || 'CHỜ PHÂN CÔNG';
    const priority = item.priority || 'BÌNH THƯỜNG';
    const isOverdue = item.isOverdue || false;

    const currentUser = AuthService.getCurrentUser();
    const canDelete = AuthService.canDeleteTask();

    const modal = document.createElement('div');
    modal.id = 'task-detail-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fade-in';

    modal.innerHTML = `
      <div class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <!-- 1. Modal Header -->
        <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-black px-2.5 py-1 rounded-md bg-blue-600 text-white shadow-xs">
              ${item.code}
            </span>
            <span class="text-sm font-bold text-slate-200">
              ${isReport ? 'Phiếu phản ánh sự cố' : 'Nhiệm vụ nội bộ'}
            </span>
            ${Utils.renderPriorityBadge(priority)}
            ${Utils.renderStatusBadge(status, isOverdue)}
          </div>
          <button class="text-slate-400 hover:text-white text-xl p-1 cursor-pointer transition-colors" onclick="TaskModalComponent.close()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- 2. Stepper Timeline 5 Bước Tiến Độ Chuẩn -->
        <div class="bg-slate-50 px-6 py-3 border-b border-slate-200 overflow-x-auto">
          <div class="flex items-center justify-between min-w-[580px] text-xs font-bold">
            ${this.renderStepperStep('MỚI', 'fa-file-circle-plus', ['MỚI', 'CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 ${['CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0 ? 'bg-blue-600' : 'bg-slate-200'} mx-2 transition-colors"></div>
            ${this.renderStepperStep('CHỜ PHÂN CÔNG', 'fa-hourglass-start', ['CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 ${['ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0 ? 'bg-blue-600' : 'bg-slate-200'} mx-2 transition-colors"></div>
            ${this.renderStepperStep('ĐÃ PHÂN CÔNG', 'fa-user-check', ['ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 ${['ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0 ? 'bg-blue-600' : 'bg-slate-200'} mx-2 transition-colors"></div>
            ${this.renderStepperStep('ĐANG XỬ LÝ', 'fa-screwdriver-wrench', ['ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 ${['CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0 ? 'bg-blue-600' : 'bg-slate-200'} mx-2 transition-colors"></div>
            ${this.renderStepperStep('CHỜ NGHIỆM THU', 'fa-clipboard-check', ['CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 ${status === 'HOÀN THÀNH' ? 'bg-blue-600' : 'bg-slate-200'} mx-2 transition-colors"></div>
            ${this.renderStepperStep('HOÀN THÀNH', 'fa-circle-check', status === 'HOÀN THÀNH')}
          </div>
        </div>

        <!-- 3. Navigation Tabs -->
        <div class="flex items-center border-b border-slate-200 px-6 bg-white overflow-x-auto text-sm font-semibold">
          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('overview')">
            <i class="fa-solid fa-clipboard-list text-blue-600"></i>
            <span>Tổng quan & Xử lý</span>
          </button>

          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'comments' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('comments')">
            <i class="fa-solid fa-comments text-blue-600"></i>
            <span>Trao đổi trực tiếp</span>
            ${(item.comments && item.comments.length > 0) ? `<span class="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">${item.comments.length}</span>` : ''}
          </button>
        </div>

        <!-- 4. Modal Body -->
        <div class="flex-1 overflow-y-auto p-6 text-slate-800 space-y-6">
          ${this.activeTab === 'overview' ? this.renderOverviewTab(targetType) : this.renderCommentsTab(targetType)}
        </div>

        <!-- 5. Modal Footer -->
        <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div class="text-xs text-slate-500">
            Mã phiếu: <strong class="font-mono text-slate-800">${item.code}</strong> | Tạo lúc: ${Utils.formatDateTime(item.createdAt)} ${item.completedAt ? `| Hoàn tất: ${Utils.formatDateTime(item.completedAt)}` : ''}
          </div>
          <div class="flex items-center gap-2">
            ${canDelete ? `
              <button type="button" class="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs" onclick="TaskModalComponent.deleteCurrentItem()">
                <i class="fa-solid fa-trash-can"></i>
                <span>Xóa vĩnh viễn (Super Admin)</span>
              </button>
            ` : ''}
            <button type="button" class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer" onclick="TaskModalComponent.close()">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  renderStepperStep(label, icon, isCompleted) {
    return `
      <div class="flex items-center gap-1.5 ${isCompleted ? 'text-blue-600 font-extrabold' : 'text-slate-400 font-semibold'}">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isCompleted ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'}">
          <i class="fa-solid ${icon}"></i>
        </div>
        <span>${label}</span>
      </div>
    `;
  },

  // ==========================================
  // TAB 1: TỔNG QUAN & XỬ LÝ (5 KHỐI TRỰC QUAN)
  // ==========================================
  renderOverviewTab(targetType) {
    const item = this.currentData;
    const currentUser = AuthService.getCurrentUser();
    const status = item.status || 'CHỜ PHÂN CÔNG';
    const isCompleted = status === 'HOÀN THÀNH';
    const deadlineInfo = Utils.getDeadlineStatus(item.deadline, isCompleted);

    // Xác định thông tin Người quản lý (Phó phòng/Trưởng phòng) và Kỹ thuật viên
    const managerName = item.assignedManagerName || item.deputyName || (item.assignedRole === 'DEPUTY_MANAGER' ? item.assignedToName : null);
    const techName = item.assignedRole === 'DEPUTY_MANAGER' ? null : (item.assignedToName || null);
    const reviewerName = item.reviewedByName || item.assignedReviewerName || (managerName ? managerName : (item.assignedByName || 'Trưởng phòng'));

    return `
      <div class="space-y-6">
        <!-- TIÊU ĐỀ SỰ CỐ / CÔNG VIỆC -->
        <div class="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              ${item.categoryName || 'Cơ sở vật chất'}
            </span>
            ${item.priority === 'KHẨN CẤP' ? '<span class="px-2 py-0.5 rounded-md text-[11px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse">🚨 YÊU CẦU XỬ LÝ GẤP</span>' : ''}
          </div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 leading-snug">
            ${item.title}
          </h2>
          <p class="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
            ${item.description || 'Không có mô tả chi tiết.'}
          </p>
        </div>

        <!-- GRID 2 CỘT: 👤 PHÂN CÔNG & 📍 ĐỊA ĐIỂM -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- KHỐI 1: 👤 PHÂN CÔNG -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-blue-600"></i>
                <span>Phân công & Phụ trách</span>
              </h4>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Người quản lý:</span>
                <span class="font-bold ${managerName ? 'text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200' : 'text-slate-400 italic'}">
                  ${managerName ? `🎖️ ${managerName}` : 'Chưa chỉ định'}
                </span>
              </div>

              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Kỹ thuật thực hiện:</span>
                <span class="font-bold ${techName ? 'text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200' : 'text-slate-400 italic'}">
                  ${techName ? `🔧 ${techName}` : 'Chưa phân công'}
                </span>
              </div>

              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Người nghiệm thu:</span>
                <span class="font-bold text-slate-800">
                  ${reviewerName}
                </span>
              </div>

              <div class="flex items-center justify-between py-1">
                <span class="text-slate-500">Hạn xử lý (Deadline):</span>
                <span class="font-bold ${deadlineInfo.isOverdue ? 'text-red-600' : 'text-slate-800'}">
                  ${item.deadline ? Utils.formatDate(item.deadline) : 'Không'} 
                  <span class="text-[10px] font-semibold text-slate-500">(${deadlineInfo.label})</span>
                </span>
              </div>
            </div>
          </div>

          <!-- KHỐI 2: 📍 ĐỊA ĐIỂM & LIÊN HỆ -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-location-dot text-red-500"></i>
                <span>Địa điểm & Người báo</span>
              </h4>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Vị trí:</span>
                <strong class="text-slate-800">${item.location || 'Khuôn viên'}</strong>
              </div>

              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Phòng / Khu vực:</span>
                <strong class="text-blue-700 font-black">${item.room || 'Chưa rõ'}</strong>
              </div>

              <div class="flex items-center justify-between py-1 border-b border-slate-50">
                <span class="text-slate-500">Người gửi phản ánh:</span>
                <strong class="text-slate-800">${item.senderName || 'Lãnh đạo / Hệ thống'}</strong>
              </div>

              <div class="flex items-center justify-between py-1">
                <span class="text-slate-500">Khoa / SĐT:</span>
                <span class="font-semibold text-slate-700">${item.senderDept || 'Khách'} ${item.senderPhone ? `(${item.senderPhone})` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CẢNH BÁO NẾU BỊ YÊU CẦU XỬ LÝ LẠI (CHƯA ĐẠT) -->
        ${item.rejectionReason && status === 'ĐANG XỬ LÝ' ? `
          <div class="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3 shadow-xs">
            <div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div class="flex-1 text-xs text-rose-950">
              <h4 class="font-black text-rose-900 uppercase tracking-wide">YÊU CẦU XỬ LÝ LẠI (NGHIỆM THU CHƯA ĐẠT)</h4>
              <p class="mt-1 leading-relaxed"><strong class="text-rose-900">Lý do từ người kiểm tra:</strong> "${item.rejectionReason}"</p>
              <p class="text-[11px] text-rose-700 mt-1 font-semibold">👉 Kỹ thuật viên vui lòng kiểm tra lại hiện trường, khắc phục triệt để và gửi lại nghiệm thu.</p>
            </div>
          </div>
        ` : ''}

        <!-- KHỐI 3: ⚡ THAO TÁC THÔNG MINH THEO ROLE (SMART ACTION HUB) -->
        <div class="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-blue-100 pb-2.5">
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-bolt text-amber-500"></i>
              <span>Thao tác xử lý phiếu</span>
            </h3>
            <span class="text-xs font-bold text-slate-500">
              Vai trò của bạn: <strong class="text-blue-700">${AuthService.getRoleLabel(currentUser?.role)}</strong>
            </span>
          </div>

          ${this.renderSmartActions(targetType)}
        </div>

        <!-- KHỐI 4: 📸 HÌNH ẢNH HIỆN TRƯỜNG & KẾT QUẢ XỬ LÝ -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-images text-indigo-600"></i>
            <span>Hình ảnh hiện trường & Bằng chứng nghiệm thu</span>
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Ảnh ban đầu lúc tiếp nhận -->
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span class="text-xs font-bold text-slate-700 block mb-2">📸 Ảnh ban đầu lúc tiếp nhận sự cố:</span>
              ${item.attachments && item.attachments.length > 0 ? `
                <div class="grid grid-cols-2 gap-2">
                  ${item.attachments.map(att => `
                    <a href="${att.url || att}" target="_blank" class="block border rounded-lg overflow-hidden bg-white hover:opacity-90 transition-opacity">
                      <img src="${att.url || att}" class="w-full h-24 object-cover">
                    </a>
                  `).join('')}
                </div>
              ` : `
                <div class="h-20 flex items-center justify-center text-slate-400 text-xs italic bg-white rounded-lg border border-dashed border-slate-200">
                  Không có hình ảnh ban đầu
                </div>
              `}
            </div>

            <!-- Ảnh sau khi kỹ thuật viên xử lý xong -->
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span class="text-xs font-bold text-slate-700 block mb-2">✅ Ảnh thực tế sau khi xử lý xong (Nghiệm thu):</span>
              ${item.afterPhotos && item.afterPhotos.length > 0 ? `
                <div class="grid grid-cols-2 gap-2">
                  ${item.afterPhotos.map(url => `
                    <a href="${url}" target="_blank" class="block border rounded-lg overflow-hidden bg-white hover:opacity-90 transition-opacity shadow-xs">
                      <img src="${url}" class="w-full h-24 object-cover">
                    </a>
                  `).join('')}
                </div>
              ` : `
                <div class="h-20 flex items-center justify-center text-slate-400 text-xs italic bg-white rounded-lg border border-dashed border-slate-200">
                  Chưa có ảnh báo cáo hoàn thành
                </div>
              `}
            </div>
          </div>

          ${item.materialsUsed ? `
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span class="font-bold text-slate-700">🔧 Vật tư / Linh kiện đã sử dụng:</span>
              <span class="text-slate-900 font-semibold ml-1">${item.materialsUsed}</span>
            </div>
          ` : ''}

          ${item.reviewNote ? `
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
              <span class="font-bold text-emerald-900">📝 Đánh giá nghiệm thu:</span>
              <span class="text-emerald-950 font-semibold ml-1">"${item.reviewNote}"</span>
            </div>
          ` : ''}
        </div>

        <!-- KHỐI 5: 🕘 LỊCH SỬ XỬ LÝ (TIMELINE DÒNG THỜI GIAN) -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-blue-600"></i>
            <span>Lịch sử xử lý & Dòng thời gian (Timeline)</span>
          </h4>

          <div class="border-l-2 border-blue-500 ml-3 pl-4 space-y-4 py-2" id="task-timeline-container">
            ${this.renderTimeline(item)}
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // THAO TÁC THÔNG MINH (SMART ACTIONS)
  // ==========================================
  renderSmartActions(targetType) {
    const item = this.currentData;
    const currentUser = AuthService.getCurrentUser();
    const status = item.status || 'CHỜ PHÂN CÔNG';

    const isDeputy = AuthService.isDeputyManager();
    const isAssignedToMe = Utils.isTaskAssignedToUser(item, currentUser?.uid);
    const canAssign = AuthService.canAssignTask(item);
    const canReview = AuthService.canReviewTask(item);

    // KỊCH BẢN 1: ĐÃ HOÀN THÀNH
    if (status === 'HOÀN THÀNH') {
      return `
        <div class="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
            <i class="fa-solid fa-check-double"></i>
          </div>
          <div>
            <h5 class="font-extrabold text-sm text-emerald-950">Công việc đã hoàn thành & Nghiệm thu đạt chuẩn</h5>
            <p class="text-emerald-800 mt-0.5">Phiếu đã được bàn giao thành công lúc ${Utils.formatDateTime(item.completedAt)}.</p>
          </div>
        </div>
      `;
    }

    // KỊCH BẢN 2: CHỜ NGHIỆM THU (DÀNH CHO NGƯỜI CÓ QUYỀN DUYỆT)
    if (status === 'CHỜ NGHIỆM THU') {
      if (canReview) {
        return `
          <div class="bg-white p-4 rounded-xl border border-purple-300 shadow-xs space-y-3">
            <div class="flex items-center gap-2 text-xs font-bold text-purple-900">
              <i class="fa-solid fa-stamp text-purple-600 text-base"></i>
              <span>Kỹ thuật viên đã báo hoàn tất. Bạn hãy kiểm tra chất lượng và duyệt nghiệm thu:</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Ghi chú nghiệm thu / Lý do chưa đạt:</label>
              <textarea id="review-note-input" class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-medium" rows="2" placeholder="Nhập nhận xét đánh giá chất lượng kỹ thuật..."></textarea>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
              <button type="button" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5" onclick="TaskModalComponent.approveReview()">
                <i class="fa-solid fa-check"></i>
                <span>✓ ĐẠT – DUYỆT HOÀN THÀNH</span>
              </button>
              <button type="button" class="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-300 transition-all flex items-center gap-2 cursor-pointer" onclick="TaskModalComponent.rejectReview()">
                <i class="fa-solid fa-xmark"></i>
                <span>✕ CHƯA ĐẠT – YÊU CẦU XỬ LÝ LẠI</span>
              </button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center gap-3 text-xs text-purple-900">
            <i class="fa-solid fa-hourglass-half text-purple-600 text-xl"></i>
            <div>
              <span class="font-bold block">Đang chờ Lãnh đạo / Trưởng phòng nghiệm thu:</span>
              <span>Kỹ thuật viên đã hoàn thành và gửi báo cáo nghiệm thu. Hệ thống đang chờ người có thẩm quyền duyệt.</span>
            </div>
          </div>
        `;
      }
    }

    // KỊCH BẢN 3: ĐÃ PHÂN CÔNG CHO KỸ THUẬT VIÊN -> KTV BẤM [NHẬN VIỆC]
    if (status === 'ĐÃ PHÂN CÔNG') {
      const isTech = isAssignedToMe || (item.assignedTo && currentUser && (item.assignedTo === currentUser.uid || item.assignedToName?.includes(currentUser.displayName)));

      return `
        <div class="space-y-3">
          ${isTech ? `
            <div class="bg-blue-600 p-4 rounded-xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h5 class="font-black text-sm flex items-center gap-2">
                  <i class="fa-solid fa-bell animate-bounce"></i> Bạn đã được phân công xử lý phiếu này!
                </h5>
                <p class="text-xs text-blue-100 mt-0.5">Vui lòng nhấn nút nhận việc để bắt đầu thực hiện tại hiện trường.</p>
              </div>
              <button type="button" class="w-full sm:w-auto px-6 py-3 bg-white text-blue-900 hover:bg-blue-50 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-105 shrink-0" onclick="TaskModalComponent.acceptTask()">
                <i class="fa-solid fa-play"></i>
                <span>🚀 NHẬN VIỆC & BẮT ĐẦU XỬ LÝ</span>
              </button>
            </div>
          ` : ''}

          <!-- Phân công / Điều phối tiếp (Dành cho Phó phòng hoặc Trưởng phòng) -->
          ${canAssign ? `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">
                  ${isDeputy ? '🎖️ Phó phòng chỉ định Kỹ thuật viên thực hiện:' : '👔 Điều chỉnh phân công / Đổi người phụ trách:'}
                </span>
                ${item.assignedTo ? `
                  <button type="button" class="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer" onclick="TaskModalComponent.unassignCurrentTask()">
                    <i class="fa-solid fa-user-xmark mr-1"></i> Hủy phân công
                  </button>
                ` : ''}
              </div>
              ${this.renderAssignForm(targetType)}
            </div>
          ` : ''}
        </div>
      `;
    }

    // KỊCH BẢN 4: ĐANG XỬ LÝ -> KTV CẬP NHẬT TIẾN ĐỘ & BÁO HOÀN TẤT
    if (status === 'ĐANG XỬ LÝ') {
      return `
        <div class="space-y-4">
          <!-- Form KTV Báo hoàn tất & Tải ảnh nghiệm thu -->
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h5 class="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <i class="fa-solid fa-screwdriver-wrench text-indigo-600"></i>
              <span>Cập nhật kết quả hiện trường & Báo hoàn tất:</span>
            </h5>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Ghi chú tiến độ / Nội dung xử lý:</label>
                <textarea id="progress-note-input" class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" rows="2" placeholder="Ví dụ: Đã thay tụ máy lạnh, kiểm tra mát ổn định...">${item.latestNote || ''}</textarea>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Vật tư / Linh kiện đã sử dụng (nếu có):</label>
                <input type="text" id="materials-used-input" class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Ví dụ: 01 tụ đề 45uF, 0.5m ống đồng..." value="${item.materialsUsed || ''}">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Ảnh thực tế sau khi xử lý xong (Bằng chứng nghiệm thu):</label>
              <input type="file" id="after-photo-input" multiple accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer">
            </div>

            <div class="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
              <button type="button" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5" onclick="TaskModalComponent.submitForReview()">
                <i class="fa-solid fa-paper-plane"></i>
                <span>✅ BÁO HOÀN TẤT & GỬI NGHIỆM THU</span>
              </button>

              <button type="button" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer" onclick="TaskModalComponent.handleProgressSubmit(event)">
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Lưu tiến độ</span>
              </button>
            </div>
          </div>

          <!-- Trưởng phòng có thể điều chuyển người nếu cần -->
          ${canAssign ? `
            <details class="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
              <summary class="font-bold text-slate-700 cursor-pointer hover:text-blue-600 flex items-center gap-1.5">
                <i class="fa-solid fa-user-pen text-slate-400"></i> Điều chỉnh phân công / Đổi kỹ thuật viên khác
              </summary>
              <div class="mt-3 pt-3 border-t border-slate-100 space-y-3">
                ${this.renderAssignForm(targetType)}
              </div>
            </details>
          ` : ''}
        </div>
      `;
    }

    // KỊCH BẢN 5: MỚI / CHỜ PHÂN CÔNG (FORM PHÂN CÔNG TRỰC TIẾP)
    if (canAssign) {
      return `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-slate-900 uppercase">
              ${isDeputy ? '🎖️ Phó phòng phân công Kỹ thuật viên xử lý:' : '👔 Phân công nhiệm vụ (Giao Phó phòng hoặc Giao thẳng Kỹ thuật):'}
            </span>
          </div>
          ${this.renderAssignForm(targetType)}
        </div>
      `;
    }

    return `
      <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-center gap-2">
        <i class="fa-solid fa-hourglass-start text-amber-600 text-base"></i>
        <span>Phiếu đang chờ Lãnh đạo phân công người phụ trách.</span>
      </div>
    `;
  },

  // ==========================================
  // FORM PHÂN CÔNG (GIAO PHÓ PHÒNG / KỸ THUẬT)
  // ==========================================
  renderAssignForm(targetType) {
    const item = this.currentData;
    const isHead = AuthService.isDepartmentHead();

    const staffList = this.staffList || [];
    const deputies = staffList.filter(u => u.role === 'DEPUTY_MANAGER');
    const technicians = staffList.filter(u => ['STAFF', 'STAFF_IT', 'STAFF_MAINTENANCE', 'STAFF_GREEN', 'STAFF_CLEANING', 'STAFF_KTX'].includes(u.role));

    return `
      <form onsubmit="TaskModalComponent.handleAssignSubmit(event)" class="space-y-3">
        <!-- 1. Chọn Người quản lý (Phó phòng) nếu là Trưởng phòng -->
        ${isHead ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-purple-900 mb-1">
                🎖️ Giao cho Phó phòng điều phối (Tùy chọn):
              </label>
              <select id="assign-manager-select" class="w-full text-xs p-2.5 rounded-xl border border-purple-300 focus:ring-2 focus:ring-purple-500 font-medium bg-purple-50/30">
                <option value="">-- Trưởng phòng trực tiếp quản lý --</option>
                ${deputies.map(d => `
                  <option value="${d.uid}" data-name="${d.displayName || d.email}" ${item.assignedManagerId === d.uid || item.deputyId === d.uid ? 'selected' : ''}>
                    Phó phòng: ${d.displayName || d.email}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-indigo-900 mb-1">
                🔧 Hoặc giao thẳng Kỹ thuật viên thực hiện:
              </label>
              <select id="assign-tech-select" class="w-full text-xs p-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-indigo-50/30">
                <option value="">-- Để Phó phòng tự chọn KTV sau --</option>
                ${technicians.map(t => `
                  <option value="${t.uid}" data-name="${t.displayName || t.email}" data-role="${t.role}" ${item.assignedTo === t.uid ? 'selected' : ''}>
                    ${t.displayName || t.email} (${AuthService.getRoleLabel(t.role)})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        ` : `
          <!-- Nếu là Phó phòng: Chọn Kỹ thuật viên trực tiếp -->
          <div>
            <label class="block text-[11px] font-bold text-indigo-900 mb-1">
              🔧 Chọn Kỹ thuật viên phụ trách thực hiện:
            </label>
            <select id="assign-tech-select" class="w-full text-xs p-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-indigo-50/30" required>
              <option value="">-- Chọn Kỹ thuật viên --</option>
              ${technicians.map(t => `
                <option value="${t.uid}" data-name="${t.displayName || t.email}" data-role="${t.role}" ${item.assignedTo === t.uid ? 'selected' : ''}>
                  ${t.displayName || t.email} (${AuthService.getRoleLabel(t.role)})
                </option>
              `).join('')}
            </select>
          </div>
        `}

        <!-- 2. Hạn xử lý & Mức độ ưu tiên -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Hạn hoàn thành (Deadline):</label>
            <input type="date" id="assign-deadline-input" class="w-full text-xs p-2 rounded-xl border border-slate-300 font-medium" value="${item.deadline ? item.deadline.split('T')[0] : ''}">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Mức độ ưu tiên:</label>
            <select id="assign-priority-select" class="w-full text-xs p-2 rounded-xl border border-slate-300 font-medium">
              <option value="BÌNH THƯỜNG" ${item.priority === 'BÌNH THƯỜNG' ? 'selected' : ''}>🟢 Bình thường</option>
              <option value="TRUNG BÌNH" ${item.priority === 'TRUNG BÌNH' ? 'selected' : ''}>🟡 Trung bình</option>
              <option value="CAO" ${item.priority === 'CAO' ? 'selected' : ''}>🟠 Cao</option>
              <option value="KHẨN CẤP" ${item.priority === 'KHẨN CẤP' ? 'selected' : ''}>🔴 Khẩn cấp</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">Chỉ đạo / Ghi chú giao việc:</label>
          <input type="text" id="assign-note-input" class="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium" placeholder="Ví dụ: Kiểm tra gấp trong buổi sáng..." value="${item.assignmentNote || ''}">
        </div>

        <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5">
          <i class="fa-solid fa-paper-plane"></i>
          <span>XÁC NHẬN GIAO VIỆC</span>
        </button>
      </form>
    `;
  },

  // ==========================================
  // RENDER DÒNG THỜI GIAN (TIMELINE)
  // ==========================================
  renderTimeline(item) {
    const history = item.history || [];
    if (history.length === 0) {
      return `
        <div class="relative pb-2">
          <div class="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs"></div>
          <div class="text-xs">
            <span class="font-bold text-slate-800">${Utils.formatDateTime(item.createdAt)}</span>
            <span class="text-slate-500 font-medium block">Người gửi <strong>${item.senderName || 'Người dùng'}</strong> tạo phản ánh ban đầu.</span>
          </div>
        </div>
      `;
    }

    return history.map((h, idx) => {
      const isLast = idx === history.length - 1;
      return `
        <div class="relative pb-3">
          <div class="absolute -left-[23px] top-1 w-3 h-3 rounded-full ${isLast ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-400'} border-2 border-white shadow-xs"></div>
          <div class="text-xs space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] text-slate-400 font-bold">${Utils.formatDateTime(h.timestamp)}</span>
              <span class="font-extrabold text-slate-900">${h.actorName || 'Hệ thống'}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">${AuthService.getRoleLabel(h.actorRole)}</span>
            </div>
            <p class="font-bold text-blue-900">${h.action}: <span class="font-medium text-slate-700">${h.details || ''}</span></p>
            ${h.note ? `<p class="text-slate-500 italic">"${h.note}"</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // TAB 2: TRAO ĐỔI TRỰC TIẾP (LIVE CHAT)
  // ==========================================
  renderCommentsTab(targetType) {
    const item = this.currentData;
    const comments = item.comments || [];
    const currentUser = AuthService.getCurrentUser();
    const status = item.status || 'CHỜ PHÂN CÔNG';
    const isOverdue = item.isOverdue || false;

    return `
      <div class="flex flex-col h-[520px] max-w-2xl mx-auto">
        <!-- Thẻ tóm tắt sự cố đầu kênh trao đổi -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2.5 flex items-center justify-between gap-2 text-xs shadow-2xs">
          <div class="flex items-center gap-2 truncate">
            <span class="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">${item.code}</span>
            <span class="font-extrabold text-slate-800 truncate">${item.title}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${Utils.renderStatusBadge(status, isOverdue)}
          </div>
        </div>

        <!-- Danh sách tin nhắn trao đổi realtime -->
        <div class="flex-1 overflow-y-auto space-y-3 pr-2 mb-2" id="modal-comments-list">
          ${comments.length === 0 ? `
            <div class="text-center text-slate-400 py-12 text-xs space-y-2">
              <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mx-auto">
                <i class="fa-regular fa-comments"></i>
              </div>
              <h4 class="font-black text-slate-700 text-sm">Kênh trao đổi & phối hợp xử lý trực tiếp</h4>
              <p class="text-slate-500 max-w-sm mx-auto">Kỹ thuật viên, Trưởng phòng và Người gửi phản ánh có thể nhắn tin trao đổi trực tuyến tại đây.</p>
            </div>
          ` : comments.map(c => {
            const isMe = currentUser && (currentUser.displayName === c.authorName || currentUser.email === c.authorEmail);
            const isUrgent = !!c.isUrgent;
            const roleBadgeHtml = Utils.renderRoleBadge(c.authorRole || (c.isStaff ? 'STAFF' : 'USER'));

            return `
              <div class="flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in">
                <div class="w-8 h-8 rounded-full ${isMe ? 'bg-blue-600 text-white' : (c.isStaff ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700')} flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                  ${c.isStaff ? '<i class="fa-solid fa-screwdriver-wrench text-[10px]"></i>' : (c.authorName || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="max-w-[80%] space-y-1">
                  <div class="flex items-center gap-1.5 ${isMe ? 'justify-end' : ''} text-[11px]">
                    <span class="font-extrabold text-slate-900">${c.authorName || 'Người dùng'}</span>
                    ${roleBadgeHtml}
                    <span class="text-slate-400 text-[10px]">${Utils.timeAgo(c.createdAt)}</span>
                  </div>
                  <div class="p-3 rounded-2xl text-xs leading-relaxed ${
                    isUrgent
                      ? 'bg-red-50 text-red-950 border-2 border-red-400 shadow-xs'
                      : (isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-xs' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200')
                  }">
                    ${isUrgent ? `
                      <div class="flex items-center gap-1 text-[11px] font-black text-red-700 mb-1">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>🚨 YÊU CẦU GẤP TỪ NGƯỜI GỬI:</span>
                      </div>
                    ` : ''}
                    ${c.content}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Phản hồi nhanh (Quick Canned Replies) -->
        <div class="py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span class="text-[10px] font-bold text-slate-400 shrink-0">⚡ Trả lời nhanh:</span>
          <button type="button" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer" onclick="TaskModalComponent.fillQuickReply('Kỹ thuật viên đang di chuyển tới vị trí để xử lý ngay nhé!')">
            Đang tới xử lý ngay
          </button>
          <button type="button" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer" onclick="TaskModalComponent.fillQuickReply('Đã tiếp nhận yêu cầu gấp, bộ phận kỹ thuật đang ưu tiên kiểm tra.')">
            Đã nhận tin gấp
          </button>
          <button type="button" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer" onclick="TaskModalComponent.fillQuickReply('Bạn vui lòng giữ nguyên hiện trạng thiết bị để kỹ thuật kiểm tra nhé.')">
            Giữ nguyên hiện trạng
          </button>
          <button type="button" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer" onclick="TaskModalComponent.fillQuickReply('Đã khắc phục xong, bạn vui lòng kiểm tra lại thiết bị giúp mình nhé!')">
            Đã khắc phục xong
          </button>
        </div>

        <!-- Ô nhập tin nhắn trao đổi -->
        <form class="flex items-center gap-2 pt-2 border-t border-slate-200" onsubmit="TaskModalComponent.handleCommentSubmit(event)">
          <input type="text" id="comment-text-input" class="flex-1 text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs" placeholder="Nhập tin nhắn phản hồi cho người gửi..." required autocomplete="off">
          <button type="submit" class="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors">
            <i class="fa-solid fa-paper-plane"></i>
            <span>Gửi</span>
          </button>
        </form>
      </div>
    `;
  },

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  async handleAssignSubmit(e) {
    e.preventDefault();
    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    const managerSelect = document.getElementById('assign-manager-select');
    const techSelect = document.getElementById('assign-tech-select');
    const prioritySelect = document.getElementById('assign-priority-select');
    const deadlineInput = document.getElementById('assign-deadline-input');
    const noteInput = document.getElementById('assign-note-input');

    const managerId = managerSelect ? managerSelect.value : (item.assignedManagerId || null);
    const managerName = managerSelect && managerSelect.selectedIndex > 0 ? managerSelect.options[managerSelect.selectedIndex].getAttribute('data-name') : (item.assignedManagerName || null);

    const techId = techSelect ? techSelect.value : (item.assignedTo || null);
    const techName = techSelect && techSelect.selectedIndex > 0 ? techSelect.options[techSelect.selectedIndex].getAttribute('data-name') : (item.assignedToName || null);
    const techRole = techSelect && techSelect.selectedIndex > 0 ? techSelect.options[techSelect.selectedIndex].getAttribute('data-role') : 'STAFF';

    if (!managerId && !techId) {
      Utils.showToast('Vui lòng chọn Phó phòng điều phối hoặc Kỹ thuật viên thực hiện!', 'warning');
      return;
    }

    const payload = {
      managerId,
      managerName,
      managerRole: 'DEPUTY_MANAGER',
      technicianId: techId,
      technicianName: techName,
      technicianRole: techRole,
      priority: prioritySelect ? prioritySelect.value : item.priority,
      deadline: deadlineInput ? deadlineInput.value : item.deadline,
      assignmentNote: noteInput ? noteInput.value.trim() : '',
      code: item.code
    };

    try {
      await ApiService.assignTask(item.id || item.code, targetType, payload);

      // Cập nhật client item state
      item.assignedManagerId = managerId;
      item.assignedManagerName = managerName;
      item.assignedTo = techId;
      item.assignedToName = techName;
      item.status = 'ĐÃ PHÂN CÔNG';
      if (payload.priority) item.priority = payload.priority;
      if (payload.deadline) item.deadline = payload.deadline;
      if (payload.assignmentNote) item.assignmentNote = payload.assignmentNote;

      RealtimeService.handleIncomingReport(item);
      SoundService.playSuccess();
      Utils.showToast('Đã phân công công việc thành công!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi khi phân công: ' + err.message, 'error');
    }
  },

  async acceptTask() {
    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: 'ĐANG XỬ LÝ',
        note: 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường.',
        code: item.code
      });

      item.status = 'ĐANG XỬ LÝ';
      item.acceptedAt = new Date().toISOString();

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playChime();
      Utils.showToast('Bạn đã tiếp nhận và bắt đầu xử lý công việc!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async handleProgressSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const item = this.currentData;
    const note = document.getElementById('progress-note-input')?.value || '';
    const materials = document.getElementById('materials-used-input')?.value || '';
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: item.status,
        note: note,
        materialsUsed: materials,
        code: item.code
      });

      item.latestNote = note;
      item.materialsUsed = materials;

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playSuccess();
      Utils.showToast('Đã lưu tiến độ xử lý thành công!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi lưu tiến độ: ' + err.message, 'error');
    }
  },

  async submitForReview() {
    const confirm = await Utils.confirmModal('Xác nhận hoàn thành', 'Bạn có chắc chắn đã kiểm tra xử lý xong và muốn gửi yêu cầu nghiệm thu cho Lãnh đạo / Trưởng phòng?');
    if (!confirm) return;

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';
    const note = document.getElementById('progress-note-input')?.value || 'Đã hoàn thành công việc hiện trường, chuyển chờ Trưởng phòng nghiệm thu.';
    const materials = document.getElementById('materials-used-input')?.value || '';

    // Đọc ảnh sau khi xử lý nếu có chọn tệp
    const photoInput = document.getElementById('after-photo-input');
    let afterPhotos = item.afterPhotos || [];
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
      try {
        const uploadRes = await ApiService.uploadFiles(photoInput.files);
        if (uploadRes && uploadRes.files) {
          const newUrls = uploadRes.files.map(f => f.url);
          afterPhotos = [...afterPhotos, ...newUrls];
        }
      } catch (uploadErr) {
        console.warn('Lỗi upload ảnh nghiệm thu:', uploadErr);
      }
    }

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: 'CHỜ NGHIỆM THU',
        note: note,
        afterPhotos: afterPhotos,
        materialsUsed: materials,
        code: item.code
      });

      item.status = 'CHỜ NGHIỆM THU';
      item.latestNote = note;
      item.afterPhotos = afterPhotos;
      item.materialsUsed = materials;
      item.submittedForReviewAt = new Date().toISOString();

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playSuccess();
      Utils.showToast('Đã gửi yêu cầu nghiệm thu và báo cáo về Telegram thành công!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async approveReview() {
    const confirm = await Utils.confirmModal('Duyệt nghiệm thu', 'Xác nhận công việc đã hoàn thành đúng chất lượng kỹ thuật?', 'Duyệt hoàn thành', 'bg-emerald-600 hover:bg-emerald-700');
    if (!confirm) return;

    const item = this.currentData;
    const note = document.getElementById('review-note-input')?.value || 'Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao.';
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.reviewTask(item.id || item.code, targetType, {
        code: item.code,
        approved: true,
        note: note
      });

      item.status = 'HOÀN THÀNH';
      item.completedAt = new Date().toISOString();
      item.reviewNote = note;

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playSuccess();
      Utils.showToast('Đã duyệt hoàn thành công việc và gửi thông báo Telegram!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async rejectReview() {
    const reason = document.getElementById('review-note-input')?.value;
    if (!reason || !reason.trim()) {
      Utils.showToast('Vui lòng nhập lý do chưa đạt yêu cầu vào ô ghi chú!', 'warning');
      document.getElementById('review-note-input')?.focus();
      return;
    }

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.reviewTask(item.id || item.code, targetType, {
        code: item.code,
        approved: false,
        rejectionReason: reason.trim()
      });

      item.status = 'ĐANG XỬ LÝ';
      item.rejectionReason = reason.trim();

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playChime();
      Utils.showToast('Đã gửi yêu cầu xử lý lại kèm lý do cho kỹ thuật viên.', 'info');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  fillQuickReply(text) {
    const input = document.getElementById('comment-text-input');
    if (input) {
      input.value = text;
      input.focus();
    }
  },

  async handleCommentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('comment-text-input');
    const content = (input ? input.value : '').trim();
    if (!content) return;

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      const res = await ApiService.addComment(item.id || item.code, targetType, {
        targetCode: item.code,
        content: content,
        isStaff: true
      });

      if (!item.comments) item.comments = [];
      item.comments.push(res.data);
      if (input) input.value = '';
      
      SoundService.playSuccess();
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi gửi tin nhắn: ' + err.message, 'error');
    }
  },

  async unassignCurrentTask() {
    if (!confirm('Bạn có chắc chắn muốn hủy phân công công việc này và đưa về danh sách Chờ phân công?')) return;
    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.unassignTask(item.id || item.code, targetType);
      item.assignedTo = null;
      item.assignedToName = null;
      item.assignedManagerId = null;
      item.assignedManagerName = null;
      item.status = 'CHỜ PHÂN CÔNG';

      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      Utils.showToast('Đã hủy phân công thành công!', 'info');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi hủy phân công: ' + err.message, 'error');
    }
  },

  async deleteCurrentItem() {
    if (!AuthService.canDeleteTask()) {
      Utils.showToast('Từ chối quyền: Chỉ Quản trị viên Super Admin mới có quyền xóa task khỏi hệ thống!', 'warning');
      return;
    }

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    if (!confirm(`XÁC NHẬN XÓA (SUPER ADMIN):\nBạn có chắc chắn muốn xóa vĩnh viễn phiếu [${item.code}] khỏi cơ sở dữ liệu Cloud Firestore?`)) return;

    try {
      await ApiService.deleteTaskOrReport(item.id || item.code, targetType);

      if (targetType === 'TASK') {
        RealtimeService.tasks = RealtimeService.tasks.filter(t => t.id !== item.id && t.code !== item.code);
        RealtimeService.notifyTaskListeners();
      } else {
        RealtimeService.reports = RealtimeService.reports.filter(r => r.id !== item.id && r.code !== item.code);
        RealtimeService.notifyReportListeners();
      }

      Utils.showToast(`Đã xóa phiếu ${item.code} thành công khỏi hệ thống!`, 'success');
      this.close();
    } catch (err) {
      Utils.showToast('Lỗi khi xóa: ' + err.message, 'error');
    }
  },

  // Direct actions cho card ngoài danh sách
  async acceptTaskDirect(targetId, targetCode, targetType) {
    try {
      await ApiService.updateTaskStatus(targetId || targetCode, targetType, {
        status: 'ĐANG XỬ LÝ',
        note: 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường.',
        code: targetCode
      });
      SoundService.playChime();
      Utils.showToast(`Đã tiếp nhận xử lý [${targetCode}]!`, 'success');
    } catch (e) {
      Utils.showToast('Lỗi tiếp nhận: ' + e.message, 'error');
    }
  },

  async submitForReviewDirect(targetId, targetCode, targetType) {
    const ok = await Utils.confirmModal('Gửi nghiệm thu', `Xác nhận bạn đã xử lý xong và muốn gửi Chờ nghiệm thu cho phiếu [${targetCode}]?`);
    if (!ok) return;
    try {
      await ApiService.updateTaskStatus(targetId || targetCode, targetType, {
        status: 'CHỜ NGHIỆM THU',
        note: 'Kỹ thuật viên báo cáo đã xử lý xong, chuyển chờ nghiệm thu.'
      });
      SoundService.playSuccess();
      Utils.showToast(`Đã gửi Chờ nghiệm thu cho phiếu [${targetCode}]!`, 'success');
    } catch (e) {
      Utils.showToast('Lỗi gửi nghiệm thu: ' + e.message, 'error');
    }
  },

  async approveReviewDirect(targetId, targetCode, targetType) {
    if (!AuthService.isManager()) {
      Utils.showToast('Chỉ Trưởng phòng hoặc Quản trị viên mới có quyền duyệt hoàn thành!', 'warning');
      return;
    }
    const ok = await Utils.confirmModal('Duyệt nghiệm thu', `Xác nhận duyệt nghiệm thu hoàn thành phiếu [${targetCode}]?`, 'Duyệt hoàn thành', 'bg-emerald-600 hover:bg-emerald-700');
    if (!ok) return;
    try {
      await ApiService.reviewTask(targetId || targetCode, targetType, {
        approved: true,
        note: 'Đã nghiệm thu đạt chuẩn kỹ thuật.'
      });
      SoundService.playSuccess();
      Utils.showToast(`Đã duyệt hoàn thành phiếu [${targetCode}]!`, 'success');
    } catch (e) {
      Utils.showToast('Lỗi duyệt: ' + e.message, 'error');
    }
  }
};

window.TaskModalComponent = TaskModalComponent;
