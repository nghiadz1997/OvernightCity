/**
 * NSG SUPPORT - REALTIME MANAGER & ADMIN DASHBOARD
 * Dữ liệu 100% thời gian thực từ Cloud Firestore (RealtimeService)
 * Bao gồm: 8 Metrics thẻ đếm, Bộ lọc Khoa/Phòng/KTX, Bộ lọc thời gian, 8 Biểu đồ Chart.js tự động tính toán
 */

const DashboardPage = {
  currentRange: '30days',
  currentDept: 'ALL',
  charts: {},
  unsubReports: null,
  unsubTasks: null,

  render() {
    const departments = window.APP_CONFIG?.DEPARTMENTS || [];

    return `
      <div class="space-y-6 animate-fade-in">
        <!-- Top Header & Filter Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-chart-pie text-blue-600"></i>
              <span>BẢNG ĐIỀU HÀNH KỸ THUẬT & CSVC (REALTIME)</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">
              Thống kê toàn diện từ tiếp nhận, điều phối, xử lý đến nghiệm thu của toàn trường và Ký Túc Xá.
            </p>
          </div>

          <!-- Bộ lọc trực tiếp Khoa/Phòng và Thời gian -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Lọc Phòng / Khoa / KTX -->
            <div class="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <i class="fa-solid fa-building text-slate-400 pl-2 text-xs"></i>
              <select id="dash-dept-filter" class="text-xs font-bold p-2 bg-transparent text-slate-800 focus:outline-hidden cursor-pointer" onchange="DashboardPage.handleDeptChange(this.value)">
                <option value="ALL">🏢 Toàn bộ Khoa / Phòng / KTX</option>
                ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>

            <!-- Lọc Khoảng thời gian -->
            <select id="dash-range-filter" class="text-xs font-bold p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer" onchange="DashboardPage.handleRangeChange(this.value)">
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày gần nhất</option>
              <option value="30days" selected>30 ngày gần nhất</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý này</option>
              <option value="year">Năm nay</option>
            </select>

            <button class="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5" onclick="DashboardPage.refreshData()" title="Làm mới dữ liệu">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span class="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        <!-- Pop-up Alert Thông báo Trưởng phòng khi có việc chờ -->
        <div id="manager-urgent-banner" class="hidden"></div>

        <!-- 8 Metric Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" id="dash-summary-cards">
          <!-- Rendered dynamically by calculateMetricsAndRender -->
        </div>

        <!-- 8 BIỂU ĐỒ DASHBOARD TÍNH TOÁN THEO DỮ LIỆU THẬT -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Biểu đồ 1: Công việc theo ngày (7 ngày gần nhất) -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-chart-line text-blue-600"></i> 1. Phát sinh theo ngày (7 ngày qua)
              </h3>
            </div>
            <div class="h-64"><canvas id="chart-daily"></canvas></div>
          </div>

          <!-- Biểu đồ 2: Công việc theo tháng (6 tháng gần nhất) -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-chart-column text-indigo-600"></i> 2. Xu hướng theo tháng
              </h3>
            </div>
            <div class="h-64"><canvas id="chart-monthly"></canvas></div>
          </div>

          <!-- Biểu đồ 3: Công việc theo trạng thái -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-cyan-600"></i> 3. Cơ cấu theo trạng thái
              </h3>
            </div>
            <div class="h-64 flex items-center justify-center"><canvas id="chart-status"></canvas></div>
          </div>

          <!-- Biểu đồ 4: Công việc theo loại danh mục sự cố -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-chart-simple text-purple-600"></i> 4. Phân loại theo danh mục sự cố
              </h3>
            </div>
            <div class="h-64 flex items-center justify-center"><canvas id="chart-category"></canvas></div>
          </div>

          <!-- Biểu đồ 5: Công việc theo Khoa / Phòng / KTX -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-building text-amber-600"></i> 5. Phân bổ theo Khoa / Phòng / KTX
              </h3>
            </div>
            <div class="h-64"><canvas id="chart-department"></canvas></div>
          </div>

          <!-- Biểu đồ 6: Khối lượng xử lý theo Kỹ thuật viên -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-user-gear text-emerald-600"></i> 6. Khối lượng xử lý của Nhân sự (KTV)
              </h3>
            </div>
            <div class="h-64"><canvas id="chart-staff"></canvas></div>
          </div>

          <!-- Biểu đồ 7: Tỷ lệ hoàn thành -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-percent text-emerald-600"></i> 7. Tỷ lệ nghiệm thu hoàn thành
              </h3>
            </div>
            <div class="h-64 flex flex-col items-center justify-center text-center">
              <div class="relative w-44 h-44 flex items-center justify-center">
                <canvas id="chart-completion-rate"></canvas>
                <div class="absolute text-center">
                  <span id="rate-percent-text" class="text-3xl font-black text-slate-900">0%</span>
                  <span class="text-[10px] text-slate-400 block font-bold">HOÀN THÀNH</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Biểu đồ 8: Thời gian xử lý trung bình thực tế -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-stopwatch text-rose-600"></i> 8. Thời gian xử lý trung bình thực tế (SLA)
              </h3>
            </div>
            <div class="my-auto py-6 text-center">
              <div class="text-5xl font-black text-blue-600 mb-1" id="avg-hours-text">--</div>
              <p class="text-xs text-slate-500 font-medium">Thời gian trung bình từ khi tạo phiếu đến khi duyệt nghiệm thu</p>
              <div class="mt-4 flex items-center justify-center gap-3 text-xs font-bold flex-wrap">
                <span id="emergency-sla-badge" class="px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">Khẩn cấp: --</span>
                <span id="normal-sla-badge" class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">Bình thường: --</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center font-medium">
              Chỉ số được đo lường chính xác trên các công việc đã hoàn tất nghiệm thu thực tế.
            </div>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    this.refreshData();

    // Lắng nghe realtime từ Firestore qua RealtimeService
    this.unsubReports = RealtimeService.subscribeReports(() => {
      this.calculateMetricsAndRender();
    });
    this.unsubTasks = RealtimeService.subscribeTasks(() => {
      this.calculateMetricsAndRender();
    });
  },

  destroy() {
    if (this.unsubReports) this.unsubReports();
    if (this.unsubTasks) this.unsubTasks();
    Object.values(this.charts).forEach(chart => {
      try { chart?.destroy(); } catch (e) {}
    });
    this.charts = {};
  },

  handleRangeChange(range) {
    this.currentRange = range;
    this.calculateMetricsAndRender();
  },

  handleDeptChange(dept) {
    this.currentDept = dept;
    this.calculateMetricsAndRender();
  },

  async refreshData() {
    this.calculateMetricsAndRender();
  },

  filterItems(items) {
    let list = [...items];

    // 1. Lọc theo Khoa / Phòng / KTX
    if (this.currentDept !== 'ALL') {
      list = list.filter(i => (i.departmentName === this.currentDept || i.senderDept === this.currentDept || i.department === this.currentDept));
    }

    // 2. Lọc theo Khoảng thời gian
    const now = new Date();
    if (this.currentRange === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      list = list.filter(i => (i.createdAt || '').startsWith(todayStr));
    } else if (this.currentRange === '7days') {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(i => new Date(i.createdAt || 0) >= limit);
    } else if (this.currentRange === '30days') {
      const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(i => new Date(i.createdAt || 0) >= limit);
    } else if (this.currentRange === 'month') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      list = list.filter(i => {
        const d = new Date(i.createdAt || 0);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (this.currentRange === 'year') {
      const curYear = now.getFullYear();
      list = list.filter(i => {
        const d = new Date(i.createdAt || 0);
        return d.getFullYear() === curYear;
      });
    }

    return list;
  },

  calculateMetricsAndRender() {
    const rawReports = RealtimeService.reports || [];
    const rawTasks = RealtimeService.tasks || [];
    const allRaw = [...rawReports, ...rawTasks];

    // Áp dụng bộ lọc
    const allItems = this.filterItems(allRaw);

    // Thống kê số lượng thực tế
    const total = allItems.length;
    const pending = allItems.filter(i => i.status === 'CHỜ PHÂN CÔNG' || i.status === 'MỚI').length;
    const assigned = allItems.filter(i => i.status === 'ĐÃ PHÂN CÔNG').length;
    const inProgress = allItems.filter(i => i.status === 'ĐANG XỬ LÝ').length;
    const reviewing = allItems.filter(i => i.status === 'CHỜ NGHIỆM THU').length;
    const completed = allItems.filter(i => i.status === 'HOÀN THÀNH').length;
    const overdue = allItems.filter(i => i.isOverdue).length;
    const emergency = allItems.filter(i => i.priority === 'KHẨN CẤP' && i.status !== 'HOÀN THÀNH').length;

    // Render Cards
    const cardsContainer = document.getElementById('dash-summary-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        ${this.renderCard('TỔNG CÔNG VIỆC', total, 'fa-list-check', 'bg-slate-900 text-white')}
        ${this.renderCard('CHỜ PHÂN CÔNG', pending, 'fa-hourglass-start', 'bg-amber-500 text-white', '#/admin/pending')}
        ${this.renderCard('ĐÃ PHÂN CÔNG', assigned, 'fa-user-check', 'bg-blue-600 text-white')}
        ${this.renderCard('ĐANG XỬ LÝ', inProgress, 'fa-screwdriver-wrench', 'bg-indigo-600 text-white')}
        ${this.renderCard('CHỜ NGHIỆM THU', reviewing, 'fa-clipboard-check', 'bg-purple-600 text-white')}
        ${this.renderCard('HOÀN THÀNH', completed, 'fa-circle-check', 'bg-emerald-600 text-white')}
        ${this.renderCard('QUÁ HẠN', overdue, 'fa-triangle-exclamation', 'bg-rose-600 text-white')}
        ${this.renderCard('KHẨN CẤP', emergency, 'fa-bell', 'bg-red-600 text-white pulse-emergency')}
      `;
    }

    // Banner thông báo nếu có công việc chờ
    this.checkManagerPrompt(pending, emergency);

    // Cập nhật 8 biểu đồ Chart.js bằng dữ liệu thật
    this.renderRealCharts(allItems, completed, total);
  },

  renderCard(label, count, icon, bgClass, link = '#/admin/tasks') {
    return `
      <a href="${link}" class="p-3.5 rounded-2xl ${bgClass} shadow-xs hover:shadow-md transition-all flex flex-col justify-between block">
        <div class="flex items-center justify-between text-[11px] opacity-90 font-semibold mb-1">
          <span class="truncate">${label}</span>
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="text-2xl font-black tracking-tight">${count}</div>
      </a>
    `;
  },

  checkManagerPrompt(pendingCount, emergencyCount) {
    const banner = document.getElementById('manager-urgent-banner');
    if (!banner) return;

    if (AuthService.isManager() && pendingCount > 0) {
      banner.className = 'bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between flex-wrap gap-3 animate-fade-in mb-6';
      banner.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-bell animate-bounce"></i>
          </div>
          <div>
            <h4 class="font-extrabold text-sm sm:text-base">BẠN CÓ ${String(pendingCount).padStart(2, '0')} CÔNG VIỆC CHỜ PHÂN CÔNG</h4>
            <p class="text-xs text-red-100">${emergencyCount > 0 ? `Trong đó có <strong>${emergencyCount} công việc KHẨN CẤP</strong> cần xử lý ngay!` : 'Vui lòng kiểm tra và phân công cho kỹ thuật viên.'}</p>
          </div>
        </div>
        <a href="#/admin/pending" class="px-4 py-2 bg-white text-red-600 font-extrabold text-xs rounded-xl shadow-md hover:bg-red-50 transition-all flex items-center gap-1.5 cursor-pointer">
          <span>XEM NGAY</span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      `;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  },

  renderRealCharts(items, completedCount, totalCount) {
    if (typeof Chart === 'undefined') return;

    // ----------------------------------------------------
    // 1. BIỂU ĐỒ 1: PHÁT SINH 7 NGÀY GẦN NHẤT (Line Chart)
    // ----------------------------------------------------
    const dailyLabels = [];
    const dailyData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      dailyLabels.push(label);
      const count = items.filter(item => (item.createdAt || '').startsWith(dStr)).length;
      dailyData.push(count);
    }

    const ctxDaily = document.getElementById('chart-daily')?.getContext('2d');
    if (ctxDaily) {
      if (this.charts.daily) this.charts.daily.destroy();
      this.charts.daily = new Chart(ctxDaily, {
        type: 'line',
        data: {
          labels: dailyLabels,
          datasets: [{
            label: 'Số việc phát sinh',
            data: dailyData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // ----------------------------------------------------
    // 2. BIỂU ĐỒ 2: CÔNG VIỆC THEO 6 THÁNG GẦN NHẤT (Bar Chart)
    // ----------------------------------------------------
    const monthLabels = [];
    const monthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      monthLabels.push(`Thg ${m + 1}`);
      const count = items.filter(item => {
        const itemD = new Date(item.createdAt || 0);
        return itemD.getMonth() === m && itemD.getFullYear() === y;
      }).length;
      monthData.push(count);
    }

    const ctxMonthly = document.getElementById('chart-monthly')?.getContext('2d');
    if (ctxMonthly) {
      if (this.charts.monthly) this.charts.monthly.destroy();
      this.charts.monthly = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Tổng công việc',
            data: monthData,
            backgroundColor: '#4f46e5',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // ----------------------------------------------------
    // 3. BIỂU ĐỒ 3: CÔNG VIỆC THEO TRẠNG THÁI (Doughnut)
    // ----------------------------------------------------
    const statusCounts = {
      'Chờ phân công': items.filter(i => i.status === 'CHỜ PHÂN CÔNG' || i.status === 'MỚI').length,
      'Đã phân công': items.filter(i => i.status === 'ĐÃ PHÂN CÔNG').length,
      'Đang xử lý': items.filter(i => i.status === 'ĐANG XỬ LÝ').length,
      'Chờ nghiệm thu': items.filter(i => i.status === 'CHỜ NGHIỆM THU').length,
      'Hoàn thành': items.filter(i => i.status === 'HOÀN THÀNH').length
    };

    const ctxStatus = document.getElementById('chart-status')?.getContext('2d');
    if (ctxStatus) {
      if (this.charts.status) this.charts.status.destroy();
      this.charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#f59e0b', '#3b82f6', '#4f46e5', '#9333ea', '#10b981']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
      });
    }

    // ----------------------------------------------------
    // 4. BIỂU ĐỒ 4: THEO DANH MỤC SỰ CỐ (Doughnut/Pie)
    // ----------------------------------------------------
    const catMap = {};
    items.forEach(i => {
      const name = i.categoryName || i.category || 'Cơ sở vật chất';
      catMap[name] = (catMap[name] || 0) + 1;
    });

    const catLabels = Object.keys(catMap).length > 0 ? Object.keys(catMap) : ['Cơ sở vật chất', 'Máy tính', 'Máy chiếu', 'Mạng Wifi', 'Khác'];
    const catData = Object.keys(catMap).length > 0 ? Object.values(catMap) : [0, 0, 0, 0, 0];

    const ctxCat = document.getElementById('chart-category')?.getContext('2d');
    if (ctxCat) {
      if (this.charts.category) this.charts.category.destroy();
      this.charts.category = new Chart(ctxCat, {
        type: 'pie',
        data: {
          labels: catLabels,
          datasets: [{
            data: catData,
            backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#64748b']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
      });
    }

    // ----------------------------------------------------
    // 5. BIỂU ĐỒ 5: THEO KHOA / PHÒNG / KTX (Horizontal Bar)
    // ----------------------------------------------------
    const deptMap = {};
    items.forEach(i => {
      const dept = i.departmentName || i.senderDept || i.department || 'Chưa phân loại';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const deptLabels = Object.keys(deptMap).length > 0 ? Object.keys(deptMap) : ['Khoa CNTT', 'Khoa Điện', 'Ban QL Ký túc xá', 'Phòng Đào tạo'];
    const deptData = Object.keys(deptMap).length > 0 ? Object.values(deptMap) : [0, 0, 0, 0];

    const ctxDept = document.getElementById('chart-department')?.getContext('2d');
    if (ctxDept) {
      if (this.charts.department) this.charts.department.destroy();
      this.charts.department = new Chart(ctxDept, {
        type: 'bar',
        data: {
          labels: deptLabels,
          datasets: [{
            label: 'Số sự cố',
            data: deptData,
            backgroundColor: '#d97706',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // ----------------------------------------------------
    // 6. BIỂU ĐỒ 6: KHỐI LƯỢNG XỬ LÝ THEO NHÂN VIÊN KTV (Bar)
    // ----------------------------------------------------
    const staffDoneMap = {};
    const staffActiveMap = {};
    items.forEach(i => {
      const staff = i.assignedToName || 'Chưa phân công';
      if (i.status === 'HOÀN THÀNH') {
        staffDoneMap[staff] = (staffDoneMap[staff] || 0) + 1;
      } else {
        staffActiveMap[staff] = (staffActiveMap[staff] || 0) + 1;
      }
    });

    const allStaffNames = Array.from(new Set([...Object.keys(staffDoneMap), ...Object.keys(staffActiveMap)]));
    const staffLabels = allStaffNames.length > 0 ? allStaffNames : ['Chưa có KTV nhận việc'];
    const doneSeries = staffLabels.map(s => staffDoneMap[s] || 0);
    const activeSeries = staffLabels.map(s => staffActiveMap[s] || 0);

    const ctxStaff = document.getElementById('chart-staff')?.getContext('2d');
    if (ctxStaff) {
      if (this.charts.staff) this.charts.staff.destroy();
      this.charts.staff = new Chart(ctxStaff, {
        type: 'bar',
        data: {
          labels: staffLabels,
          datasets: [
            {
              label: 'Đã hoàn thành',
              data: doneSeries,
              backgroundColor: '#059669',
              borderRadius: 6
            },
            {
              label: 'Đang xử lý / Chờ',
              data: activeSeries,
              backgroundColor: '#3b82f6',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // ----------------------------------------------------
    // 7. BIỂU ĐỒ 7: TỶ LỆ HOÀN THÀNH (Gauge / Doughnut)
    // ----------------------------------------------------
    const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const rateText = document.getElementById('rate-percent-text');
    if (rateText) rateText.innerText = `${rate}%`;

    const ctxRate = document.getElementById('chart-completion-rate')?.getContext('2d');
    if (ctxRate) {
      if (this.charts.rate) this.charts.rate.destroy();
      this.charts.rate = new Chart(ctxRate, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [rate, 100 - rate],
            backgroundColor: ['#10b981', '#e2e8f0'],
            cutout: '78%',
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { enabled: false } } }
      });
    }

    // ----------------------------------------------------
    // 8. BIỂU ĐỒ 8: TÍNH TOÁN THỜI GIAN XỬ LÝ TRUNG BÌNH THẬT
    // ----------------------------------------------------
    const completedItems = items.filter(i => i.status === 'HOÀN THÀNH' && i.createdAt && (i.completedAt || i.updatedAt));
    let avgHours = 0;
    let emergencyAvgHours = 0;
    let normalAvgHours = 0;

    if (completedItems.length > 0) {
      const totalHours = completedItems.reduce((acc, curr) => {
        const start = new Date(curr.createdAt).getTime();
        const end = new Date(curr.completedAt || curr.updatedAt).getTime();
        const diff = Math.max(0, (end - start) / (1000 * 60 * 60));
        return acc + diff;
      }, 0);
      avgHours = (totalHours / completedItems.length).toFixed(1);

      const emergencyItems = completedItems.filter(i => i.priority === 'KHẨN CẤP');
      if (emergencyItems.length > 0) {
        const eTotal = emergencyItems.reduce((acc, curr) => {
          const start = new Date(curr.createdAt).getTime();
          const end = new Date(curr.completedAt || curr.updatedAt).getTime();
          return acc + Math.max(0, (end - start) / (1000 * 60 * 60));
        }, 0);
        emergencyAvgHours = (eTotal / emergencyItems.length).toFixed(1);
      }

      const normalItems = completedItems.filter(i => i.priority !== 'KHẨN CẤP');
      if (normalItems.length > 0) {
        const nTotal = normalItems.reduce((acc, curr) => {
          const start = new Date(curr.createdAt).getTime();
          const end = new Date(curr.completedAt || curr.updatedAt).getTime();
          return acc + Math.max(0, (end - start) / (1000 * 60 * 60));
        }, 0);
        normalAvgHours = (nTotal / normalItems.length).toFixed(1);
      }
    }

    const avgHoursEl = document.getElementById('avg-hours-text');
    if (avgHoursEl) {
      avgHoursEl.innerText = completedItems.length > 0 ? `${avgHours}h` : 'Chưa có';
    }

    const emergencyBadge = document.getElementById('emergency-sla-badge');
    if (emergencyBadge) {
      emergencyBadge.innerText = emergencyAvgHours > 0 ? `Khẩn cấp: ${emergencyAvgHours}h` : 'Khẩn cấp: 0h';
    }

    const normalBadge = document.getElementById('normal-sla-badge');
    if (normalBadge) {
      normalBadge.innerText = normalAvgHours > 0 ? `Bình thường: ${normalAvgHours}h` : 'Bình thường: 0h';
    }
  }
};

window.DashboardPage = DashboardPage;

