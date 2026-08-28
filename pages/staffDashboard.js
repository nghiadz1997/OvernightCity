/**
 * NSG SUPPORT - TECHNICIAN / STAFF DASHBOARD
 * Cổng dành riêng cho Kỹ thuật viên hiện trường theo yêu cầu mục 16
 */

const StaffDashboardPage = {
  currentTab: 'inProgress',

  render() {
    const currentUser = AuthService.getCurrentUser();
    const user = currentUser;
    const isKTX = currentUser?.role === 'STAFF_KTX';
    const roleBadgeText = isKTX ? 'Kỹ thuật viên Ký Túc Xá' : (currentUser?.role === 'STAFF' ? 'Kỹ thuật viên Khoa/GD' : (currentUser?.role || 'Kỹ thuật viên'));

    return `
      <div class="space-y-6">
        <!-- Top Profile Banner -->
        <div class="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl ${isKTX ? 'bg-cyan-600' : 'bg-blue-600'} flex items-center justify-center text-white text-2xl font-black shadow-lg">
              <i class="fa-solid ${isKTX ? 'fa-hotel' : 'fa-toolbox'}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black tracking-tight">${user?.displayName || 'Kỹ thuật viên'}</h1>
                <span class="px-2.5 py-0.5 rounded-full ${isKTX ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'} text-xs font-bold border">
                  ${roleBadgeText}
                </span>
              </div>
              <p class="text-xs text-indigo-200 mt-1">${isKTX ? 'Cổng nhận việc và cập nhật kết quả xử lý sự cố Ký Túc Xá' : 'Cổng nhận việc và cập nhật kết quả xử lý hiện trường'}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all cursor-pointer" onclick="StaffDashboardPage.renderTasks()">
              <i class="fa-solid fa-arrows-rotate mr-1"></i> Làm mới việc
            </button>
            <a href="#/admin" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all">
              Vào Quản trị
            </a>
          </div>
        </div>

        <!-- 4 Filter Tabs theo mục 16 -->
        <div class="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs overflow-x-auto text-xs font-bold">
          <button id="tab-btn-assigned" class="py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap text-slate-600 hover:bg-slate-50" onclick="StaffDashboardPage.setTab('assigned')">
            <i class="fa-solid fa-bell text-blue-600"></i>
            <span>Việc mới giao</span>
            <span id="badge-count-assigned" class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">0</span>
          </button>

          <button id="tab-btn-inProgress" class="py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap bg-indigo-600 text-white shadow-xs" onclick="StaffDashboardPage.setTab('inProgress')">
            <i class="fa-solid fa-screwdriver-wrench"></i>
            <span>Đang xử lý</span>
            <span id="badge-count-inProgress" class="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px]">0</span>
          </button>

          <button id="tab-btn-overdue" class="py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap text-slate-600 hover:bg-slate-50" onclick="StaffDashboardPage.setTab('overdue')">
            <i class="fa-solid fa-triangle-exclamation text-red-500"></i>
            <span>Sắp đến hạn / Quá hạn</span>
            <span id="badge-count-overdue" class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px]">0</span>
          </button>

          <button id="tab-btn-completed" class="py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap text-slate-600 hover:bg-slate-50" onclick="StaffDashboardPage.setTab('completed')">
            <i class="fa-solid fa-circle-check text-emerald-600"></i>
            <span>Đã hoàn thành</span>
            <span id="badge-count-completed" class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">0</span>
          </button>
        </div>

        <!-- Staff Tasks Grid -->
        <div id="staff-tasks-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
  },

  init() {
    this.renderTasks();

    this.unsubReports = RealtimeService.subscribeReports(() => this.renderTasks());
    this.unsubTasks = RealtimeService.subscribeTasks(() => this.renderTasks());
  },

  destroy() {
    if (this.unsubReports) this.unsubReports();
    if (this.unsubTasks) this.unsubTasks();
  },

  setTab(tabName) {
    this.currentTab = tabName;

    const tabs = ['assigned', 'inProgress', 'overdue', 'completed'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.className = 'py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap bg-indigo-600 text-white shadow-xs';
        } else {
          btn.className = 'py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap text-slate-600 hover:bg-slate-50';
        }
      }
    });

    this.renderTasks();
  },

  renderTasks() {
    const container = document.getElementById('staff-tasks-grid');
    if (!container) return;

    const currentUser = AuthService.getCurrentUser();
    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    const allItems = [...allReports, ...allTasks];

    // Lọc công việc của KTV này (hoặc hiển thị tất cả nếu chưa đăng nhập vai trò cụ thể để dễ demo)
    const myItems = allItems.filter(item => {
      if (!currentUser || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MANAGER') return true;
      return Utils.isTaskAssignedToUser(item, currentUser.uid) || !item.assignedTo;
    });

    // Cập nhật badges
    const assignedCount = myItems.filter(i => i.status === 'ĐÃ PHÂN CÔNG').length;
    const inProgressCount = myItems.filter(i => i.status === 'ĐANG XỬ LÝ' || i.status === 'CHỜ NGHIỆM THU').length;
    const overdueCount = myItems.filter(i => i.isOverdue && i.status !== 'HOÀN THÀNH').length;
    const completedCount = myItems.filter(i => i.status === 'HOÀN THÀNH').length;

    const bAssigned = document.getElementById('badge-count-assigned');
    if (bAssigned) bAssigned.innerText = assignedCount;
    const bInProgress = document.getElementById('badge-count-inProgress');
    if (bInProgress) bInProgress.innerText = inProgressCount;
    const bOverdue = document.getElementById('badge-count-overdue');
    if (bOverdue) bOverdue.innerText = overdueCount;
    const bCompleted = document.getElementById('badge-count-completed');
    if (bCompleted) bCompleted.innerText = completedCount;

    // Lọc theo tab hiện tại
    let displayedItems = [];
    if (this.currentTab === 'assigned') {
      displayedItems = myItems.filter(i => i.status === 'ĐÃ PHÂN CÔNG');
    } else if (this.currentTab === 'inProgress') {
      displayedItems = myItems.filter(i => i.status === 'ĐANG XỬ LÝ' || i.status === 'CHỜ NGHIỆM THU');
    } else if (this.currentTab === 'overdue') {
      displayedItems = myItems.filter(i => i.isOverdue && i.status !== 'HOÀN THÀNH');
    } else if (this.currentTab === 'completed') {
      displayedItems = myItems.filter(i => i.status === 'HOÀN THÀNH');
    }

    if (displayedItems.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <i class="fa-solid fa-circle-check text-4xl text-slate-300 mb-2 block"></i>
          <h4 class="text-sm font-bold text-slate-700">Mục này không có công việc nào</h4>
        </div>
      `;
      return;
    }

    container.innerHTML = displayedItems.map(item => TaskCardComponent.render(item)).join('');
  }
};

window.StaffDashboardPage = StaffDashboardPage;
