/**
 * NSG SUPPORT - COMPREHENSIVE TASK & REPORT DETAIL MODAL
 * Bao gồm: Thông tin, Phân công, Tiến độ xử lý, Ảnh trước/sau, Nghiệm thu, Trao đổi và Lịch sử
 */

const TaskModalComponent = {
  currentData: null,
  activeTab: 'comments',

  async open(targetId, code, targetType = 'REPORT', defaultTab = 'comments') {
    this.activeTab = defaultTab;

    // Tìm dữ liệu trong cache realtime trước để hiển thị ngay lập tức
    let item = null;
    if (targetType === 'TASK') {
      item = RealtimeService.tasks.find(t => t.id === targetId || t.code === code);
    } else {
      item = RealtimeService.reports.find(r => r.id === targetId || r.code === code);
    }

    if (!item) {
      // Fetch từ API nếu không có trong cache
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
  },

  close() {
    const modal = document.getElementById('task-detail-modal');
    if (modal) modal.remove();
  },

  setTab(tabName) {
    this.activeTab = tabName;
    this.renderModal();
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
    const isManager = AuthService.isManager(); // Chỉ Trưởng phòng, Admin, Super Admin, Phó Trưởng phòng
    const canAssign = isManager;
    const canUpdateProgress = true; // KTV và Quản lý xem & cập nhật tiến độ
    const canReview = isManager; // CHỈ Trưởng phòng / Phó Trưởng phòng / Super Admin mới có quyền duyệt hoàn thành
    const canDelete = AuthService.canDeleteTask(); // DUY NHẤT Super Admin mới có quyền xóa task/phiếu

    const modal = document.createElement('div');
    modal.id = 'task-detail-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fade-in';

    modal.innerHTML = `
      <div class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <!-- Modal Header -->
        <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-black px-2.5 py-1 rounded-md bg-blue-600 text-white">
              ${item.code}
            </span>
            <span class="text-sm font-semibold text-slate-300">
              ${isReport ? 'Phiếu phản ánh sự cố' : 'Nhiệm vụ công việc nội bộ'}
            </span>
            ${Utils.renderPriorityBadge(priority)}
            ${Utils.renderStatusBadge(status, isOverdue)}
          </div>
          <button class="text-slate-400 hover:text-white text-xl p-1 cursor-pointer" onclick="TaskModalComponent.close()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Stepper Timeline (Workflow 5 bước) -->
        <div class="bg-slate-50 px-6 py-3 border-b border-slate-200 overflow-x-auto">
          <div class="flex items-center justify-between min-w-[550px] text-xs font-semibold">
            ${this.renderStepperStep('MỚI', 'fa-file-circle-plus', ['MỚI', 'CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 bg-slate-200 mx-2"></div>
            ${this.renderStepperStep('CHỜ PHÂN CÔNG', 'fa-hourglass-start', ['CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 bg-slate-200 mx-2"></div>
            ${this.renderStepperStep('ĐÃ PHÂN CÔNG', 'fa-user-check', ['ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 bg-slate-200 mx-2"></div>
            ${this.renderStepperStep('ĐANG XỬ LÝ', 'fa-screwdriver-wrench', ['ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 bg-slate-200 mx-2"></div>
            ${this.renderStepperStep('CHỜ NGHIỆM THU', 'fa-clipboard-check', ['CHỜ NGHIỆM THU', 'HOÀN THÀNH'].indexOf(status) >= 0)}
            <div class="flex-1 h-0.5 bg-slate-200 mx-2"></div>
            ${this.renderStepperStep('HOÀN THÀNH', 'fa-circle-check', status === 'HOÀN THÀNH')}
          </div>
        </div>

        <!-- Navigation Tabs: TAB TRAO ĐỔI XỬ LÝ ĐƯỢC ƯU TIÊN LÊN ĐẦU TIÊN -->
        <div class="flex items-center border-b border-slate-200 px-6 bg-white overflow-x-auto text-sm font-semibold">
          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'comments' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('comments')">
            <i class="fa-solid fa-comments text-blue-600"></i>
            <span>Trao đổi xử lý</span>
            ${(item.comments && item.comments.length > 0) ? `<span class="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">${item.comments.length}</span>` : ''}
          </button>
          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'details' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('details')">
            <i class="fa-solid fa-circle-info"></i>
            <span>Thông tin chi tiết</span>
          </button>
          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'progress' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('progress')">
            <i class="fa-solid fa-screwdriver-wrench"></i>
            <span>Tiến độ & Ảnh xử lý</span>
          </button>
          ${canAssign ? `
            <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'assign' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('assign')">
              <i class="fa-solid ${item.assignedTo ? 'fa-user-pen text-indigo-600' : 'fa-user-plus'}"></i>
              <span>${item.assignedTo ? `Sửa phân công (${item.assignedToName})` : 'Phân công'}</span>
            </button>
          ` : ''}
          ${canReview ? `
            <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'review' ? 'border-purple-600 text-purple-600 bg-purple-50/50 font-bold' : 'border-transparent text-purple-600 hover:text-purple-700'}" onclick="TaskModalComponent.setTab('review')">
              <i class="fa-solid fa-stamp"></i>
              <span>Nghiệm thu</span>
              ${status === 'CHỜ NGHIỆM THU' ? '<span class="px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black animate-pulse">Cần duyệt</span>' : ''}
            </button>
          ` : ''}
          <button class="py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${this.activeTab === 'logs' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick="TaskModalComponent.setTab('logs')">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Lịch sử thao tác</span>
          </button>
        </div>

        <!-- Modal Body Dynamic by Tab -->
        <div class="flex-1 overflow-y-auto p-6 text-slate-800">
          ${this.renderTabContent(targetType)}
        </div>

        <!-- Modal Footer -->
        <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div class="text-xs text-slate-500">
            Ngày tạo: ${Utils.formatDateTime(item.createdAt)} ${item.completedAt ? `| Hoàn thành: ${Utils.formatDateTime(item.completedAt)}` : ''}
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

    // Tự động cuộn xuống cuối danh sách tin nhắn trao đổi
    if (this.activeTab === 'comments') {
      setTimeout(() => {
        const box = document.getElementById('modal-comments-list');
        if (box) box.scrollTop = box.scrollHeight;
        const input = document.getElementById('comment-text-input');
        if (input) input.focus();
      }, 50);
    }
  },

  renderStepperStep(label, icon, isCompleted) {
    return `
      <div class="flex items-center gap-1.5 ${isCompleted ? 'text-blue-600 font-bold' : 'text-slate-400'}">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isCompleted ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'}">
          <i class="fa-solid ${icon}"></i>
        </div>
        <span>${label}</span>
      </div>
    `;
  },

  renderTabContent(targetType) {
    const item = this.currentData;
    const currentUser = AuthService.getCurrentUser();
    const isManager = AuthService.isManager();
    const status = item.status || 'CHỜ PHÂN CÔNG';
    const isOverdue = item.isOverdue || false;

    // ==========================================
    // TAB 1: TRAO ĐỔI XỬ LÝ (KÊNH TRỰC TIẾP ĐẦU TIÊN)
    // ==========================================
    if (this.activeTab === 'comments') {
      const comments = item.comments || [];
      return `
        <div class="flex flex-col h-[460px] max-w-2xl mx-auto">
          <!-- Thẻ tóm tắt sự cố đầu kênh trao đổi -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 truncate">
              <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">${item.code}</span>
              <span class="font-bold text-slate-800 truncate">${item.title}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${Utils.renderStatusBadge(status, isOverdue)}
            </div>
          </div>

          <!-- Danh sách tin nhắn trao đổi realtime -->
          <div class="flex-1 overflow-y-auto space-y-3 pr-2 mb-3" id="modal-comments-list">
            ${comments.length === 0 ? `
              <div class="text-center text-slate-400 py-12 text-xs space-y-2">
                <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mx-auto">
                  <i class="fa-regular fa-comments"></i>
                </div>
                <h4 class="font-bold text-slate-700 text-sm">Kênh trao đổi & phối hợp xử lý trực tiếp</h4>
                <p class="text-slate-500 max-w-sm mx-auto">Kỹ thuật viên, Trưởng phòng và Người gửi có thể chat trao đổi trực tiếp mọi vấn đề tại đây.</p>
              </div>
            ` : comments.map(c => {
              const isMe = currentUser && (currentUser.displayName === c.authorName || currentUser.email === c.authorEmail);
              const roleBadge = c.authorRole === 'SUPER_ADMIN' ? 'Super Admin' :
                                c.authorRole === 'MANAGER' ? 'Trưởng phòng' :
                                c.authorRole === 'STAFF' ? 'Kỹ thuật viên' : 'Người gửi';
              const roleColor = c.authorRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                c.authorRole === 'MANAGER' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                c.authorRole === 'STAFF' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-200 text-slate-700 border-slate-300';
              return `
                <div class="flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}">
                  <div class="w-8 h-8 rounded-full ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                    ${(c.authorName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div class="max-w-[78%] space-y-1">
                    <div class="flex items-center gap-1.5 ${isMe ? 'justify-end' : ''} text-[11px]">
                      <span class="font-bold text-slate-900">${c.authorName || 'Người dùng'}</span>
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleColor}">${roleBadge}</span>
                      <span class="text-slate-400 text-[10px]">${Utils.timeAgo(c.createdAt)}</span>
                    </div>
                    <div class="p-3 rounded-2xl text-xs leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-xs' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}">
                      ${c.content}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Ô nhập tin nhắn trao đổi -->
          <form class="flex items-center gap-2 pt-2 border-t border-slate-200" onsubmit="TaskModalComponent.handleCommentSubmit(event)">
            <input type="text" id="comment-text-input" class="flex-1 text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs" placeholder="Nhập tin nhắn trao đổi phối hợp xử lý..." required autocomplete="off">
            <button type="submit" class="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Gửi</span>
            </button>
          </form>
        </div>
      `;
    }

    // ==========================================
    // TAB 2: THÔNG TIN CHI TIẾT
    // ==========================================
    if (this.activeTab === 'details') {
      return `
        <div class="space-y-6">
          <!-- Title & Description -->
          <div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">${item.title}</h3>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              ${item.description || 'Không có mô tả.'}
            </div>
          </div>

          <!-- Key Grid Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2 text-xs">
              <div class="font-bold text-blue-900 text-sm mb-1 flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-blue-600"></i> Thông tin người gửi / Giao việc
              </div>
              <div><span class="text-slate-500">Họ và tên:</span> <strong class="text-slate-800">${item.senderName || 'Lãnh đạo / Hệ thống'}</strong></div>
              <div><span class="text-slate-500">Khoa / Phòng ban:</span> <strong class="text-slate-800">${item.senderDept || item.departmentName || 'Chưa rõ'}</strong></div>
              <div><span class="text-slate-500">Số điện thoại:</span> <strong class="text-slate-800">${item.senderPhone || 'Không có'}</strong></div>
              <div><span class="text-slate-500">Email:</span> <strong class="text-slate-800">${item.senderEmail || 'Không có'}</strong></div>
            </div>

            <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2 text-xs">
              <div class="font-bold text-indigo-900 text-sm mb-1 flex items-center gap-2">
                <i class="fa-solid fa-location-crosshairs text-indigo-600"></i> Địa điểm & Phụ trách
              </div>
              <div><span class="text-slate-500">Địa điểm:</span> <strong class="text-slate-800">${item.location || 'Khuôn viên'}</strong></div>
              <div><span class="text-slate-500">Phòng / Khu vực:</span> <strong class="text-slate-800">${item.room || 'Toàn bộ'}</strong></div>
              ${item.assignedByManager ? `<div><span class="text-slate-500">Trưởng phòng giao:</span> <strong class="text-blue-700">${item.assignedByManager}</strong></div>` : ''}
              ${item.deputyCoordinator ? `<div><span class="text-slate-500">Phó phòng điều phối:</span> <strong class="text-purple-700">${item.deputyCoordinator}</strong></div>` : ''}
              <div><span class="text-slate-500">KTV phụ trách:</span> <strong class="text-indigo-700">${item.assignedToName || 'Chưa phân công'}</strong></div>
              <div><span class="text-slate-500">Hạn chót (Deadline):</span> <strong class="text-slate-800">${item.deadline ? Utils.formatDateTime(item.deadline) : 'Không'}</strong></div>
            </div>
          </div>

          <!-- Attachments Gallery -->
          ${item.attachments && item.attachments.length > 0 ? `
            <div>
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tệp và hình ảnh đính kèm (${item.attachments.length})</h4>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${item.attachments.map(att => `
                  <a href="${att.url || att}" target="_blank" class="group block border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all bg-slate-50">
                    ${(att.mimetype || '').startsWith('image/') || (typeof att === 'string' && (att.endsWith('.jpg') || att.endsWith('.png') || att.endsWith('.jpeg'))) ? `
                      <img src="${att.url || att}" class="w-full h-28 object-cover group-hover:scale-105 transition-transform">
                    ` : `
                      <div class="h-28 flex flex-col items-center justify-center p-3 text-slate-500">
                        <i class="fa-solid fa-file-lines text-3xl text-blue-600 mb-1"></i>
                        <span class="text-[11px] truncate w-full text-center font-medium">${att.name || 'Tài liệu đính kèm'}</span>
                      </div>
                    `}
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Rating result if completed -->
          ${item.rating ? `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs">
              <div class="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-star text-amber-500"></i> Đánh giá của người dùng sau khi hoàn thành
              </div>
              <div class="flex items-center gap-1 text-amber-500 text-base my-1">
                ${[1, 2, 3, 4, 5].map(star => `<i class="fa-solid fa-star ${star <= item.rating ? 'text-amber-500' : 'text-slate-300'}"></i>`).join('')}
                <span class="text-xs font-bold text-slate-700 ml-2">(${item.rating}/5 sao)</span>
              </div>
              <p class="text-slate-700 italic">"${item.feedback || 'Rất hài lòng với chất lượng phục vụ.'}"</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    // ==========================================
    // TAB 3: TIẾN ĐỘ & ẢNH XỬ LÝ (KỸ THUẬT VIÊN)
    // ==========================================
    if (this.activeTab === 'progress') {
      return `
        <div class="space-y-6 max-w-2xl mx-auto">
          <!-- Trạng thái 1: ĐÃ PHÂN CÔNG -> Bấm Nhận việc -->
          ${status === 'ĐÃ PHÂN CÔNG' ? `
            <div class="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
              <div>
                <h4 class="font-black text-sm text-indigo-950 flex items-center gap-2">
                  <i class="fa-solid fa-play text-indigo-600"></i>
                  <span>Bắt đầu xử lý hiện trường</span>
                </h4>
                <p class="text-xs text-indigo-700 mt-1">Xác nhận bạn đã tiếp nhận công việc này và bắt đầu kiểm tra khắc phục sự cố.</p>
              </div>
              <button type="button" class="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg shrink-0" onclick="TaskModalComponent.acceptTask()">
                <i class="fa-solid fa-hand-holding-hand text-sm"></i>
                <span>BẮT ĐẦU XỬ LÝ NGAY</span>
              </button>
            </div>
          ` : ''}

          <!-- Trạng thái 2: CHỜ NGHIỆM THU -> KTV CHỜ TRƯỞNG PHÒNG DUYỆT -->
          ${status === 'CHỜ NGHIỆM THU' ? `
            <div class="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center space-y-3 shadow-2xs">
              <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mx-auto">
                <i class="fa-solid fa-hourglass-half"></i>
              </div>
              <h4 class="font-black text-base text-purple-950">Công việc đang ở trạng thái CHỜ NGHIỆM THU</h4>
              <p class="text-xs text-purple-700 max-w-md mx-auto">
                Kỹ thuật viên đã báo cáo hoàn tất xử lý hiện trường. Đang chờ <b>Trưởng phòng Kỹ thuật</b> kiểm tra và duyệt nghiệm thu để chính thức hoàn thành.
              </p>
              ${isManager ? `
                <button type="button" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 hover:shadow-lg" onclick="TaskModalComponent.setTab('review')">
                  <i class="fa-solid fa-stamp"></i>
                  <span>Mở tab Nghiệm thu để duyệt ngay</span>
                </button>
              ` : `
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                  <i class="fa-solid fa-clock"></i> Đang chờ Trưởng phòng duyệt nghiệm thu
                </div>
              `}
            </div>
          ` : ''}

          <!-- Trạng thái 3: HOÀN THÀNH -->
          ${status === 'HOÀN THÀNH' ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2 shadow-2xs">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <h4 class="font-black text-base text-emerald-950">Công việc đã được nghiệm thu và HOÀN THÀNH!</h4>
              <p class="text-xs text-emerald-700">Đã được Trưởng phòng kiểm tra đạt tiêu chuẩn chất lượng.</p>
            </div>
          ` : ''}

          <!-- Form cập nhật tiến độ & Nút Gửi Chờ Nghiệm Thu cho KTV -->
          <form id="form-update-progress" class="space-y-4" onsubmit="TaskModalComponent.handleProgressSubmit(event)">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Ghi chép nhật ký xử lý hiện trường</label>
              <textarea id="progress-note-input" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Ghi chép: Đã đo nguồn điện, thay jack kết nối, vệ sinh thiết bị và kiểm tra vận hành...">${item.latestNote || ''}</textarea>
            </div>

            <!-- Upload Before & After Photos -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <i class="fa-solid fa-camera text-slate-500"></i> Ảnh TRƯỚC khi xử lý
                </label>
                <input type="file" id="before-photo-input" accept="image/*" class="text-xs text-slate-600 w-full mb-2">
                <div id="before-photos-preview" class="flex gap-2 flex-wrap">
                  ${(item.beforePhotos || []).map(url => `<img src="${url}" class="w-16 h-16 object-cover rounded-lg border">`).join('')}
                </div>
              </div>

              <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <i class="fa-solid fa-camera-retro text-emerald-600"></i> Ảnh SAU khi xử lý
                </label>
                <input type="file" id="after-photo-input" accept="image/*" class="text-xs text-slate-600 w-full mb-2">
                <div id="after-photos-preview" class="flex gap-2 flex-wrap">
                  ${(item.afterPhotos || []).map(url => `<img src="${url}" class="w-16 h-16 object-cover rounded-lg border">`).join('')}
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button type="submit" class="w-full sm:w-auto flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Lưu cập nhật tiến độ</span>
              </button>

              ${status !== 'HOÀN THÀNH' && status !== 'CHỜ NGHIỆM THU' ? `
                <button type="button" class="w-full sm:w-auto flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg" onclick="TaskModalComponent.submitForReview()">
                  <i class="fa-solid fa-clipboard-check text-sm"></i>
                  <span>HOÀN TẤT XỬ LÝ ➔ GỬI CHỜ NGHIỆM THU</span>
                </button>
              ` : ''}
            </div>
          </form>
        </div>
      `;
    }

    // ==========================================
    // TAB 4: PHÂN CÔNG (TRƯỞNG PHÒNG ➔ PHÓ PHÒNG ➔ KỸ THUẬT VIÊN)
    // ==========================================
    if (this.activeTab === 'assign') {
      const allStaff = (this.staffList && this.staffList.length > 0) ? this.staffList : [];
      const isSuperAdmin = AuthService.isSuperAdmin();
      const isDeputy = AuthService.isDeputyManager();
      const isHead = AuthService.isDepartmentHead();

      // Danh sách Phó phòng
      const deputyList = allStaff.filter(s => s.role === 'DEPUTY_MANAGER');
      // Danh sách Kỹ thuật viên (Khoa & KTX)
      const technicianList = allStaff.filter(s => s.role === 'STAFF' || s.role === 'STAFF_KTX');

      // Xác định danh sách nhân sự hiển thị
      // Nếu là Phó phòng: CHỈ được chọn Kỹ thuật viên (1-2-3 người)
      // Nếu là Trưởng phòng/Super Admin: Có thể giao Phó phòng hoặc giao trực tiếp KTV
      const eligibleStaff = isDeputy ? technicianList : (isHead || isSuperAdmin ? [...deputyList, ...technicianList] : technicianList);

      setTimeout(() => this.updateAssignSelectionCount(), 50);

      return `
        <form id="form-assign-task" class="space-y-4 max-w-xl mx-auto" onsubmit="TaskModalComponent.handleAssignSubmit(event)">
          <!-- Banner vai trò điều phối -->
          ${isDeputy ? `
            <div class="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-1.5 shadow-2xs">
              <div class="flex items-center gap-2 text-purple-900 font-extrabold text-xs uppercase tracking-wide">
                <i class="fa-solid fa-user-shield text-purple-600"></i>
                <span>GIAO DIỆN ĐIỀU PHỐI DÀNH CHO PHÓ TRƯỞNG PHÒNG</span>
              </div>
              <p class="text-xs text-purple-800 leading-relaxed">
                ${item.assignedByManager ? `Trưởng phòng (<b>${item.assignedByManager}</b>) đã giao việc này cho bạn điều phối. ` : ''}
                Vui lòng tick chọn <b>1, 2 hoặc 3 Kỹ thuật viên</b> bên dưới để giao việc triển khai hiện trường.
              </p>
              ${item.assignmentNote ? `
                <div class="bg-white p-2.5 rounded-xl border border-purple-100 text-xs text-slate-700 italic mt-1">
                  <b>Chỉ đạo từ Trưởng phòng:</b> "${item.assignmentNote}"
                </div>
              ` : ''}
            </div>
          ` : isHead ? `
            <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1 shadow-2xs">
              <div class="font-extrabold flex items-center gap-2">
                <i class="fa-solid fa-sitemap text-blue-600"></i>
                <span>QUY TRÌNH PHÂN CÔNG CÔNG VIỆC CỦA TRƯỞNG PHÒNG</span>
              </div>
              <p class="text-blue-800">
                • <b>Cách 1:</b> Tick chọn <b>Phó Trưởng phòng</b> để giao điều phối (Phó phòng sẽ phân tiếp cho 1-2-3 KTV).<br>
                • <b>Cách 2:</b> Tick chọn trực tiếp <b>1, 2 hoặc 3 Kỹ thuật viên</b> để làm việc ngay.
              </p>
            </div>
          ` : ''}

          ${item.assignedToName ? `
            <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div>
                <span class="text-slate-500 font-medium">Nhân sự hiện đang phụ trách:</span>
                <span class="font-black text-indigo-950 block text-sm mt-0.5 flex items-center gap-1.5">
                  <i class="fa-solid fa-users text-indigo-600"></i>
                  <span>${item.assignedToName}</span>
                </span>
                ${item.deputyCoordinator ? `<span class="text-[10px] text-purple-700 font-bold block mt-0.5">Phó phòng điều phối: ${item.deputyCoordinator}</span>` : ''}
              </div>
              <button type="button" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5" onclick="TaskModalComponent.unassignCurrentTask()">
                <i class="fa-solid fa-user-xmark"></i>
                <span>Hủy phân công</span>
              </button>
            </div>
          ` : ''}

          <!-- Danh sách nhân sự có thể phân công -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-bold text-slate-800">
                ${isDeputy ? 'Chọn Kỹ thuật viên thực hiện (1, 2 hoặc 3 người)' : 'Chọn nhân sự phụ trách (Phó phòng hoặc Kỹ thuật viên)'} <span class="text-red-500">*</span>
              </label>
              <span id="assign-selected-count" class="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                Chưa chọn
              </span>
            </div>

            <div class="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1.5 bg-slate-50/50">
              ${eligibleStaff.length === 0 ? `
                <div class="p-4 text-center text-xs text-slate-400 font-medium">Chưa có nhân sự phù hợp trong hệ thống.</div>
              ` : eligibleStaff.map(s => {
                const isChecked = Utils.isTaskAssignedToUser(item, s.uid);
                const isDep = s.role === 'DEPUTY_MANAGER';
                const roleBadge = isDep ? 'Phó Trưởng phòng' : s.role === 'STAFF_KTX' ? 'KTV Ký Túc Xá' : 'Kỹ thuật viên';
                const roleColor = isDep ? 'bg-purple-100 text-purple-800 border-purple-300' : s.role === 'STAFF_KTX' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800';

                return `
                  <label class="flex items-center justify-between p-2.5 rounded-xl bg-white border ${isDep ? 'border-purple-200 hover:border-purple-400 bg-purple-50/20' : 'border-slate-200 hover:border-indigo-300'} transition-all cursor-pointer shadow-2xs hover:bg-indigo-50/30">
                    <div class="flex items-center gap-3 min-w-0">
                      <input type="checkbox" name="assign_staff_checkbox" value="${s.uid}" data-name="${s.displayName || s.email}" data-role="${s.role || 'STAFF'}" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" ${isChecked ? 'checked' : ''} onchange="TaskModalComponent.updateAssignSelectionCount()">
                      <div class="truncate">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-extrabold text-slate-900 truncate">${s.displayName || s.email}</span>
                          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleColor}">${roleBadge}</span>
                          ${isDep ? `<span class="text-[10px] text-purple-600 font-semibold">(Giao điều phối)</span>` : ''}
                        </div>
                        <span class="text-[10px] text-slate-500">${s.departmentName ? s.departmentName : 'Bộ phận Kỹ thuật'} ${s.phone ? '• SĐT: ' + s.phone : ''}</span>
                      </div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
              <select id="assign-priority-select" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold">
                <option value="KHẨN CẤP" ${item.priority === 'KHẨN CẤP' ? 'selected' : ''} class="text-red-600 font-bold">🔴 Khẩn cấp (SLA 2h)</option>
                <option value="CAO" ${item.priority === 'CAO' ? 'selected' : ''} class="text-orange-600 font-bold">🟠 Cao (SLA 8h)</option>
                <option value="TRUNG BÌNH" ${item.priority === 'TRUNG BÌNH' ? 'selected' : ''} class="text-amber-600 font-bold">🟡 Trung bình (SLA 24h)</option>
                <option value="BÌNH THƯỜNG" ${item.priority === 'BÌNH THƯỜNG' ? 'selected' : ''} class="text-emerald-600 font-bold">🟢 Bình thường (SLA 48h)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Hạn chót hoàn thành (Deadline)</label>
              <input type="datetime-local" id="assign-deadline-input" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" value="${item.deadline ? item.deadline.substring(0, 16) : ''}">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Chỉ đạo & Ghi chú nhiệm vụ</label>
            <textarea id="assign-note-input" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="${isDeputy ? 'Ghi chú cho kỹ thuật viên: Cần mang theo đồ nghề kiểm tra phòng...' : 'Ghi chú chỉ đạo cho Phó phòng / Kỹ thuật viên...'}">${item.assignmentNote || ''}</textarea>
          </div>

          <div class="pt-3">
            <button type="submit" class="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg">
              <i class="fa-solid fa-paper-plane"></i>
              <span>${isDeputy ? 'XÁC NHẬN CHỈ ĐỊNH KỸ THUẬT VIÊN' : (item.assignedToName ? 'CẬP NHẬT PHÂN CÔNG NHIỆM VỤ' : 'XÁC NHẬN PHÂN CÔNG NGAY')}</span>
            </button>
          </div>
        </form>
      `;
    }

    // ==========================================
    // TAB 5: NGHIỆM THU (CHỈ DÀNH CHO TRƯỞNG PHÒNG & SUPER ADMIN)
    // ==========================================
    if (this.activeTab === 'review') {
      if (!isManager) {
        return `
          <div class="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3 max-w-md mx-auto my-6 shadow-2xs">
            <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <h4 class="font-black text-sm text-amber-950">Quyền hạn Dành riêng cho Trưởng phòng</h4>
            <p class="text-xs text-amber-800 leading-relaxed">
              Bạn không có quyền thực hiện nghiệm thu công việc này. Chỉ Trưởng phòng hoặc Phó Trưởng phòng mới có thể duyệt hoàn thành.
            </p>
          </div>
        `;
      }

      return `
        <div class="space-y-6 max-w-xl mx-auto">
          <!-- Thông tin tóm tắt kết quả xử lý của KTV -->
          <div class="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 space-y-3">
            <div class="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
              <i class="fa-solid fa-clipboard-check text-purple-600 text-base"></i>
              <span>BÁO CÁO CỦA KỸ THUẬT VIÊN HIỆN TRƯỜNG</span>
            </div>
            <p class="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-purple-100 italic leading-relaxed">
              "${item.latestNote || 'Kỹ thuật viên đã báo cáo hoàn tất việc xử lý hiện trường.'}"
            </p>
            ${(item.afterPhotos && item.afterPhotos.length > 0) ? `
              <div>
                <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Ảnh minh chứng sau khi hoàn tất:</span>
                <div class="flex gap-2 flex-wrap">
                  ${item.afterPhotos.map(p => `<img src="${p}" class="w-20 h-20 object-cover rounded-xl border border-purple-200 shadow-2xs">`).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Form đánh giá nghiệm thu của Trưởng phòng -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Ghi chú & Đánh giá nghiệm thu của Trưởng phòng</label>
              <textarea id="review-note-input" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-medium" placeholder="Nhập nhận xét: Đã kiểm tra trực tiếp tại hiện trường, thiết bị hoạt động ổn định và bàn giao cho đơn vị sử dụng...">Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao sử dụng.</textarea>
            </div>

            <!-- Nút Duyệt hoàn thành & Nút Yêu cầu làm lại -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button type="button" class="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg" onclick="TaskModalComponent.approveReview()">
                <i class="fa-solid fa-stamp text-base"></i>
                <span>DUYỆT NGHIỆM THU (HOÀN THÀNH)</span>
              </button>

              <button type="button" class="py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg" onclick="TaskModalComponent.rejectReviewPrompt()">
                <i class="fa-solid fa-rotate-left text-base"></i>
                <span>YÊU CẦU XỬ LÝ LẠI</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // ==========================================
    // TAB 6: LỊCH SỬ HOẠT ĐỘNG
    // ==========================================
    if (this.activeTab === 'history') {
      const logs = (this.logs && this.logs.length > 0) ? this.logs : [
        { action: 'Khởi tạo phiếu', actorName: item.senderName || 'Hệ thống', actorRole: 'USER', timestamp: item.createdAt, details: 'Gửi yêu cầu hỗ trợ ban đầu' }
      ];

      return `
        <div class="space-y-4 max-w-xl mx-auto">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nhật ký theo dõi thời gian thực</h4>
          <div class="border-l-2 border-slate-200 ml-4 pl-4 space-y-6 text-xs">
            ${logs.map(log => `
              <div class="relative">
                <div class="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white"></div>
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-900">${log.action}</span>
                  <span class="text-[10px] text-slate-400">${log.timestamp ? Utils.formatDateTime(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp) : Utils.formatDateTime(log.isoTime)}</span>
                </div>
                <div class="text-slate-600 mt-0.5">Thực hiện bởi: <strong class="text-slate-800">${log.actorName}</strong> (${log.actorRole})</div>
                ${log.details ? `<p class="text-slate-500 mt-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">"${log.details}"</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return '';
  },

  updateAssignSelectionCount() {
    const checkboxes = document.querySelectorAll('input[name="assign_staff_checkbox"]:checked');
    const badge = document.getElementById('assign-selected-count');
    if (badge) {
      if (checkboxes.length === 0) {
        badge.innerText = 'Chưa chọn';
        badge.className = 'text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200';
      } else {
        const names = Array.from(checkboxes).map(c => c.getAttribute('data-name')).join(', ');
        badge.innerText = `Đã chọn: ${checkboxes.length} người (${names})`;
        badge.className = 'text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200';
      }
    }
  },

  // Handler: Phân công (Trưởng phòng ➔ Phó phòng ➔ 1-2-3 Kỹ thuật viên)
  async handleAssignSubmit(e) {
    e.preventDefault();
    const item = this.currentData;
    const currentUser = AuthService.getCurrentUser();
    const isDeputy = AuthService.isDeputyManager();
    const checkboxes = document.querySelectorAll('input[name="assign_staff_checkbox"]:checked');

    if (checkboxes.length === 0) {
      Utils.showToast('Vui lòng tick chọn ít nhất 1 nhân sự phụ trách!', 'warning');
      return;
    }

    const assignees = Array.from(checkboxes).map(cb => ({
      uid: cb.value,
      name: cb.getAttribute('data-name'),
      role: cb.getAttribute('data-role')
    }));
    const assignedToIds = assignees.map(a => a.uid);
    const assignedToName = assignees.map(a => a.name).join(', ');
    const assignedTo = assignedToIds.length === 1 ? assignedToIds[0] : assignedToIds;

    const priority = document.getElementById('assign-priority-select').value;
    const deadline = document.getElementById('assign-deadline-input').value;
    const assignmentNote = document.getElementById('assign-note-input').value;

    const hasDeputy = assignees.some(a => a.role === 'DEPUTY_MANAGER');

    try {
      const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
      const targetType = isReport ? 'REPORT' : 'TASK';

      const payload = {
        assignedTo,
        assignedToName,
        assignedToIds,
        assignees,
        priority,
        deadline,
        assignmentNote,
        code: item.code
      };

      if (isDeputy) {
        // Phó phòng chỉ định KTV theo phân công của Trưởng phòng
        payload.deputyCoordinator = currentUser?.displayName || 'Phó Trưởng phòng';
        payload.deputyCoordinatorId = currentUser?.uid;
      } else if (hasDeputy) {
        // Trưởng phòng giao cho Phó phòng
        payload.assignedByManager = currentUser?.displayName || 'Trưởng phòng';
        payload.assignedRole = 'DEPUTY_MANAGER';
      }

      await ApiService.assignTask(item.id || item.code, targetType, payload);

      // Cập nhật realtime client state
      item.assignedTo = assignedTo;
      item.assignedToName = assignedToName;
      item.assignedToIds = assignedToIds;
      item.assignees = assignees;
      item.priority = priority;
      item.status = 'ĐÃ PHÂN CÔNG';
      if (deadline) item.deadline = deadline;
      if (assignmentNote) item.assignmentNote = assignmentNote;
      if (payload.deputyCoordinator) item.deputyCoordinator = payload.deputyCoordinator;
      if (payload.assignedByManager) item.assignedByManager = payload.assignedByManager;

      RealtimeService.handleIncomingReport(item);
      SoundService.playChime();
      
      const successMsg = isDeputy 
        ? `Đã chỉ định ${assignedToName} thực hiện theo chỉ đạo!`
        : (hasDeputy ? `Đã giao nhiệm vụ cho Phó phòng ${assignedToName} điều phối!` : `Đã phân công thành công cho ${assignedToName}!`);
      
      Utils.showToast(successMsg, 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi khi phân công: ' + err.message, 'error');
    }
  },

  // Handler: Nhận việc
  async acceptTask() {
    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: 'ĐANG XỬ LÝ',
        note: 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường.'
      });

      item.status = 'ĐANG XỬ LÝ';
      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playChime();
      Utils.showToast('Bạn đã tiếp nhận và bắt đầu xử lý công việc!', 'success');
      this.activeTab = 'progress';
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  // Handler: Cập nhật tiến độ
  async handleProgressSubmit(e) {
    e.preventDefault();
    const item = this.currentData;
    const note = document.getElementById('progress-note-input')?.value || '';
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: item.status,
        note: note
      });

      item.latestNote = note;
      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      Utils.showToast('Đã lưu tiến độ xử lý thành công!', 'success');
    } catch (err) {
      Utils.showToast('Lỗi lưu tiến độ: ' + err.message, 'error');
    }
  },

  // Handler: Gửi nghiệm thu (Dành cho Kỹ thuật viên)
  async submitForReview() {
    const confirm = await Utils.confirmModal('Xác nhận hoàn thành', 'Bạn có chắc chắn đã kiểm tra xử lý xong và muốn gửi yêu cầu nghiệm thu cho Lãnh đạo / Trưởng phòng?');
    if (!confirm) return;

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';
    const note = document.getElementById('progress-note-input')?.value || 'Đã hoàn thành công việc hiện trường, chuyển chờ Trưởng phòng nghiệm thu.';

    try {
      await ApiService.updateTaskStatus(item.id || item.code, targetType, {
        status: 'CHỜ NGHIỆM THU',
        note: note
      });

      item.status = 'CHỜ NGHIỆM THU';
      item.latestNote = note;
      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playSuccess();
      Utils.showToast('Đã gửi yêu cầu nghiệm thu đến Trưởng phòng thành công!', 'success');
      
      // Nếu là Quản lý/Super Admin thì chuyển sang tab review để duyệt luôn nếu muốn
      // Nếu là Kỹ thuật viên (STAFF) thì giữ ở tab progress hiển thị thông báo chờ Trưởng phòng duyệt
      if (AuthService.isManager()) {
        this.activeTab = 'review';
      } else {
        this.activeTab = 'progress';
      }
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  // Handler: Duyệt hoàn thành (CHỈ DÀNH CHO TRƯỞNG PHÒNG & SUPER ADMIN)
  async approveReview() {
    if (!AuthService.isManager()) {
      Utils.showToast('Chỉ Trưởng phòng hoặc Quản trị viên mới có quyền duyệt nghiệm thu hoàn thành!', 'warning');
      return;
    }

    const confirm = await Utils.confirmModal('Duyệt nghiệm thu', 'Xác nhận công việc đã hoàn thành đúng chất lượng kỹ thuật?', 'Duyệt hoàn thành', 'bg-emerald-600 hover:bg-emerald-700');
    if (!confirm) return;

    const item = this.currentData;
    const note = document.getElementById('review-note-input')?.value || 'Đã kiểm tra đạt yêu cầu kỹ thuật và bàn giao.';
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.reviewTask(item.id || item.code, targetType, {
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
      Utils.showToast('Đã duyệt hoàn thành công việc!', 'success');
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  // Handler: Yêu cầu làm lại (CHỈ DÀNH CHO TRƯỞNG PHÒNG & SUPER ADMIN)
  async rejectReview() {
    if (!AuthService.isManager()) {
      Utils.showToast('Chỉ Trưởng phòng hoặc Quản trị viên mới có quyền yêu cầu xử lý lại!', 'warning');
      return;
    }

    const reason = document.getElementById('review-reject-reason')?.value;
    if (!reason || !reason.trim()) {
      Utils.showToast('Vui lòng nhập lý do chưa đạt yêu cầu!', 'warning');
      return;
    }

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.reviewTask(item.id || item.code, targetType, {
        approved: false,
        rejectionReason: reason
      });

      item.status = 'ĐANG XỬ LÝ';
      item.rejectionReason = reason;
      if (targetType === 'TASK') {
        RealtimeService.handleTaskUpdate(item);
      } else {
        RealtimeService.handleIncomingReport(item);
      }

      SoundService.playChime();
      Utils.showToast('Đã gửi yêu cầu xử lý lại kèm lý do cho kỹ thuật viên.', 'info');
      this.activeTab = 'progress';
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  // Handler: Bình luận trao đổi
  async handleCommentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('comment-text-input');
    const content = input.value.trim();
    if (!content) return;

    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      const res = await ApiService.addComment(item.id || item.code, targetType, {
        content: content
      });

      if (!item.comments) item.comments = [];
      item.comments.push(res.data);
      input.value = '';
      this.renderModal();
    } catch (err) {
      Utils.showToast('Lỗi gửi bình luận: ' + err.message, 'error');
    }
  },

  // Handler: Hủy phân công (Đưa về trạng thái Chờ phân công)
  async unassignCurrentTask() {
    if (!confirm('Bạn có chắc chắn muốn hủy phân công công việc này và đưa về danh sách Chờ phân công?')) return;
    const item = this.currentData;
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const targetType = isReport ? 'REPORT' : 'TASK';

    try {
      await ApiService.unassignTask(item.id || item.code, targetType);
      item.assignedTo = null;
      item.assignedToName = null;
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

  // Handler: Xóa hoàn toàn công việc / phiếu khỏi Firestore (DUY NHẤT SUPER ADMIN)
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

      // Xóa khỏi cache realtime
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

  // DIRECT ACTIONS CHO CARD NGOÀI DANH SÁCH
  async acceptTaskDirect(targetId, targetCode, targetType) {
    try {
      await ApiService.updateTaskStatus(targetId || targetCode, targetType, {
        status: 'ĐANG XỬ LÝ',
        note: 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường.'
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
