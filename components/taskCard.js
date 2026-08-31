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
    const isAssignedToMe = Utils.isTaskAssignedToUser(item, currentUser?.uid);
    const canAccept = AuthService.isStaff() && (isAssignedToMe || !item.assignedTo);
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
            <div class="flex items-center gap-1.5 truncate" title="Người giao việc (Trưởng phòng): ${item.assignedByName || 'Trưởng phòng'}">
              <i class="fa-solid fa-user-tie text-blue-600"></i>
              <span class="font-semibold text-slate-700 truncate">
                TP: ${item.assignedByName || 'Trưởng phòng'}
              </span>
            </div>
            <div class="flex items-center gap-1.5 truncate" title="Người điều phối (Phó phòng): ${item.assignedManagerName || item.deputyName || 'Đang điều phối'}">
              <i class="fa-solid fa-user-shield text-purple-600"></i>
              <span class="font-semibold ${item.assignedManagerName || item.deputyName ? 'text-purple-700' : 'text-slate-400 italic'} truncate">
                ${item.assignedManagerName || item.deputyName ? `PP: ${item.assignedManagerName || item.deputyName}` : 'PP: Đang điều phối'}
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

            ${status === 'ĐÃ PHÂN CÔNG' && isAssignedToMe ? `
              <button class="px-2.5 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}', 'overview')">
                <i class="fa-solid fa-play"></i>
                <span>Nhận việc</span>
              </button>
            ` : ''}

            ${status === 'ĐANG XỬ LÝ' && isAssignedToMe ? `
              <button class="px-2.5 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer" title="Báo hoàn tất và gửi nghiệm thu" onclick="TaskModalComponent.open('${item.id || ''}', '${code}', '${isReport ? 'REPORT' : 'TASK'}', 'overview')">
                <i class="fa-solid fa-clipboard-check"></i>
                <span>Báo xong</span>
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
