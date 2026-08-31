/**
 * NSG SUPPORT - LEAVE MANAGEMENT SYSTEM & DASHBOARD PAGE
 * Hệ thống Quản lý Ngày phép đa năm, Phép âm, Duyệt đơn nghỉ phép và Audit log
 */

const LeaveManagementPage = {
  selectedYear: new Date().getFullYear(),
  employees: [],
  leaveBalances: [],
  leaveRequests: [],
  auditLogs: [],
  policy: null,
  isLoading: true,
  activeTab: 'DASHBOARD', // DASHBOARD, REQUESTS, HISTORY, SETTINGS
  requestStatusFilter: 'ALL',
  searchQuery: '',

  async init() {
    this.selectedYear = new Date().getFullYear();
    await this.loadData();
  },

  async loadData() {
    this.isLoading = true;
    const container = document.getElementById('leave-content-container');
    if (container) container.innerHTML = this.renderLoading();

    try {
      const db = ApiService.getDb();
      const [empList, balances, requests, pol, logsSnap] = await Promise.all([
        ApiService.loadEmployees(),
        ApiService.loadLeaveBalances(this.selectedYear),
        ApiService.loadLeaveRequests(this.selectedYear),
        ApiService.loadLeavePolicy(),
        db.collection('leave_audit_logs').orderBy('performedAt', 'desc').limit(50).get().catch(() => ({ docs: [] }))
      ]);

      this.employees = (empList || []).filter(e => e.status !== 'INACTIVE');
      this.leaveRequests = requests || [];
      this.policy = pol;

      // Xây dựng balances map
      const balMap = {};
      (balances || []).forEach(b => {
        balMap[b.employeeId] = b;
      });

      // Đảm bảo mọi nhân sự đều có bản ghi balance của năm đã chọn
      for (const emp of this.employees) {
        if (!balMap[emp.id]) {
          const newBal = await ApiService.getOrCreateLeaveBalance(emp.id, emp.fullName, this.selectedYear);
          if (newBal) balMap[emp.id] = newBal;
        }
      }

      this.leaveBalances = Object.values(balMap);

      // Audit logs
      const logs = [];
      if (logsSnap && logsSnap.docs) {
        logsSnap.docs.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
      }
      this.auditLogs = logs;
    } catch (err) {
      console.error('[LeaveManagementPage] Lỗi tải dữ liệu:', err);
      Utils.showToast('Lỗi khi tải dữ liệu ngày phép: ' + err.message, 'error');
    }

    this.isLoading = false;
    this.renderView();
  },

  renderLoading() {
    return `
      <div class="p-16 text-center text-slate-400">
        <div class="inline-block animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mb-3"></div>
        <p class="text-xs font-bold text-slate-600">Đang đồng bộ dữ liệu ngày phép và lịch sử nghỉ...</p>
      </div>
    `;
  },

  render() {
    setTimeout(() => this.init(), 50);

    const isManager = AuthService.canApproveLeave();
    const isPolicyAdmin = AuthService.canEditLeavePolicy();

    return `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <!-- Top Title & Action Bar -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <i class="fa-solid fa-calendar-check text-emerald-600"></i>
                <span>Nội Bộ Phòng Quản Trị Thiết Bị & CSVC</span>
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <i class="fa-solid fa-umbrella-beach text-emerald-600"></i>
              <span>HỆ THỐNG QUẢN LÝ NGÀY PHÉP</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Theo dõi quỹ phép 12 ngày/năm, xử lý phép âm chuyển tiếp, duyệt đơn nghỉ phép tự động và audit log
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <!-- Dropdown chọn năm phép -->
            <div class="relative">
              <select id="leave-year-selector" class="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-2xl border-0 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs" onchange="LeaveManagementPage.handleYearChange(this.value)">
                <option value="2025" ${this.selectedYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                <option value="2026" ${this.selectedYear === 2026 ? 'selected' : ''}>Năm 2026 (Hiện tại)</option>
                <option value="2027" ${this.selectedYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                <option value="2028" ${this.selectedYear === 2028 ? 'selected' : ''}>Năm 2028</option>
              </select>
            </div>

            <!-- Nút Chuyển kỳ phép sang năm mới (Chuyển phép âm) -->
            ${isPolicyAdmin ? `
              <button type="button" class="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black rounded-2xl border border-purple-200 transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="LeaveManagementPage.handleRolloverPrompt()">
                <i class="fa-solid fa-arrows-rotate text-purple-600"></i>
                <span class="hidden sm:inline">Chuyển kỳ sang ${this.selectedYear + 1}</span>
              </button>
            ` : ''}

            <!-- Nút Tạo đơn nghỉ phép -->
            <button type="button" class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="LeaveManagementPage.openCreateRequestModal()">
              <i class="fa-solid fa-calendar-plus text-sm"></i>
              <span>+ ĐĂNG KÝ NGHỈ PHÉP</span>
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
          <button type="button" class="leave-nav-tab px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${this.activeTab === 'DASHBOARD' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}" onclick="LeaveManagementPage.switchTab('DASHBOARD')">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Dashboard & Quỹ phép năm ${this.selectedYear}</span>
          </button>

          <button type="button" class="leave-nav-tab px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${this.activeTab === 'REQUESTS' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}" onclick="LeaveManagementPage.switchTab('REQUESTS')">
            <i class="fa-solid fa-list-check"></i>
            <span>Danh sách đơn xin nghỉ phép</span>
            <span id="leave-pending-count-badge" class="hidden px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">0</span>
          </button>

          <button type="button" class="leave-nav-tab px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${this.activeTab === 'HISTORY' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}" onclick="LeaveManagementPage.switchTab('HISTORY')">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Lịch sử thay đổi (Audit Log)</span>
          </button>

          ${isPolicyAdmin ? `
            <button type="button" class="leave-nav-tab px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${this.activeTab === 'SETTINGS' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}" onclick="LeaveManagementPage.switchTab('SETTINGS')">
              <i class="fa-solid fa-sliders"></i>
              <span>Cấu hình chính sách phép</span>
            </button>
          ` : ''}
        </div>

        <!-- Main Content Area -->
        <div id="leave-content-container">
          ${this.renderLoading()}
        </div>
      </div>

      <!-- Container Modal -->
      <div id="leave-modal-container"></div>
    `;
  },

  renderView() {
    const container = document.getElementById('leave-content-container');
    if (!container) return;

    if (this.activeTab === 'DASHBOARD') {
      container.innerHTML = this.renderDashboardTab();
    } else if (this.activeTab === 'REQUESTS') {
      container.innerHTML = this.renderRequestsTab();
    } else if (this.activeTab === 'HISTORY') {
      container.innerHTML = this.renderHistoryTab();
    } else if (this.activeTab === 'SETTINGS') {
      container.innerHTML = this.renderSettingsTab();
    }

    this.updatePendingBadge();
  },

  updatePendingBadge() {
    const pendingCount = this.leaveRequests.filter(r => r.status === 'PENDING').length;
    const badge = document.getElementById('leave-pending-count-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.innerText = pendingCount;
        badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse';
      } else {
        badge.className = 'hidden';
      }
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.renderView();
  },

  async handleYearChange(year) {
    this.selectedYear = Number(year);
    await this.loadData();
  },

  // ========================================================
  // TAB 1: DASHBOARD & BẢNG THEO DÕI PHÉP NHANH
  // ========================================================
  renderDashboardTab() {
    const totalStaff = this.employees.length;
    const todayStr = new Date().toISOString().split('T')[0];

    const onLeaveEmpIds = new Set();
    this.leaveRequests.forEach(r => {
      if (r.status === 'APPROVED' && r.startDate <= todayStr && r.endDate >= todayStr) {
        onLeaveEmpIds.add(r.employeeId);
      }
    });

    let warningCount = 0; // <= 3 ngày
    let exhaustedCount = 0; // = 0 ngày
    let negativeCount = 0; // < 0 ngày
    let remainingPositiveCount = 0;

    const warningList = [];
    const exhaustedList = [];
    const negativeList = [];

    this.employees.forEach(emp => {
      const bal = this.leaveBalances.find(b => b.employeeId === emp.id) || { remainingLeave: 12 };
      const rem = Number(bal.remainingLeave);

      if (rem < 0) {
        negativeCount++;
        negativeList.push({ emp, rem });
      } else if (rem === 0) {
        exhaustedCount++;
        exhaustedList.push(emp);
      } else if (rem <= 3) {
        warningCount++;
        warningList.push({ emp, rem });
      } else {
        remainingPositiveCount++;
      }
    });

    return `
      <div class="space-y-6">
        <!-- 6 Thẻ Thống Kê Chuẩn Theo Yêu Cầu Mục 10 -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <!-- 1. TỔNG SỐ NHÂN SỰ -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">TỔNG NHÂN SỰ</span>
            <div class="text-2xl font-black text-slate-900 mt-1">${totalStaff}</div>
          </div>

          <!-- 2. ĐANG CÔNG TÁC -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ĐANG LÀM VIỆC</span>
            <div class="text-2xl font-black text-emerald-600 mt-1">${totalStaff - onLeaveEmpIds.size}</div>
          </div>

          <!-- 3. ĐANG NGHỈ PHÉP -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ĐANG NGHỈ PHÉP</span>
            <div class="text-2xl font-black text-amber-600 mt-1">${onLeaveEmpIds.size}</div>
          </div>

          <!-- 4. SẮP HẾT PHÉP -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">SẮP HẾT PHÉP</span>
            <div class="text-2xl font-black text-yellow-600 mt-1">${warningCount}</div>
          </div>

          <!-- 5. ĐÃ HẾT PHÉP -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ĐÃ HẾT PHÉP</span>
            <div class="text-2xl font-black text-orange-600 mt-1">${exhaustedCount}</div>
          </div>

          <!-- 6. ĐANG ÂM PHÉP -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ĐANG ÂM PHÉP</span>
            <div class="text-2xl font-black text-rose-600 mt-1">${negativeCount}</div>
          </div>
        </div>

        <!-- Khung Cảnh Báo Phép (Mục 12) -->
        ${(negativeList.length > 0 || exhaustedList.length > 0 || warningList.length > 0) ? `
          <div class="p-5 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-xs space-y-3">
            <div class="flex items-center gap-2 text-xs font-black text-rose-800 uppercase tracking-wider">
              <i class="fa-solid fa-triangle-exclamation text-rose-600 text-base"></i>
              <span>⚠️ CẢNH BÁO TÌNH HÌNH SỬ DỤNG NGÀY PHÉP NĂM ${this.selectedYear}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              ${negativeList.length > 0 ? `
                <div class="p-3 bg-white rounded-2xl border border-rose-200 shadow-2xs space-y-1.5">
                  <span class="font-extrabold text-rose-700 block">🔴 Nhân sự đang âm phép (${negativeList.length}):</span>
                  <ul class="space-y-1 text-[11px] text-slate-700">
                    ${negativeList.map(item => `
                      <li class="flex items-center justify-between">
                        <span class="font-bold">${item.emp.fullName}:</span>
                        <span class="font-black text-rose-600">Âm ${Math.abs(item.rem)} ngày</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              ${exhaustedList.length > 0 ? `
                <div class="p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs space-y-1.5">
                  <span class="font-extrabold text-amber-800 block">🟠 Nhân sự đã hết 100% phép (${exhaustedList.length}):</span>
                  <ul class="space-y-1 text-[11px] text-slate-700">
                    ${exhaustedList.map(emp => `
                      <li class="flex items-center justify-between">
                        <span class="font-bold">${emp.fullName}:</span>
                        <span class="font-bold text-amber-700">Đã nghỉ đủ 12 ngày</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              ${warningList.length > 0 ? `
                <div class="p-3 bg-white rounded-2xl border border-yellow-200 shadow-2xs space-y-1.5">
                  <span class="font-extrabold text-yellow-800 block">🟡 Nhân sự sắp hết phép (${warningList.length}):</span>
                  <ul class="space-y-1 text-[11px] text-slate-700">
                    ${warningList.map(item => `
                      <li class="flex items-center justify-between">
                        <span class="font-bold">${item.emp.fullName}:</span>
                        <span class="font-bold text-yellow-700">Còn ${item.rem} ngày</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- BẢNG THEO DÕI PHÉP NHANH (Mục 11) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <i class="fa-solid fa-table-list text-emerald-600"></i>
                <span>BẢNG THEO DÕI QUỸ PHÉP TOÀN BỘ NHÂN SỰ (${this.selectedYear})</span>
              </h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Tự động tính theo công thức: Còn lại = Phép năm + Chuyển tiếp - Đã nghỉ</p>
            </div>

            <button type="button" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer" onclick="LeaveManagementPage.exportLeaveReport()">
              <i class="fa-solid fa-file-excel text-emerald-600"></i>
              <span>Xuất Báo Cáo Phép</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th class="py-3 px-3 text-center w-12">STT</th>
                  <th class="py-3 px-4">HỌ VÀ TÊN</th>
                  <th class="py-3 px-3">CHỨC VỤ</th>
                  <th class="py-3 px-3 text-center">PHÉP NĂM</th>
                  <th class="py-3 px-3 text-center">CHUYỂN TIẾP</th>
                  <th class="py-3 px-3 text-center">ĐÃ NGHỈ</th>
                  <th class="py-3 px-3 text-center">CÒN LẠI</th>
                  <th class="py-3 px-3 text-center">PHÉP ÂM</th>
                  <th class="py-3 px-4 text-center">TRẠNG THÁI</th>
                  <th class="py-3 px-3 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                ${this.employees.map((emp, index) => {
                  const bal = this.leaveBalances.find(b => b.employeeId === emp.id) || { annualLeave: 12, carryForward: 0, usedLeave: 0, remainingLeave: 12, negativeLeave: 0 };
                  const annual = Number(bal.annualLeave) || 12;
                  const carry = Number(bal.carryForward) || 0;
                  const used = Number(bal.usedLeave) || 0;
                  const rem = Number(bal.remainingLeave);
                  const neg = Number(bal.negativeLeave) || 0;

                  let statusBadge = '';
                  if (rem < 0) {
                    statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">Âm phép</span>';
                  } else if (rem === 0) {
                    statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">Hết phép</span>';
                  } else if (rem <= 3) {
                    statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-yellow-100 text-yellow-800 border border-yellow-200">Sắp hết phép</span>';
                  } else {
                    statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Còn phép</span>';
                  }

                  return `
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="py-3 px-3 text-center text-slate-400 font-bold">${String(index + 1).padStart(2, '0')}</td>
                      <td class="py-3 px-4 font-black text-slate-900">${emp.fullName}</td>
                      <td class="py-3 px-3 text-slate-600 text-[11px]">${emp.position || 'Nhân viên'}</td>
                      <td class="py-3 px-3 text-center font-bold text-blue-900">${annual}</td>
                      <td class="py-3 px-3 text-center font-bold ${carry < 0 ? 'text-rose-600' : 'text-purple-700'}">
                        ${carry > 0 ? '+' : ''}${carry}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-amber-800">${used}</td>
                      <td class="py-3 px-3 text-center font-black ${rem < 0 ? 'text-rose-600 text-sm' : (rem === 0 ? 'text-slate-400' : 'text-emerald-700 text-sm')}">
                        ${rem}
                      </td>
                      <td class="py-3 px-3 text-center font-black ${neg > 0 ? 'text-rose-600' : 'text-slate-300'}">
                        ${neg > 0 ? neg : '0'}
                      </td>
                      <td class="py-3 px-4 text-center whitespace-nowrap">${statusBadge}</td>
                      <td class="py-3 px-3 text-center whitespace-nowrap">
                        <button type="button" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs" onclick="LeaveManagementPage.openCreateRequestModal('${emp.id}')">
                          + Đăng ký
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ========================================================
  // TAB 2: QUẢN LÝ ĐƠN NGHỈ PHÉP
  // ========================================================
  renderRequestsTab() {
    let list = this.leaveRequests;
    if (this.requestStatusFilter !== 'ALL') {
      list = list.filter(r => r.status === this.requestStatusFilter);
    }

    const isApprover = AuthService.canApproveLeave();

    return `
      <div class="space-y-4">
        <!-- Bộ lọc trạng thái đơn -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center gap-1.5 overflow-x-auto">
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.requestStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" onclick="LeaveManagementPage.filterRequestStatus('ALL')">
              Tất cả (${this.leaveRequests.length})
            </button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.requestStatusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}" onclick="LeaveManagementPage.filterRequestStatus('PENDING')">
              Chờ duyệt (${this.leaveRequests.filter(r => r.status === 'PENDING').length})
            </button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.requestStatusFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}" onclick="LeaveManagementPage.filterRequestStatus('APPROVED')">
              Đã duyệt (${this.leaveRequests.filter(r => r.status === 'APPROVED').length})
            </button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.requestStatusFilter === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}" onclick="LeaveManagementPage.filterRequestStatus('REJECTED')">
              Từ chối (${this.leaveRequests.filter(r => r.status === 'REJECTED').length})
            </button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.requestStatusFilter === 'CANCELLED' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" onclick="LeaveManagementPage.filterRequestStatus('CANCELLED')">
              Đã hủy (${this.leaveRequests.filter(r => r.status === 'CANCELLED').length})
            </button>
          </div>

          <button type="button" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5" onclick="LeaveManagementPage.openCreateRequestModal()">
            <i class="fa-solid fa-plus"></i>
            <span>Tạo đơn mới</span>
          </button>
        </div>

        <!-- Bảng danh sách đơn nghỉ phép -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <th class="py-3 px-3 text-center">STT</th>
                  <th class="py-3 px-3">MÃ ĐƠN</th>
                  <th class="py-3 px-4">NHÂN SỰ</th>
                  <th class="py-3 px-3">THỜI GIAN NGHỈ</th>
                  <th class="py-3 px-2 text-center">SỐ NGÀY</th>
                  <th class="py-3 px-3">LOẠI PHÉP</th>
                  <th class="py-3 px-4">LÝ DO</th>
                  <th class="py-3 px-3 text-center">TRẠNG THÁI</th>
                  <th class="py-3 px-3">NGƯỜI DUYỆT</th>
                  <th class="py-3 px-4 text-center w-32">THAO TÁC</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                ${list.length === 0 ? `
                  <tr>
                    <td colspan="10" class="p-12 text-center text-slate-400">
                      <p class="font-bold">Không có đơn nghỉ phép nào trong trạng thái này.</p>
                    </td>
                  </tr>
                ` : list.map((r, idx) => `
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-3 text-center text-slate-400 font-bold">${idx + 1}</td>
                    <td class="py-3 px-3 font-mono font-bold text-indigo-600 text-[11px]">${r.requestCode}</td>
                    <td class="py-3 px-4 font-black text-slate-900">${r.employeeName}</td>
                    <td class="py-3 px-3 font-semibold whitespace-nowrap text-slate-800">
                      ${r.startDate} <i class="fa-solid fa-arrow-right text-[9px] text-slate-400 mx-1"></i> ${r.endDate}
                    </td>
                    <td class="py-3 px-2 text-center font-black text-indigo-700">${r.leaveDays} ngày</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${r.leaveType === 'ANNUAL' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'}">
                        ${r.leaveType === 'ANNUAL' ? 'Phép năm' : (r.leaveType === 'SICK' ? 'Nghỉ ốm' : (r.leaveType === 'PERSONAL_PAID' ? 'Việc riêng' : 'Khác'))}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600 truncate max-w-[160px]" title="${r.reason || ''}">${r.reason || '---'}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-black ${
                        r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        (r.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        (r.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'))
                      }">
                        ${r.status === 'APPROVED' ? 'Đã duyệt' : (r.status === 'PENDING' ? 'Chờ duyệt' : (r.status === 'REJECTED' ? 'Từ chối' : 'Đã hủy'))}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-[11px] text-slate-500">
                      ${r.approvedByName ? `<div>${r.approvedByName}</div><span class="text-[9px] text-slate-400">${Utils.timeAgo(r.approvedAt)}</span>` : '---'}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${r.status === 'PENDING' && isApprover ? `
                        <div class="flex items-center justify-center gap-1">
                          <button type="button" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-2xs" title="Duyệt đơn & Trừ phép" onclick="LeaveManagementPage.handleApprove('${r.id}')">
                            <i class="fa-solid fa-check mr-1"></i>Duyệt
                          </button>
                          <button type="button" class="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg text-[10px] font-bold cursor-pointer" title="Từ chối" onclick="LeaveManagementPage.handleRejectPrompt('${r.id}')">
                            <i class="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ` : (r.status === 'APPROVED' && isApprover ? `
                        <button type="button" class="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer" title="Hủy đơn đã duyệt và hoàn phép" onclick="LeaveManagementPage.handleCancelPrompt('${r.id}')">
                          <i class="fa-solid fa-ban mr-1"></i>Hủy & Hoàn phép
                        </button>
                      ` : '---')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  filterRequestStatus(status) {
    this.requestStatusFilter = status;
    this.renderView();
  },

  async handleApprove(requestId) {
    try {
      await ApiService.approveLeaveRequest(requestId);
      Utils.showToast('Đã duyệt đơn nghỉ phép và tự động cập nhật số dư phép!', 'success');
      await this.loadData();
    } catch (e) {
      Utils.showToast('Lỗi duyệt đơn: ' + e.message, 'error');
    }
  },

  async handleRejectPrompt(requestId) {
    const reason = prompt('Nhập lý do từ chối đơn nghỉ phép:');
    if (reason === null) return;

    try {
      await ApiService.rejectLeaveRequest(requestId, reason);
      Utils.showToast('Đã từ chối đơn nghỉ phép.', 'warning');
      await this.loadData();
    } catch (e) {
      Utils.showToast('Lỗi từ chối đơn: ' + e.message, 'error');
    }
  },

  async handleCancelPrompt(requestId) {
    const reason = prompt('Nhập lý do hủy đơn đã duyệt (Hệ thống sẽ hoàn trả lại số ngày phép):');
    if (reason === null) return;

    try {
      await ApiService.cancelLeaveRequest(requestId, reason);
      Utils.showToast('Đã hủy đơn và hoàn trả lại số ngày phép cho nhân sự thành công!', 'success');
      await this.loadData();
    } catch (e) {
      Utils.showToast('Lỗi hủy đơn: ' + e.message, 'error');
    }
  },

  // ========================================================
  // TAB 3: AUDIT LOG (LỊCH SỬ THAY ĐỔI)
  // ========================================================
  renderHistoryTab() {
    return `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-200">
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-blue-600"></i>
            <span>NHẬT KÝ BIẾN ĐỘNG NGÀY PHÉP & THAO TÁC DUYỆT (AUDIT LOG)</span>
          </h3>
          <p class="text-[11px] text-slate-500 mt-0.5">Toàn bộ thao tác tạo đơn, duyệt, từ chối, hủy đơn và điều chỉnh phép đều được lưu vết minh bạch</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-3 px-3 text-center">STT</th>
                <th class="py-3 px-4">THỜI GIAN</th>
                <th class="py-3 px-4">NHÂN SỰ LIÊN QUAN</th>
                <th class="py-3 px-4">HÀNH ĐỘNG</th>
                <th class="py-3 px-4">NGƯỜI THỰC HIỆN</th>
                <th class="py-3 px-5">CHI TIẾT / GHI CHÚ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
              ${this.auditLogs.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-10 text-center text-slate-400">
                    Chưa có nhật ký ghi nhận nào.
                  </td>
                </tr>
              ` : this.auditLogs.map((l, i) => `
                <tr class="hover:bg-slate-50">
                  <td class="py-3 px-3 text-center text-slate-400 font-bold">${i + 1}</td>
                  <td class="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    ${new Date(l.performedAt).toLocaleString('vi-VN')}
                  </td>
                  <td class="py-3 px-4 font-black text-slate-900">${l.employeeName || 'Hệ thống'}</td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black ${
                      l.action.includes('DUYỆT') ? 'bg-emerald-100 text-emerald-800' :
                      (l.action.includes('TẠO') ? 'bg-blue-100 text-blue-800' :
                      (l.action.includes('TỪ CHỐI') || l.action.includes('HỦY') ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'))
                    }">
                      ${l.action}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-bold text-slate-800 text-[11px]">${l.performedByName || 'Quản trị viên'}</td>
                  <td class="py-3 px-5 text-slate-600 text-xs">${l.note || '---'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ========================================================
  // TAB 4: CẤU HÌNH CHÍNH SÁCH PHÉP (MỤC 20)
  // ========================================================
  renderSettingsTab() {
    const pol = this.policy || {
      defaultAnnualLeave: 12,
      allowNegativeLeave: true,
      allowCarryForwardPositive: false,
      maxCarryForwardPositiveDays: 3,
      excludeWeekends: true
    };

    return `
      <div class="max-w-2xl bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-sliders text-emerald-600"></i>
            <span>THIẾT LẬP CHÍNH SÁCH NGÀY PHÉP TOÀN ĐƠN VỊ</span>
          </h3>
          <p class="text-xs text-slate-500 mt-1">Quy định số ngày phép chuẩn, cơ chế phép âm và quy tắc chuyển tiếp sang năm sau</p>
        </div>

        <form onsubmit="LeaveManagementPage.handleSavePolicy(event)" class="space-y-4 text-xs">
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label class="block font-bold text-slate-900">Số ngày phép mặc định mỗi năm:</label>
            <input type="number" id="p-default-annual" value="${pol.defaultAnnualLeave || 12}" class="w-full sm:w-32 p-2.5 bg-white border border-slate-300 rounded-xl font-black text-sm text-slate-900" required>
            <span class="text-[11px] text-slate-500 block">Theo quy định chuẩn là 12 ngày/năm cho mỗi nhân sự chính thức.</span>
          </div>

          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="p-allow-negative" class="w-5 h-5 text-emerald-600 rounded" ${pol.allowNegativeLeave ? 'checked' : ''}>
              <div>
                <span class="font-extrabold text-slate-900 text-xs block">Cho phép ghi nhận Phép Âm (Dùng trước phép khi đã hết 12 ngày)</span>
                <span class="text-[11px] text-slate-500">Khi nhân sự nghỉ quá 12 ngày, hệ thống sẽ ghi nhận số âm và tự động chuyển sang trừ vào năm sau.</span>
              </div>
            </label>
          </div>

          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="p-allow-carry-positive" class="w-5 h-5 text-emerald-600 rounded" ${pol.allowCarryForwardPositive ? 'checked' : ''}>
              <div>
                <span class="font-extrabold text-slate-900 text-xs block">Cho phép chuyển ngày phép DƯƠNG còn lại sang năm sau</span>
                <span class="text-[11px] text-slate-500">Nếu bật, số phép chưa nghỉ hết của năm cũ sẽ được cộng thêm vào quỹ phép đầu năm mới.</span>
              </div>
            </label>

            <div class="pl-8 flex items-center gap-2">
              <span class="text-[11px] font-bold text-slate-700">Số ngày dương tối đa được chuyển:</span>
              <input type="number" id="p-max-positive" value="${pol.maxCarryForwardPositiveDays || 3}" class="w-20 p-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold">
            </div>
          </div>

          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="p-exclude-weekends" class="w-5 h-5 text-emerald-600 rounded" ${pol.excludeWeekends ? 'checked' : ''}>
              <div>
                <span class="font-extrabold text-slate-900 text-xs block">Tự động loại trừ Thứ 7 và Chủ Nhật khi tính số ngày nghỉ</span>
                <span class="text-[11px] text-slate-500">Ví dụ: Nghỉ từ Thứ 6 đến Thứ 2 tuần sau sẽ chỉ tính là 2 ngày làm việc.</span>
              </div>
            </label>
          </div>

          <div class="pt-2 flex justify-end">
            <button type="submit" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md cursor-pointer flex items-center gap-2">
              <i class="fa-solid fa-save"></i>
              <span>LƯU CẤU HÌNH CHÍNH SÁCH</span>
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async handleSavePolicy(e) {
    e.preventDefault();

    const policyData = {
      defaultAnnualLeave: Number(document.getElementById('p-default-annual').value) || 12,
      allowNegativeLeave: document.getElementById('p-allow-negative').checked,
      allowCarryForwardPositive: document.getElementById('p-allow-carry-positive').checked,
      maxCarryForwardPositiveDays: Number(document.getElementById('p-max-positive').value) || 3,
      excludeWeekends: document.getElementById('p-exclude-weekends').checked
    };

    try {
      await ApiService.saveLeavePolicy(policyData);
      Utils.showToast('Đã lưu cấu hình chính sách ngày phép thành công!', 'success');
      this.policy = policyData;
    } catch (err) {
      Utils.showToast('Lỗi lưu cấu hình: ' + err.message, 'error');
    }
  },

  // ========================================================
  // CHUYỂN KỲ PHÉP SANG NĂM MỚI (TỰ ĐỘNG CHUYỂN PHÉP ÂM)
  // ========================================================
  async handleRolloverPrompt() {
    const nextYear = this.selectedYear + 1;
    if (!confirm(`XÁC NHẬN CHUYỂN KỲ PHÉP SANG NĂM ${nextYear}?\n\nHệ thống sẽ tự động:\n1. Khởi tạo kỳ phép ${nextYear} cho toàn bộ nhân sự (${this.policy?.defaultAnnualLeave || 12} ngày).\n2. Tự động chuyển toàn bộ số PHÉP ÂM của năm ${this.selectedYear} sang trừ vào đầu năm ${nextYear}.\n3. Xử lý chuyển phép dương theo chính sách hiện hành.\n\nLịch sử ngày phép năm ${this.selectedYear} vẫn được lưu trữ nguyên vẹn.`)) {
      return;
    }

    try {
      const res = await ApiService.rolloverNewYearBalances(nextYear);
      Utils.showToast(`Đã tạo thành công kỳ phép năm ${nextYear} cho ${res.count} nhân sự!`, 'success');
      this.selectedYear = nextYear;
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi chuyển kỳ phép: ' + err.message, 'error');
    }
  },

  // ========================================================
  // MODAL: ĐĂNG KÝ NGHỈ PHÉP TỔNG HỢP
  // ========================================================
  openCreateRequestModal(preSelectedEmpId = '') {
    const container = document.getElementById('leave-modal-container');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div id="leave-request-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
          <div class="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center text-base font-black">
                <i class="fa-solid fa-umbrella-beach"></i>
              </div>
              <div>
                <h3 class="text-sm font-black">ĐĂNG KÝ NGHỈ PHÉP NỘI BỘ</h3>
                <p class="text-[11px] text-emerald-100 font-medium">Tự động tính ngày nghỉ và điều chỉnh quỹ phép</p>
              </div>
            </div>
            <button class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('leave-request-modal').remove()">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          <form onsubmit="LeaveManagementPage.handleCreateRequestSubmit(event)" class="p-5 space-y-3.5 text-xs">
            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Chọn Nhân sự <span class="text-rose-500">*</span>:</label>
              <select id="req-emp-select" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500" required>
                ${this.employees.map(e => `
                  <option value="${e.id}" data-name="${e.fullName}" ${preSelectedEmpId === e.id ? 'selected' : ''}>
                    ${e.fullName} (${e.employeeCode} - ${e.position})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Từ ngày <span class="text-rose-500">*</span>:</label>
                <input type="date" id="req-start-date" value="${todayStr}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500" required onchange="LeaveManagementPage.calcModalDays()">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Đến ngày <span class="text-rose-500">*</span>:</label>
                <input type="date" id="req-end-date" value="${todayStr}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500" required onchange="LeaveManagementPage.calcModalDays()">
              </div>
            </div>

            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-900">Tổng số ngày nghỉ (trừ T7/CN):</span>
              <span id="req-days-display" class="text-sm font-black text-emerald-700">1 ngày</span>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Loại phép:</label>
              <select id="req-leave-type" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500">
                <option value="ANNUAL">Phép năm (Trừ vào quỹ phép năm)</option>
                <option value="SICK">Nghỉ ốm / Khám bệnh / Thai sản</option>
                <option value="PERSONAL_PAID">Việc riêng có lương</option>
                <option value="UNPAID">Nghỉ việc riêng không lương</option>
                <option value="COMPENSATORY">Nghỉ bù</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Lý do nghỉ <span class="text-rose-500">*</span>:</label>
              <input type="text" id="req-reason" placeholder="VD: Việc gia đình, Giải quyết việc riêng..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500" required>
            </div>

            ${AuthService.canApproveLeave() ? `
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="req-auto-approve" class="w-4 h-4 text-emerald-600 rounded" checked>
                  <span class="text-xs font-extrabold text-slate-800">Duyệt đơn và trừ phép ngay lập tức</span>
                </label>
              </div>
            ` : ''}

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('leave-request-modal').remove()">
                Hủy
              </button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-paper-plane"></i>
                <span>GỬI ĐƠN NGHỈ PHÉP</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    this.calcModalDays();
  },

  calcModalDays() {
    const start = document.getElementById('req-start-date')?.value;
    const end = document.getElementById('req-end-date')?.value;
    const count = ApiService.calculateLeaveDays(start, end, true);
    const display = document.getElementById('req-days-display');
    if (display) display.innerText = `${count} ngày`;
  },

  async handleCreateRequestSubmit(e) {
    e.preventDefault();

    const empSelect = document.getElementById('req-emp-select');
    const empId = empSelect.value;
    const empName = empSelect.options[empSelect.selectedIndex].getAttribute('data-name');
    const start = document.getElementById('req-start-date').value;
    const end = document.getElementById('req-end-date').value;
    const leaveType = document.getElementById('req-leave-type').value;
    const reason = document.getElementById('req-reason').value.trim();
    const isAutoApprove = document.getElementById('req-auto-approve')?.checked || false;
    const leaveDays = ApiService.calculateLeaveDays(start, end, true);

    if (leaveDays <= 0) {
      Utils.showToast('Khoảng thời gian nghỉ không hợp lệ hoặc rơi vào ngày cuối tuần.', 'warning');
      return;
    }

    try {
      const currentUser = AuthService.getCurrentUser();
      const payload = {
        employeeId: empId,
        employeeName: empName,
        startDate: start,
        endDate: end,
        leaveDays: leaveDays,
        leaveType: leaveType,
        reason: reason,
        status: isAutoApprove ? 'APPROVED' : 'PENDING',
        approvedBy: isAutoApprove ? currentUser?.uid : null,
        approvedByName: isAutoApprove ? currentUser?.displayName : null,
        approvedAt: isAutoApprove ? new Date().toISOString() : null
      };

      await ApiService.submitLeaveRequest(payload);
      Utils.showToast(isAutoApprove ? `Đã tạo và duyệt đơn ${leaveDays} ngày cho ${empName}!` : `Đã gửi đơn nghỉ phép cho ${empName} thành công!`, 'success');

      const modal = document.getElementById('leave-request-modal');
      if (modal) modal.remove();
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi tạo đơn: ' + err.message, 'error');
    }
  },

  exportLeaveReport() {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `BÁO CÁO TỔNG HỢP NGÀY PHÉP NĂM ${this.selectedYear}\n`;
    csv += 'STT,MÃ NV,HỌ VÀ TÊN,CHỨC VỤ,PHÉP ĐƯỢC HƯỞNG,PHÉP CHUYỂN TIẾP,TỔNG ĐÃ NGHỈ,CÒN LẠI,PHÉP ÂM,TRẠNG THÁI\n';

    this.employees.forEach((emp, idx) => {
      const bal = this.leaveBalances.find(b => b.employeeId === emp.id) || { annualLeave: 12, carryForward: 0, usedLeave: 0, remainingLeave: 12, negativeLeave: 0 };
      const rem = Number(bal.remainingLeave);
      let statusStr = 'Còn phép';
      if (rem < 0) statusStr = `Âm ${Math.abs(rem)} ngày`;
      else if (rem === 0) statusStr = 'Hết phép';
      else if (rem <= 3) statusStr = 'Sắp hết phép';

      csv += `"${idx + 1}","${emp.employeeCode || ''}","${emp.fullName || ''}","${emp.position || ''}","${bal.annualLeave || 12}","${bal.carryForward || 0}","${bal.usedLeave || 0}","${rem}","${bal.negativeLeave || 0}","${statusStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_ngay_phep_nam_${this.selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast('Đã xuất báo cáo ngày phép thành công!', 'success');
  }
};

window.LeaveManagementPage = LeaveManagementPage;
