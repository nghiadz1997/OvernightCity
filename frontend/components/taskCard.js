/**
 * NSG SUPPORT - TASK & REPORT CARD COMPONENT
 */

const TaskCardComponent = {
  render(item) {
    const isReport = item.type === 'REPORT' || (item.code && item.code.startsWith('PYC-'));
    const code = item.code || (isReport ? 'PYC-000000' : 'TASK-000000');
    const priority = item.priority || 'BÌNH THƯỜNG';
    const status = item.status || 'CHỜ PHÂN CÔNG';
    const isOverdue = item.isOverdue || false;
    const deadlineInfo = Utils.getDeadlineStatus(item.deadline, status === 'HOÀN THÀNH');

    const currentUser = AuthService.getCurrentUser();
    const canAssign = AuthService.isManager();
    const isAssignedToMe = Utils.isTaskAssignedToUser(item, currentUser?.uid, currentUser);
    const canAccept = (AuthService.isStaff() || AuthService.isManager()) && (isAssignedToMe || !item.assignedTo || AuthService.isSuperAdmin());
    const canReview = AuthService.isManager() && status === 'CHỜ NGHIỆM THU';
    const canDelete = AuthService.canDeleteTask(); // DUY NHẤT SUPER ADMIN MỚI CÓ QUYỀN XÓA

    const cardBorder = priority === 'KHẨN CẤP' ? 'border-l-4 border-l-red-500' :
                       priority === 'CAO' ? 'border-l-4 border-l-orange-500' :
                       'border-l-4 border-l-blue-500';

    return `
      <div class="nsg-card bg-white p-5 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200 ${cardBorder} flex flex-col justify-between" id="card-${item.id || code}">
        <!-- Top Bar: Code, Badges & Time -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md ${isReport ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-purple-50 text-purple-800 border border-purple-200'}">
                ${code}
              </span>
              ${Utils.renderPriorityBadge(priority)}
              ${Utils.renderStatusBadge(status, isOverdue)}
              ${item.rating ? `<span class="inline-flex items-center gap-1 font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs" title="Đánh giá: ${item.rating}/5 sao"><i class="fa-solid fa-star text-amber-400 text-[10px]"></i> ${item.rating}★</span>` : ''}
            </div>
            <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap" title="${item.createdAt}">
              ${Utils.timeAgo(item.createdAt)}
            </span>
          </div>

          <!-- Title -->
          <h4 class="text-base font-bold text-slate-900 leading-snug mb-2 hover:text-blue-600 transition-colors cursor-pointer" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}')">
            ${item.title}
          </h4>

          <!-- Category, Location, Manager & Tech -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mb-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
            <div class="flex items-center gap-1.5 truncate">
              <i class="fa-solid fa-layer-group text-slate-400"></i>
              <span class="font-medium text-slate-800">${item.categoryName || 'Kỹ thuật'}</span>
            </div>
            <div class="flex items-center gap-1.5 truncate">
              <i class="fa-solid fa-location-dot text-red-500"></i>
              <span class="font-medium text-slate-800">${item.location || 'Chưa rõ'} ${item.room ? `(${item.room})` : ''}</span>
            </div>
            <div class="flex items-center gap-1.5 truncate" title="Người giao việc: ${item.assignedByName || 'Chưa chỉ định'}">
              <i class="fa-solid fa-user-tie text-blue-600"></i>
              <span class="font-semibold text-slate-700 truncate">
                Giao việc: ${item.assignedByName || 'Chưa chỉ định'}
              </span>
            </div>
            <div class="flex items-center gap-1.5 truncate" title="Người điều phối: ${item.assignedManagerName || item.deputyName || item.deputyCoordinator || 'Không có'}">
              <i class="fa-solid fa-user-shield text-purple-600"></i>
              <span class="font-semibold ${item.assignedManagerName || item.deputyName || item.deputyCoordinator ? 'text-purple-700' : 'text-slate-400 italic'} truncate">
                ${item.assignedManagerName || item.deputyName || item.deputyCoordinator ? `Điều phối: ${item.assignedManagerName || item.deputyName || item.deputyCoordinator}` : 'Điều phối: Không có'}
              </span>
            </div>
            <div class="flex items-center gap-1.5 truncate col-span-1 sm:col-span-2" title="Kỹ thuật viên thực hiện: ${item.assignedToName || 'Chưa phân công'}">
              <i class="fa-solid ${item.assignedToName && item.assignedToName.includes(',') ? 'fa-users text-indigo-600' : 'fa-screwdriver-wrench text-indigo-600'}"></i>
              <span class="font-semibold ${item.assignedToName ? 'text-indigo-700' : 'text-slate-400 italic'} truncate">
                ${item.assignedToName ? (item.assignedToName.includes(',') ? `👥 KTV: ${item.assignedToName}` : `🔧 KTV: ${item.assignedToName}`) : 'KTV: Chưa phân công'}
              </span>
            </div>
          </div>

          <!-- Description Preview -->
          <p class="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            ${item.description || 'Không có mô tả chi tiết.'}
          </p>
        </div>

        <!-- Bottom Footer: Deadline & Action Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <!-- Deadline indicator -->
          <div class="flex items-center gap-1 text-[11px]">
            <i class="fa-regular fa-clock ${deadlineInfo.isOverdue ? 'text-red-500' : deadlineInfo.isNear ? 'text-orange-500' : 'text-slate-400'}"></i>
            <span class="font-semibold ${deadlineInfo.isOverdue ? 'text-red-600' : deadlineInfo.isNear ? 'text-orange-600' : 'text-slate-600'}">
              Hạn: ${item.deadline ? Utils.formatDate(item.deadline) : 'Không'} (${deadlineInfo.label})
            </span>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button class="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}', 'overview')">
              <i class="fa-regular fa-eye"></i>
              <span>Xem</span>
            </button>

            ${canAssign && (status === 'CHỜ PHÂN CÔNG' || status === 'MỚI') ? `
              <button class="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}', 'overview')">
                <i class="fa-solid fa-user-plus"></i>
                <span>Phân công</span>
              </button>
            ` : ''}

            ${status === 'ĐÃ PHÂN CÔNG' && canAccept ? `
              <button class="px-2.5 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer" title="Nhận việc và bắt đầu xử lý ngay" onclick="TaskCardComponent.acceptDirectly(event, '${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}')">
                <i class="fa-solid fa-play"></i>
                <span>Nhận việc</span>
              </button>
            ` : ''}

            ${status === 'ĐANG XỬ LÝ' && canAccept ? `
              <button class="px-2.5 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer" title="Báo hoàn tất và gửi nghiệm thu nhanh" onclick="TaskCardComponent.openQuickReviewModal(event, '${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}')">
                <i class="fa-solid fa-clipboard-check"></i>
                <span>Gửi nghiệm thu</span>
              </button>
            ` : ''}

            ${canReview && status === 'CHỜ NGHIỆM THU' ? `
              <button class="px-2.5 py-1.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer animate-pulse" title="Duyệt hoàn thành công việc" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}', 'overview')">
                <i class="fa-solid fa-stamp"></i>
                <span>Nghiệm thu</span>
              </button>
            ` : ''}

            ${canDelete ? `
              <button class="p-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer ml-auto" title="Xóa công việc / phiếu này" onclick="TaskCardComponent.deleteCard(event, '${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 1-Click Nhận việc trực tiếp từ thẻ mà không cần mở modal
   */
  async acceptDirectly(e, targetId, code, targetType) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const btn = e?.currentTarget;
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang nhận...</span>`;
    }

    try {
      await ApiService.updateTaskStatus(targetId || code, targetType, {
        status: 'ĐANG XỬ LÝ',
        note: 'Kỹ thuật viên đã tiếp nhận và bắt đầu xử lý tại hiện trường.',
        code: code
      });

      let item = null;
      if (targetType === 'TASK') {
        item = (RealtimeService.tasks || []).find(t => t.id === targetId || t.code === code);
      } else {
        item = (RealtimeService.reports || []).find(r => r.id === targetId || r.code === code);
      }

      if (item) {
        item.status = 'ĐANG XỬ LÝ';
        item.acceptedAt = new Date().toISOString();
        if (targetType === 'TASK') {
          RealtimeService.handleTaskUpdate(item);
        } else {
          RealtimeService.handleIncomingReport(item);
        }
      } else {
        RealtimeService.notifyReportListeners();
        RealtimeService.notifyTaskListeners();
      }

      SoundService.playChime();
      Utils.showToast(`🚀 Đã nhận việc [${code}] và bắt đầu xử lý!`, 'success');

      if (window.StaffDashboardPage && typeof window.StaffDashboardPage.renderTasks === 'function') {
        window.StaffDashboardPage.renderTasks();
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
      Utils.showToast('Lỗi khi nhận việc: ' + err.message, 'error');
    }
  },

  /**
   * Mở modal gửi nghiệm thu nhanh chóng
   */
  openQuickReviewModal(e, targetId, code, targetType) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    let item = null;
    if (targetType === 'TASK') {
      item = (RealtimeService.tasks || []).find(t => t.id === targetId || t.code === code);
    } else {
      item = (RealtimeService.reports || []).find(r => r.id === targetId || r.code === code);
    }

    const modalId = 'quick-review-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const title = item?.title || 'Sự cố thiết bị';
    const location = item?.location ? `${item.location} ${item.room ? `(${item.room})` : ''}` : '';

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-white">Báo hoàn tất & Gửi nghiệm thu</h3>
              <p class="text-[11px] font-mono text-indigo-200">${code}</p>
            </div>
          </div>
          <button type="button" class="text-slate-400 hover:text-white text-lg p-1 cursor-pointer transition-colors" onclick="document.getElementById('${modalId}')?.remove()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Body Form -->
        <form id="quick-review-form" onsubmit="TaskCardComponent.handleQuickReviewSubmit(event, '${targetId}', '${code}', '${targetType}')" class="p-5 space-y-4 overflow-y-auto flex-1">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${title}</h4>
            ${location ? `<p class="text-[11px] text-slate-500 mt-0.5"><i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${location}</p>` : ''}
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              📝 Ghi chú kết quả xử lý <span class="text-rose-500">*</span>:
            </label>
            <textarea id="quick-review-note" class="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium" rows="2" placeholder="Mô tả kết quả đã khắc phục xong tại hiện trường..." required>Đã kiểm tra và xử lý hoàn tất tại hiện trường, kính đề nghị nghiệm thu.</textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              🔧 Vật tư / Linh kiện đã thay thế (nếu có):
            </label>
            <input type="text" id="quick-review-materials" class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium" placeholder="Ví dụ: Thay 01 bóng đèn LED, 01 tụ quạt...">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              📸 Tải ảnh chụp sau khi sửa (Bằng chứng nghiệm thu):
            </label>
            <input type="file" id="quick-review-photos" multiple accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" onchange="TaskCardComponent.previewQuickReviewPhotos(this)">
            <div id="quick-review-photo-previews" class="grid grid-cols-4 gap-2 mt-2 hidden"></div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button type="button" class="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer" onclick="document.getElementById('${modalId}')?.remove()">
              Hủy
            </button>
            <button type="submit" id="btn-submit-quick-review" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
              <i class="fa-solid fa-paper-plane"></i>
              <span>🚀 GỬI NGHIỆM THU NGAY</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
  },

  previewQuickReviewPhotos(input) {
    const previewBox = document.getElementById('quick-review-photo-previews');
    if (!previewBox) return;
    previewBox.innerHTML = '';
    if (!input.files || input.files.length === 0) {
      previewBox.className = 'grid grid-cols-4 gap-2 mt-2 hidden';
      return;
    }

    previewBox.className = 'grid grid-cols-4 gap-2 mt-2';
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative';
        div.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        previewBox.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  },

  async handleQuickReviewSubmit(e, targetId, code, targetType) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-quick-review');
    const note = document.getElementById('quick-review-note')?.value.trim() || 'Đã hoàn thành công việc hiện trường, chuyển chờ Trưởng phòng nghiệm thu.';
    const materials = document.getElementById('quick-review-materials')?.value.trim() || '';
    const photoInput = document.getElementById('quick-review-photos');

    const oldBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tải lên & gửi...</span>`;
    }

    try {
      let afterPhotos = [];
      if (photoInput && photoInput.files && photoInput.files.length > 0) {
        const uploadRes = await ApiService.uploadFiles(photoInput.files);
        if (uploadRes && uploadRes.files) {
          afterPhotos = uploadRes.files.map(f => f.url);
        }
      }

      await ApiService.updateTaskStatus(targetId || code, targetType, {
        status: 'CHỜ NGHIỆM THU',
        note: note,
        afterPhotos: afterPhotos,
        materialsUsed: materials,
        code: code
      });

      let item = null;
      if (targetType === 'TASK') {
        item = (RealtimeService.tasks || []).find(t => t.id === targetId || t.code === code);
      } else {
        item = (RealtimeService.reports || []).find(r => r.id === targetId || r.code === code);
      }

      if (item) {
        item.status = 'CHỜ NGHIỆM THU';
        item.latestNote = note;
        item.materialsUsed = materials;
        if (afterPhotos.length > 0) {
          item.afterPhotos = [...(item.afterPhotos || []), ...afterPhotos];
        }
        item.submittedForReviewAt = new Date().toISOString();

        if (targetType === 'TASK') {
          RealtimeService.handleTaskUpdate(item);
        } else {
          RealtimeService.handleIncomingReport(item);
        }
      } else {
        RealtimeService.notifyReportListeners();
        RealtimeService.notifyTaskListeners();
      }

      SoundService.playSuccess();
      Utils.showToast(`✅ Đã gửi nghiệm thu cho phiếu [${code}] thành công!`, 'success');

      document.getElementById('quick-review-modal')?.remove();

      if (window.StaffDashboardPage && typeof window.StaffDashboardPage.renderTasks === 'function') {
        window.StaffDashboardPage.renderTasks();
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldBtnHtml;
      }
      Utils.showToast('Lỗi gửi nghiệm thu: ' + err.message, 'error');
    }
  },

  async deleteCard(e, targetId, code, targetType) {
    if (e) e.stopPropagation();
    if (!AuthService.canDeleteTask()) {
      Utils.showToast('Từ chối quyền: Chỉ Quản trị viên Super Admin mới có quyền xóa task!', 'warning');
      return;
    }

    if (!confirm(`XÁC NHẬN XÓA (SUPER ADMIN):\nBạn có chắc chắn muốn xóa vĩnh viễn phiếu [${code}] khỏi cơ sở dữ liệu Cloud Firestore?`)) return;

    try {
      await ApiService.deleteTaskOrReport(targetId, targetType);

      if (targetType === 'TASK') {
        RealtimeService.tasks = RealtimeService.tasks.filter(t => t.id !== targetId && t.code !== code);
        RealtimeService.notifyTaskListeners();
      } else {
        RealtimeService.reports = RealtimeService.reports.filter(r => r.id !== targetId && r.code !== code);
        RealtimeService.notifyReportListeners();
      }

      Utils.showToast(`Đã xóa thành công ${code}!`, 'success');
    } catch (err) {
      Utils.showToast('Lỗi khi xóa: ' + err.message, 'error');
    }
  }
};

window.TaskCardComponent = TaskCardComponent;
