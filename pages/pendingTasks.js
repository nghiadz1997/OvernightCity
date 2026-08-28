/**
 * NSG SUPPORT - PENDING ASSIGNMENT PAGE
 * Trang chuyên biệt "CÔNG VIỆC CHỜ PHÂN CÔNG" theo yêu cầu mục 40
 */

const PendingTasksPage = {
  render() {
    return `
      <div class="space-y-6">
        <!-- Header -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-hourglass-start"></i>
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">CÔNG VIỆC CHỜ PHÂN CÔNG</h1>
                <span id="pending-page-badge" class="px-3 py-1 bg-red-600 text-white text-xs font-black rounded-full pulse-emergency shadow-sm">
                  0 CÔNG VIỆC MỚI
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">Danh sách phản ánh và yêu cầu mới gửi lên cần Trưởng phòng điều phối xử lý.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a href="#/admin/create-task" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2">
              <i class="fa-solid fa-plus-circle"></i>
              <span>Giao việc mới</span>
            </a>
          </div>
        </div>

        <!-- Task List Container -->
        <div id="pending-tasks-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Realtime rendered -->
        </div>
      </div>
    `;
  },

  init() {
    this.renderPendingList();

    this.unsubReports = RealtimeService.subscribeReports(() => {
      this.renderPendingList();
    });
    this.unsubTasks = RealtimeService.subscribeTasks(() => {
      this.renderPendingList();
    });
  },

  destroy() {
    if (this.unsubReports) this.unsubReports();
    if (this.unsubTasks) this.unsubTasks();
  },

  renderPendingList() {
    const container = document.getElementById('pending-tasks-list');
    const badge = document.getElementById('pending-page-badge');
    if (!container) return;

    // Lọc công việc có trạng thái CHỜ PHÂN CÔNG hoặc MỚI
    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    const pendingList = [...allReports, ...allTasks]
      .filter(item => item.status === 'CHỜ PHÂN CÔNG' || item.status === 'MỚI')
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); // Mới nhất lên đầu

    if (badge) {
      badge.innerText = `🔴 ${String(pendingList.length).padStart(2, '0')} CÔNG VIỆC MỚI`;
    }

    if (pendingList.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <i class="fa-regular fa-circle-check text-5xl text-emerald-500 mb-3 block"></i>
          <h3 class="text-base font-bold text-slate-700 mb-1">Tuyệt vời! Không có công việc nào tồn đọng</h3>
          <p class="text-xs text-slate-500">Tất cả các phản ánh đã được tiếp nhận và phân công cho kỹ thuật viên.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingList.map(item => TaskCardComponent.render(item)).join('');
  }
};

window.PendingTasksPage = PendingTasksPage;
