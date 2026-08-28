/**
 * NSG SUPPORT - REALTIME TASK MANAGEMENT PAGE
 * Danh sách công việc realtime & bộ lọc đa năng theo yêu cầu mục 11 & 12
 */

const TasksPage = {
  filter: {
    keyword: '',
    status: '',
    priority: '',
    type: '',
    staff: ''
  },

  render() {
    // Đọc filter từ URL nếu có
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (urlParams.get('status')) this.filter.status = urlParams.get('status');
    if (urlParams.get('type')) this.filter.type = urlParams.get('type');
    if (urlParams.get('filter') === 'overdue') this.filter.status = 'OVERDUE';

    return `
      <div class="space-y-6">
        <!-- Top Title & Quick Actions -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-list-check text-blue-600"></i>
              <span>DANH SÁCH CÔNG VIỆC (REALTIME)</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Dữ liệu tự động cập nhật ngay khi có phát sinh, không cần tải lại trang.</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <a href="#/admin/create-task" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2">
              <i class="fa-solid fa-plus-circle"></i>
              <span>+ Giao việc mới</span>
            </a>
          </div>
        </div>

        <!-- Bộ lọc đa năng theo mục 12 -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <!-- Tìm kiếm realtime theo mã hoặc tiêu đề -->
            <div class="lg:col-span-2 relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input type="text" id="task-search-keyword" class="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Tìm theo mã (PYC-...), tiêu đề, phòng, người gửi..." value="${this.filter.keyword}" oninput="TasksPage.handleSearchInput(this.value)">
            </div>

            <!-- Lọc Trạng thái -->
            <div>
              <select id="task-filter-status" class="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" onchange="TasksPage.handleStatusFilter(this.value)">
                <option value="">-- Tất cả trạng thái --</option>
                <option value="CHỜ PHÂN CÔNG" ${this.filter.status === 'CHỜ PHÂN CÔNG' ? 'selected' : ''}>⏳ Chờ phân công</option>
                <option value="ĐÃ PHÂN CÔNG" ${this.filter.status === 'ĐÃ PHÂN CÔNG' ? 'selected' : ''}>👤 Đã phân công</option>
                <option value="ĐANG XỬ LÝ" ${this.filter.status === 'ĐANG XỬ LÝ' ? 'selected' : ''}>🔧 Đang xử lý</option>
                <option value="CHỜ NGHIỆM THU" ${this.filter.status === 'CHỜ NGHIỆM THU' ? 'selected' : ''}>📋 Chờ nghiệm thu</option>
                <option value="HOÀN THÀNH" ${this.filter.status === 'HOÀN THÀNH' ? 'selected' : ''}>✅ Hoàn thành</option>
                <option value="OVERDUE" ${this.filter.status === 'OVERDUE' ? 'selected' : ''}>🚨 Quá hạn</option>
              </select>
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

    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    let items = [...allReports, ...allTasks];

    // Cập nhật danh sách KTV thực tế trong dropdown lọc
    const staffSelect = document.getElementById('task-filter-staff');
    if (staffSelect) {
      const assignedNames = Array.from(new Set(items.flatMap(i => (i.assignedToName ? i.assignedToName.split(',').map(s => s.trim()) : [])).filter(Boolean)));
      const currentVal = staffSelect.value;
      staffSelect.innerHTML = `<option value="">-- Tất cả nhân viên --</option>` +
        assignedNames.map(n => `<option value="${n}" ${currentVal === n ? 'selected' : ''}>${n}</option>`).join('');
    }

    // Áp dụng bộ lọc
    if (this.filter.keyword) {
      const kw = this.filter.keyword;
      items = items.filter(i =>
        (i.code && i.code.toLowerCase().includes(kw)) ||
        (i.title && i.title.toLowerCase().includes(kw)) ||
        (i.location && i.location.toLowerCase().includes(kw)) ||
        (i.room && i.room.toLowerCase().includes(kw)) ||
        (i.senderName && i.senderName.toLowerCase().includes(kw)) ||
        (i.assignedToName && i.assignedToName.toLowerCase().includes(kw))
      );
    }

    if (this.filter.status) {
      if (this.filter.status === 'OVERDUE') {
        items = items.filter(i => i.isOverdue && i.status !== 'HOÀN THÀNH');
      } else {
        items = items.filter(i => i.status === this.filter.status);
      }
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
          <p class="text-xs text-slate-500 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn lại trạng thái.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => TaskCardComponent.render(item)).join('');
  }
};

window.TasksPage = TasksPage;
