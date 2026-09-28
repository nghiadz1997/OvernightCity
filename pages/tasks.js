/**
 * NSG SUPPORT - REALTIME TASK MANAGEMENT PAGE
 * Danh sách công việc realtime & bộ lọc đa năng theo yêu cầu mục 11 & 12
 */

const TasksPage = {
  activeScopeTab: 'all', // 'all', 'my_tasks', 'CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'
  filter: {
    keyword: '',
    status: '',
    priority: '',
    type: '',
    staff: ''
  },

  render() {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (urlParams.get('status')) {
      this.filter.status = urlParams.get('status');
      this.activeScopeTab = urlParams.get('status');
    }
    if (urlParams.get('type')) this.filter.type = urlParams.get('type');
    if (urlParams.get('filter') === 'overdue') this.filter.status = 'OVERDUE';
    if (urlParams.get('tab') === 'my') this.activeScopeTab = 'my_tasks';

    return `
      <div class="space-y-6">
        <!-- Top Title & Quick Actions -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-list-check text-blue-600"></i>
              <span>DANH SÁCH CÔNG VIỆC & PHIẾU PHẢN ÁNH</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Dữ liệu tự động cập nhật thời gian thực, một phiếu duy nhất xuyên suốt toàn bộ vòng đời.</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <a href="#/admin/create-task" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2">
              <i class="fa-solid fa-plus-circle"></i>
              <span>+ Giao việc mới</span>
            </a>
          </div>
        </div>

        <!-- Scope & Status Filter Tabs -->
        <div class="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto text-xs font-bold">
          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}" onclick="TasksPage.setScopeTab('all')">
            <i class="fa-solid fa-layer-group"></i>
            <span>Tất cả</span>
            <span id="tab-badge-all" class="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'my_tasks' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 hover:bg-blue-50'}" onclick="TasksPage.setScopeTab('my_tasks')">
            <i class="fa-solid fa-user-check"></i>
            <span>VIỆC CỦA TÔI</span>
            <span id="tab-badge-my" class="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'CHỜ PHÂN CÔNG' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}" onclick="TasksPage.setScopeTab('CHỜ PHÂN CÔNG')">
            <i class="fa-solid fa-hourglass-start"></i>
            <span>Chờ phân công</span>
            <span id="tab-badge-pending" class="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'ĐÃ PHÂN CÔNG' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-50'}" onclick="TasksPage.setScopeTab('ĐÃ PHÂN CÔNG')">
            <i class="fa-solid fa-user-clock"></i>
            <span>Đã phân công</span>
            <span id="tab-badge-assigned" class="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'ĐANG XỬ LÝ' ? 'bg-sky-600 text-white shadow-xs' : 'text-sky-700 hover:bg-sky-50'}" onclick="TasksPage.setScopeTab('ĐANG XỬ LÝ')">
            <i class="fa-solid fa-screwdriver-wrench"></i>
            <span>Đang xử lý</span>
            <span id="tab-badge-processing" class="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'CHỜ NGHIỆM THU' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'}" onclick="TasksPage.setScopeTab('CHỜ NGHIỆM THU')">
            <i class="fa-solid fa-clipboard-check"></i>
            <span>Chờ nghiệm thu</span>
            <span id="tab-badge-review" class="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px]">0</span>
          </button>

          <button class="py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.activeScopeTab === 'HOÀN THÀNH' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}" onclick="TasksPage.setScopeTab('HOÀN THÀNH')">
            <i class="fa-solid fa-circle-check"></i>
            <span>Đã hoàn thành</span>
            <span id="tab-badge-completed" class="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">0</span>
          </button>
        </div>

        <!-- Bộ lọc đa năng chi tiết -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Tìm kiếm realtime theo mã hoặc tiêu đề -->
            <div class="lg:col-span-2 relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input type="text" id="task-search-keyword" class="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Tìm theo mã (PYC-...), tiêu đề, phòng, người gửi..." value="${this.filter.keyword}" oninput="TasksPage.handleSearchInput(this.value)">
            </div>

            <!-- Lọc Mức độ -->
            <div>
              <select id="task-filter-priority" class="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" onchange="TasksPage.handlePriorityFilter(this.value)">
                <option value="">-- Tất cả mức độ --</option>
                <option value="KHẨN CẤP">🔴 Khẩn cấp</option>
                <option value="CAO">🟠 Cao</option>
                <option value="TRUNG BÌNH">🟡 Trung bình</option>
                <option value="BÌNH THƯỜNG">🟢 Bình thường</option>
              </select>
            </div>

            <!-- Lọc Kỹ thuật viên -->
            <div>
              <select id="task-filter-staff" class="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" onchange="TasksPage.handleStaffFilter(this.value)">
                <option value="">-- Tất cả nhân viên --</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Realtime Task Cards Grid -->
        <div id="tasks-grid-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  setScopeTab(tabKey) {
    this.activeScopeTab = tabKey;
    if (['CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'].includes(tabKey)) {
      this.filter.status = tabKey;
    } else {
      this.filter.status = '';
    }
    this.render();
    this.renderTasks();
  },

  handleSearchInput(val) {
    this.filter.keyword = val.trim().toLowerCase();
    this.renderTasks();
  },

  handleStatusFilter(val) {
    this.filter.status = val;
    this.renderTasks();
  },

  handlePriorityFilter(val) {
    this.filter.priority = val;
    this.renderTasks();
  },

  handleStaffFilter(val) {
    this.filter.staff = val;
    this.renderTasks();
  },

  renderTasks() {
    const container = document.getElementById('tasks-grid-container');
    if (!container) return;

    const currentUser = AuthService.getCurrentUser();
    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    const allItems = [...allReports, ...allTasks];

    // Cập nhật số lượng trên các tab badges
    const totalCount = allItems.length;
    const myCount = allItems.filter(i => Utils.isTaskAssignedToUser(i, currentUser?.uid)).length;
    const pendingCount = allItems.filter(i => i.status === 'CHỜ PHÂN CÔNG' || i.status === 'MỚI').length;
    const assignedCount = allItems.filter(i => i.status === 'ĐÃ PHÂN CÔNG').length;
    const processingCount = allItems.filter(i => i.status === 'ĐANG XỬ LÝ').length;
    const reviewCount = allItems.filter(i => i.status === 'CHỜ NGHIỆM THU').length;
    const completedCount = allItems.filter(i => i.status === 'HOÀN THÀNH').length;

    const bAll = document.getElementById('tab-badge-all');
    if (bAll) bAll.innerText = totalCount;
    const bMy = document.getElementById('tab-badge-my');
    if (bMy) bMy.innerText = myCount;
    const bPending = document.getElementById('tab-badge-pending');
    if (bPending) bPending.innerText = pendingCount;
    const bAssigned = document.getElementById('tab-badge-assigned');
    if (bAssigned) bAssigned.innerText = assignedCount;
    const bProcessing = document.getElementById('tab-badge-processing');
    if (bProcessing) bProcessing.innerText = processingCount;
    const bReview = document.getElementById('tab-badge-review');
    if (bReview) bReview.innerText = reviewCount;
    const bCompleted = document.getElementById('tab-badge-completed');
    if (bCompleted) bCompleted.innerText = completedCount;

    // Cập nhật danh sách KTV thực tế trong dropdown lọc
    const staffSelect = document.getElementById('task-filter-staff');
    if (staffSelect) {
      const assignedNames = Array.from(new Set(allItems.flatMap(i => (i.assignedToName ? i.assignedToName.split(',').map(s => s.trim()) : [])).filter(Boolean)));
      const currentVal = staffSelect.value;
      staffSelect.innerHTML = `<option value="">-- Tất cả nhân viên --</option>` +
        assignedNames.map(n => `<option value="${n}" ${currentVal === n ? 'selected' : ''}>${n}</option>`).join('');
    }

    let items = [...allItems];

    // Lọc theo Scope Tab
    if (this.activeScopeTab === 'my_tasks') {
      items = items.filter(i => Utils.isTaskAssignedToUser(i, currentUser?.uid));
    } else if (this.activeScopeTab === 'CHỜ PHÂN CÔNG') {
      items = items.filter(i => i.status === 'CHỜ PHÂN CÔNG' || i.status === 'MỚI');
    } else if (this.activeScopeTab !== 'all') {
      items = items.filter(i => i.status === this.activeScopeTab);
    }

    // Áp dụng các bộ lọc phụ
    if (this.filter.keyword) {
      const kw = this.filter.keyword;
      items = items.filter(i =>
        (i.code && i.code.toLowerCase().includes(kw)) ||
        (i.title && i.title.toLowerCase().includes(kw)) ||
        (i.location && i.location.toLowerCase().includes(kw)) ||
        (i.room && i.room.toLowerCase().includes(kw)) ||
        (i.senderName && i.senderName.toLowerCase().includes(kw)) ||
        (i.assignedToName && i.assignedToName.toLowerCase().includes(kw)) ||
        (i.assignedManagerName && i.assignedManagerName.toLowerCase().includes(kw))
      );
    }

    if (this.filter.priority) {
      items = items.filter(i => i.priority === this.filter.priority);
    }

    if (this.filter.staff) {
      items = items.filter(i => i.assignedToName && i.assignedToName.includes(this.filter.staff));
    }

    // Sắp xếp: Ưu tiên khẩn cấp lên trên, sau đó mới nhất
    items.sort((a, b) => {
      if (a.priority === 'KHẨN CẤP' && b.priority !== 'KHẨN CẤP') return -1;
      if (b.priority === 'KHẨN CẤP' && a.priority !== 'KHẨN CẤP') return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-4xl mb-3 block text-slate-300"></i>
          <h3 class="text-sm font-bold text-slate-700">Không tìm thấy công việc nào phù hợp với bộ lọc</h3>
          <p class="text-xs text-slate-500 mt-1">Thử chọn lại tab trạng thái hoặc xóa từ khóa tìm kiếm.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => TaskCardComponent.render(item)).join('');
  }
};

window.TasksPage = TasksPage;
