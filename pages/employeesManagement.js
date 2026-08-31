/**
 * NSG SUPPORT - EMPLOYEE DIRECTORY & HR MANAGEMENT PAGE
 * Quản lý danh bạ nhân sự, thông tin cá nhân, chuyên môn và liên kết ngày phép nội bộ
 */

const EmployeesManagementPage = {
  employees: [],
  leaveBalances: {}, // map: employeeId -> balanceObj for current selected year
  leaveRequests: [],
  selectedYear: new Date().getFullYear(),
  isLoading: true,
  currentFilterRole: 'ALL',
  currentFilterStatus: 'ALL',
  currentFilterLeaveStatus: 'ALL',
  searchQuery: '',

  async init() {
    this.selectedYear = new Date().getFullYear();
    await this.loadData();
  },

  async loadData() {
    this.isLoading = true;
    const body = document.getElementById('employees-table-body');
    if (body) body.innerHTML = this.renderLoading();

    try {
      const [empList, balances, requests] = await Promise.all([
        ApiService.loadEmployees(),
        ApiService.loadLeaveBalances(this.selectedYear),
        ApiService.loadLeaveRequests(this.selectedYear)
      ]);

      this.employees = empList || [];
      this.leaveRequests = requests || [];

      // Xây dựng map balance
      const map = {};
      (balances || []).forEach(b => {
        map[b.employeeId] = b;
      });
      this.leaveBalances = map;

      // Tự động đảm bảo mỗi nhân sự đều có bản ghi balance của năm đã chọn
      for (const emp of this.employees) {
        if (!this.leaveBalances[emp.id]) {
          const bal = await ApiService.getOrCreateLeaveBalance(emp.id, emp.fullName, this.selectedYear);
          if (bal) this.leaveBalances[emp.id] = bal;
        }
      }
    } catch (err) {
      console.error('[EmployeesManagementPage] Lỗi tải dữ liệu:', err);
      Utils.showToast('Lỗi khi tải dữ liệu nhân sự: ' + err.message, 'error');
    }

    this.isLoading = false;
    this.renderView();
  },

  updateStats() {
    const totalEl = document.getElementById('stat-emp-total');
    const activeEl = document.getElementById('stat-emp-active');
    const onLeaveEl = document.getElementById('stat-emp-onleave');
    const negativeEl = document.getElementById('stat-emp-negative');

    const activeList = this.employees.filter(e => e.status !== 'INACTIVE');
    const totalCount = activeList.length;
    
    // Kiểm tra nhân sự đang nghỉ phép hôm nay
    const todayStr = new Date().toISOString().split('T')[0];
    const onLeaveEmpIds = new Set();
    this.leaveRequests.forEach(r => {
      if (r.status === 'APPROVED' && r.startDate <= todayStr && r.endDate >= todayStr) {
        onLeaveEmpIds.add(r.employeeId);
      }
    });

    let negativeCount = 0;
    Object.values(this.leaveBalances).forEach(b => {
      if (Number(b.remainingLeave) < 0) negativeCount++;
    });

    if (totalEl) totalEl.innerText = totalCount;
    if (activeEl) activeEl.innerText = totalCount - onLeaveEmpIds.size;
    if (onLeaveEl) onLeaveEl.innerText = onLeaveEmpIds.size;
    if (negativeEl) negativeEl.innerText = negativeCount;
  },

  renderLoading() {
    return `
      <tr>
        <td colspan="9" class="p-12 text-center text-slate-400">
          <div class="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
          <p class="text-xs font-bold text-slate-600">Đang tải danh sách nhân sự nội bộ...</p>
        </td>
      </tr>
    `;
  },

  render() {
    setTimeout(() => this.init(), 50);

    const isEditAllowed = AuthService.canEditEmployees();

    return `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <!-- Top Title & Action Bar -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                <i class="fa-solid fa-shield-halved text-indigo-600"></i>
                <span>Nội Bộ Phòng Quản Trị Thiết Bị & CSVC</span>
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <i class="fa-solid fa-id-card text-indigo-600"></i>
              <span>QUẢN LÝ NHÂN SỰ</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Danh bạ hồ sơ nhân viên, chuyên môn nghiệp vụ, theo dõi phân công và ngày phép theo năm
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button type="button" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="EmployeesManagementPage.exportExcel()">
              <i class="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
              <span class="hidden sm:inline">Xuất Excel</span>
            </button>

            <button type="button" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="window.print()">
              <i class="fa-solid fa-print text-slate-600 text-sm"></i>
              <span class="hidden sm:inline">In danh sách</span>
            </button>

            ${isEditAllowed ? `
              <button type="button" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="EmployeesManagementPage.openCreateModal()">
                <i class="fa-solid fa-user-plus text-sm"></i>
                <span>+ THÊM NHÂN SỰ</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Tổng nhân sự</p>
              <h3 id="stat-emp-total" class="text-2xl font-black text-slate-900">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-user-check"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Đang làm việc</p>
              <h3 id="stat-emp-active" class="text-2xl font-black text-emerald-600">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-umbrella-beach"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Đang nghỉ phép</p>
              <h3 id="stat-emp-onleave" class="text-2xl font-black text-amber-600">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Đang âm phép</p>
              <h3 id="stat-emp-negative" class="text-2xl font-black text-rose-600">0</h3>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <!-- Ô tìm kiếm -->
            <div class="lg:col-span-2 relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" id="emp-search-input" placeholder="Tìm theo họ tên, CCCD, SĐT, mã NV..." class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" oninput="EmployeesManagementPage.handleSearch(this.value)">
            </div>

            <!-- Lọc Năm phép -->
            <div>
              <select id="emp-year-select" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500" onchange="EmployeesManagementPage.handleYearChange(this.value)">
                <option value="2025" ${this.selectedYear === 2025 ? 'selected' : ''}>Kỳ phép 2025</option>
                <option value="2026" ${this.selectedYear === 2026 ? 'selected' : ''}>Kỳ phép 2026 (Hiện tại)</option>
                <option value="2027" ${this.selectedYear === 2027 ? 'selected' : ''}>Kỳ phép 2027</option>
                <option value="2028" ${this.selectedYear === 2028 ? 'selected' : ''}>Kỳ phép 2028</option>
              </select>
            </div>

            <!-- Lọc Chức vụ / Bộ phận -->
            <div>
              <select id="emp-role-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500" onchange="EmployeesManagementPage.handleRoleFilter(this.value)">
                <option value="ALL">-- Tất cả chức vụ --</option>
                <option value="Trưởng phòng">Trưởng phòng</option>
                <option value="Phó Trưởng phòng">Phó Trưởng phòng</option>
                <option value="Chuyên Viên IT">Chuyên Viên IT</option>
                <option value="Chuyên Viên Bảo Trì">Chuyên Viên Bảo Trì CSVC</option>
                <option value="Kỹ thuật viên Ký túc xá">Kỹ thuật viên KTX</option>
                <option value="Cây Xanh">Nhân viên Cây xanh</option>
                <option value="Tạp Vụ">Nhân viên Tạp vụ</option>
              </select>
            </div>

            <!-- Lọc Tình trạng ngày phép -->
            <div>
              <select id="emp-leave-status-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500" onchange="EmployeesManagementPage.handleLeaveStatusFilter(this.value)">
                <option value="ALL">-- Tất cả tình trạng phép --</option>
                <option value="REMAINING">Còn ngày phép (> 3 ngày)</option>
                <option value="WARNING">Sắp hết phép (1 - 3 ngày)</option>
                <option value="EXHAUSTED">Đã hết phép (0 ngày)</option>
                <option value="NEGATIVE">Đang âm phép (< 0 ngày)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- BẢNG DANH SÁCH NHÂN SỰ (9 CỘT THEO YÊU CẦU MỤC 1) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th class="py-4 px-3 text-center w-12">STT</th>
                  <th class="py-4 px-4">HỌ VÀ TÊN</th>
                  <th class="py-4 px-3 text-center">NGÀY SINH</th>
                  <th class="py-4 px-3">CCCD</th>
                  <th class="py-4 px-3">CHỨC VỤ</th>
                  <th class="py-4 px-3">CHUYÊN MÔN NGHIỆP VỤ</th>
                  <th class="py-4 px-4 text-center">NGÀY PHÉP (${this.selectedYear})</th>
                  <th class="py-4 px-3">SĐT</th>
                  <th class="py-4 px-4 text-center w-36">THAO TÁC</th>
                </tr>
              </thead>
              <tbody id="employees-table-body" class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                ${this.renderLoading()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Container Modal Chi tiết & Form -->
      <div id="employee-modal-container"></div>
    `;
  },

  renderView() {
    const body = document.getElementById('employees-table-body');
    if (body) body.innerHTML = this.renderRows();
    this.updateStats();
  },

  getFilteredEmployees() {
    return this.employees.filter(emp => {
      if (emp.status === 'INACTIVE') return false;

      // Tìm kiếm
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchName = (emp.fullName || '').toLowerCase().includes(q);
        const matchCode = (emp.employeeCode || '').toLowerCase().includes(q);
        const matchCitizen = (emp.citizenId || '').toLowerCase().includes(q);
        const matchPhone = (emp.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCitizen && !matchPhone) return false;
      }

      // Lọc chức vụ
      if (this.currentFilterRole !== 'ALL') {
        if ((emp.position || '') !== this.currentFilterRole) return false;
      }

      // Lọc tình trạng ngày phép
      if (this.currentFilterLeaveStatus !== 'ALL') {
        const bal = this.leaveBalances[emp.id] || { remainingLeave: 12 };
        const rem = Number(bal.remainingLeave);

        if (this.currentFilterLeaveStatus === 'REMAINING' && rem <= 3) return false;
        if (this.currentFilterLeaveStatus === 'WARNING' && (rem <= 0 || rem > 3)) return false;
        if (this.currentFilterLeaveStatus === 'EXHAUSTED' && rem !== 0) return false;
        if (this.currentFilterLeaveStatus === 'NEGATIVE' && rem >= 0) return false;
      }

      return true;
    });
  },

  renderRows() {
    const filtered = this.getFilteredEmployees();

    if (filtered.length === 0) {
      return `
        <tr>
          <td colspan="9" class="p-12 text-center text-slate-400">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl mx-auto mb-2">
              <i class="fa-solid fa-users-slash"></i>
            </div>
            <p class="text-xs font-bold text-slate-700">Không tìm thấy nhân sự phù hợp</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc</p>
          </td>
        </tr>
      `;
    }

    const isEditAllowed = AuthService.canEditEmployees();

    return filtered.map((emp, index) => {
      const bal = this.leaveBalances[emp.id] || { annualLeave: 12, carryForward: 0, usedLeave: 0, remainingLeave: 12, negativeLeave: 0 };
      const rem = Number(bal.remainingLeave);
      const used = Number(bal.usedLeave) || 0;
      const initial = Number(bal.annualLeave) || 12;

      // Mask CCCD cho an toàn dữ liệu
      const rawCccd = emp.citizenId || '---';
      const maskedCccd = rawCccd.length >= 8 ? `${rawCccd.substring(0, 3)}******${rawCccd.substring(rawCccd.length - 3)}` : rawCccd;

      // Định dạng ngày sinh DD/MM/YYYY
      let dobDisplay = '---';
      if (emp.dateOfBirth) {
        const parts = emp.dateOfBirth.split('-');
        if (parts.length === 3) dobDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
        else dobDisplay = emp.dateOfBirth;
      }

      // Badge ngày phép
      let leaveBadgeHtml = '';
      if (rem < 0) {
        leaveBadgeHtml = `
          <div class="inline-flex flex-col items-center">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs animate-pulse">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Âm ${Math.abs(rem)} ngày</span>
            </span>
            <span class="text-[10px] text-slate-400 mt-0.5 font-bold">Đã nghỉ: ${used}/${initial}</span>
          </div>
        `;
      } else if (rem === 0) {
        leaveBadgeHtml = `
          <div class="inline-flex flex-col items-center">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
              <i class="fa-solid fa-battery-empty text-amber-600"></i>
              <span>Hết phép (0)</span>
            </span>
            <span class="text-[10px] text-slate-400 mt-0.5 font-bold">Đã nghỉ: ${used}/${initial}</span>
          </div>
        `;
      } else if (rem <= 3) {
        leaveBadgeHtml = `
          <div class="inline-flex flex-col items-center">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1 shadow-2xs">
              <i class="fa-solid fa-battery-quarter text-yellow-600"></i>
              <span>Còn ${rem} ngày</span>
            </span>
            <span class="text-[10px] text-slate-400 mt-0.5 font-bold">Đã nghỉ: ${used}/${initial}</span>
          </div>
        `;
      } else {
        leaveBadgeHtml = `
          <div class="inline-flex flex-col items-center">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
              <i class="fa-solid fa-battery-full text-emerald-600"></i>
              <span>Còn ${rem} ngày</span>
            </span>
            <span class="text-[10px] text-slate-400 mt-0.5 font-bold">Đã nghỉ: ${used}/${initial}</span>
          </div>
        `;
      }

      return `
        <tr class="hover:bg-indigo-50/20 transition-colors">
          <!-- 1. STT -->
          <td class="py-3.5 px-3 text-center text-slate-400 font-bold text-xs">${String(index + 1).padStart(2, '0')}</td>

          <!-- 2. HỌ VÀ TÊN -->
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                ${(emp.fullName || 'N').charAt(0).toUpperCase()}
              </div>
              <div class="min-w-0">
                <div class="font-black text-slate-900 truncate flex items-center gap-1.5 cursor-pointer hover:text-indigo-600" onclick="EmployeesManagementPage.openProfileModal('${emp.id}')">
                  <span>${emp.fullName || 'Chưa đặt tên'}</span>
                </div>
                <div class="text-[11px] font-mono text-indigo-600 font-bold tracking-tight">${emp.employeeCode || 'NSG-NV---'}</div>
              </div>
            </div>
          </td>

          <!-- 3. NGÀY SINH -->
          <td class="py-3.5 px-3 text-center text-slate-600 text-xs font-semibold whitespace-nowrap">${dobDisplay}</td>

          <!-- 4. CCCD -->
          <td class="py-3.5 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">
            <span title="${rawCccd}">${maskedCccd}</span>
          </td>

          <!-- 5. CHỨC VỤ -->
          <td class="py-3.5 px-3">
            <span class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
              ${emp.position || 'Nhân viên'}
            </span>
          </td>

          <!-- 6. CHUYÊN MÔN NGHIỆP VỤ -->
          <td class="py-3.5 px-3">
            <span class="text-xs text-slate-600 font-semibold line-clamp-2" title="${emp.qualification || 'Kỹ thuật'}">
              ${emp.qualification || 'Kỹ thuật viên'}
            </span>
          </td>

          <!-- 7. NGÀY PHÉP -->
          <td class="py-3.5 px-4 text-center whitespace-nowrap">${leaveBadgeHtml}</td>

          <!-- 8. SĐT -->
          <td class="py-3.5 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
            <a href="tel:${emp.phone || ''}" class="hover:text-indigo-600 flex items-center gap-1">
              <i class="fa-solid fa-phone text-slate-400 text-[10px]"></i>
              <span>${emp.phone || '---'}</span>
            </a>
          </td>

          <!-- 9. THAO TÁC (5 nút theo yêu cầu) -->
          <td class="py-3.5 px-4 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1">
              <!-- Xem chi tiết -->
              <button type="button" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Xem chi tiết hồ sơ" onclick="EmployeesManagementPage.openProfileModal('${emp.id}')">
                <i class="fa-solid fa-eye text-xs"></i>
              </button>

              <!-- Đăng ký nghỉ phép -->
              <button type="button" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Tạo đơn nghỉ phép" onclick="EmployeesManagementPage.openLeaveModal('${emp.id}')">
                <i class="fa-solid fa-calendar-plus text-xs"></i>
              </button>

              <!-- Sửa -->
              ${isEditAllowed ? `
                <button type="button" class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Chỉnh sửa thông tin" onclick="EmployeesManagementPage.openEditModal('${emp.id}')">
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>

                <!-- Ngưng hoạt động / Xóa -->
                <button type="button" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Ngưng hoạt động" onclick="EmployeesManagementPage.handleDelete('${emp.id}', '${emp.fullName}')">
                  <i class="fa-solid fa-user-slash text-xs"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleSearch(val) {
    this.searchQuery = val;
    this.renderView();
  },

  handleRoleFilter(val) {
    this.currentFilterRole = val;
    this.renderView();
  },

  handleLeaveStatusFilter(val) {
    this.currentFilterLeaveStatus = val;
    this.renderView();
  },

  async handleYearChange(val) {
    this.selectedYear = Number(val);
    await this.loadData();
  },

  // ========================================================
  // MODAL 1: XEM CHI TIẾT HỒ SƠ & LỊCH SỬ NGHỈ PHÉP
  // ========================================================
  async openProfileModal(empId, year = null) {
    const targetYear = year || this.selectedYear;
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;

    let bal = this.leaveBalances[emp.id];
    if (!bal || bal.year !== targetYear) {
      bal = await ApiService.getOrCreateLeaveBalance(emp.id, emp.fullName, targetYear);
    }

    const requests = (this.leaveRequests || []).filter(r => r.employeeId === emp.id && r.year === targetYear);
    const container = document.getElementById('employee-modal-container');
    if (!container) return;

    const initial = Number(bal?.annualLeave) || 12;
    const carry = Number(bal?.carryForward) || 0;
    const used = Number(bal?.usedLeave) || 0;
    const remaining = Number(bal?.remainingLeave);
    const negative = Number(bal?.negativeLeave) || 0;

    container.innerHTML = `
      <div id="emp-profile-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-xl flex items-center justify-center shadow-md">
                ${(emp.fullName || 'N').charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl font-black">${emp.fullName}</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                    ${emp.employeeCode}
                  </span>
                </div>
                <p class="text-xs text-slate-300 font-medium mt-0.5">${emp.position} • ${emp.departmentName || 'Phòng CSVC'}</p>
              </div>
            </div>
            <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer" onclick="document.getElementById('emp-profile-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body Tabs / Scrollable -->
          <div class="p-6 overflow-y-auto space-y-6 flex-1">
            <!-- 1. Thông tin cá nhân -->
            <div>
              <h4 class="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
                <i class="fa-solid fa-user-tie text-indigo-600"></i>
                <span>THÔNG TIN NHÂN SỰ</span>
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">Ngày sinh:</span>
                  <span class="font-extrabold text-slate-800">${emp.dateOfBirth || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">CCCD:</span>
                  <span class="font-extrabold text-slate-800 font-mono">${emp.citizenId || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">Số điện thoại:</span>
                  <span class="font-extrabold text-slate-800">${emp.phone || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">Chuyên môn:</span>
                  <span class="font-extrabold text-indigo-700">${emp.qualification || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">Email:</span>
                  <span class="font-extrabold text-slate-800">${emp.email || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[11px]">Trạng thái:</span>
                  <span class="font-extrabold text-emerald-600">${emp.status === 'ACTIVE' ? 'Đang làm việc' : 'Ngưng hoạt động'}</span>
                </div>
              </div>
            </div>

            <!-- 2. Thống kê ngày phép theo năm -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-calendar-check text-emerald-600"></i>
                  <span>HỒ SƠ PHÉP NĂM ${targetYear}</span>
                </h4>
                <select class="text-xs font-bold py-1 px-3 bg-slate-100 border border-slate-300 rounded-xl" onchange="EmployeesManagementPage.openProfileModal('${emp.id}', Number(this.value))">
                  <option value="2025" ${targetYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                  <option value="2026" ${targetYear === 2026 ? 'selected' : ''}>Năm 2026</option>
                  <option value="2027" ${targetYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                  <option value="2028" ${targetYear === 2028 ? 'selected' : ''}>Năm 2028</option>
                </select>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200">
                  <span class="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Phép được hưởng</span>
                  <div class="text-xl font-black text-blue-900 mt-1">${initial} <span class="text-xs font-normal">ngày</span></div>
                </div>

                <div class="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200">
                  <span class="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Chuyển tiếp năm trước</span>
                  <div class="text-xl font-black ${carry < 0 ? 'text-rose-600' : 'text-purple-900'} mt-1">
                    ${carry > 0 ? '+' : ''}${carry} <span class="text-xs font-normal">ngày</span>
                  </div>
                </div>

                <div class="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200">
                  <span class="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Tổng đã nghỉ</span>
                  <div class="text-xl font-black text-amber-900 mt-1">${used} <span class="text-xs font-normal">ngày</span></div>
                </div>

                <div class="p-3.5 ${remaining < 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'} rounded-2xl border">
                  <span class="text-[10px] ${remaining < 0 ? 'text-rose-700' : 'text-emerald-700'} font-bold uppercase tracking-wider block">
                    ${remaining < 0 ? 'Phép âm (Dùng trước)' : 'Phép còn lại'}
                  </span>
                  <div class="text-xl font-black ${remaining < 0 ? 'text-rose-700' : 'text-emerald-800'} mt-1">
                    ${remaining} <span class="text-xs font-normal">ngày</span>
                  </div>
                </div>
              </div>

              ${remaining < 0 ? `
                <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-rose-600 text-sm"></i>
                  <span>CẢNH BÁO: Nhân sự đã sử dụng vượt số ngày phép năm ${targetYear}: ${Math.abs(remaining)} ngày (Phần phép âm này sẽ tự động trừ vào kỳ phép năm sau).</span>
                </div>
              ` : ''}
            </div>

            <!-- 3. Bảng lịch sử nghỉ phép của nhân sự -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-clock-rotate-left text-blue-600"></i>
                  <span>LỊCH SỬ NGHỈ PHÉP NĂM ${targetYear}</span>
                </h4>
                <button type="button" class="text-xs font-bold text-indigo-600 hover:text-indigo-800" onclick="EmployeesManagementPage.openLeaveModal('${emp.id}')">
                  + Tạo đơn nghỉ phép
                </button>
              </div>

              <div class="border border-slate-200 rounded-2xl overflow-hidden">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3 text-center">STT</th>
                      <th class="py-2.5 px-3">Thời gian nghỉ</th>
                      <th class="py-2.5 px-2 text-center">Số ngày</th>
                      <th class="py-2.5 px-3">Loại phép</th>
                      <th class="py-2.5 px-3">Lý do</th>
                      <th class="py-2.5 px-3 text-center">Trạng thái</th>
                      <th class="py-2.5 px-3">Người duyệt</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    ${requests.length === 0 ? `
                      <tr>
                        <td colspan="7" class="p-6 text-center text-slate-400 text-xs">
                          Chưa có lịch sử nghỉ phép nào trong năm ${targetYear}.
                        </td>
                      </tr>
                    ` : requests.map((r, i) => `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-3 text-center text-slate-400 font-bold">${i + 1}</td>
                        <td class="py-2.5 px-3 font-semibold whitespace-nowrap">
                          ${r.startDate} <i class="fa-solid fa-arrow-right text-[10px] text-slate-400 mx-1"></i> ${r.endDate}
                        </td>
                        <td class="py-2.5 px-2 text-center font-black text-indigo-600">${r.leaveDays} ngày</td>
                        <td class="py-2.5 px-3">
                          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${r.leaveType === 'ANNUAL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}">
                            ${r.leaveType === 'ANNUAL' ? 'Phép năm' : (r.leaveType === 'SICK' ? 'Nghỉ ốm' : (r.leaveType === 'PERSONAL_PAID' ? 'Việc riêng' : 'Khác'))}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-slate-600 truncate max-w-[150px]" title="${r.reason || ''}">${r.reason || '---'}</td>
                        <td class="py-2.5 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : (r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">
                            ${r.status === 'APPROVED' ? 'Đã duyệt' : (r.status === 'PENDING' ? 'Chờ duyệt' : (r.status === 'REJECTED' ? 'Từ chối' : 'Đã hủy'))}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-slate-500 text-[11px]">${r.approvedByName || '---'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer" onclick="document.getElementById('emp-profile-modal').remove()">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ========================================================
  // MODAL 2: THÊM / CHỈNH SỬA NHÂN SỰ
  // ========================================================
  openCreateModal() {
    this.renderFormModal(null);
  },

  openEditModal(empId) {
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;
    this.renderFormModal(emp);
  },

  renderFormModal(emp = null) {
    const isEdit = Boolean(emp);
    const container = document.getElementById('employee-modal-container');
    if (!container) return;

    const bal = emp ? (this.leaveBalances[emp.id] || { annualLeave: 12, carryForward: 0, usedLeave: 0, remainingLeave: 12 }) : { annualLeave: 12, carryForward: 0, usedLeave: 0, remainingLeave: 12 };

    container.innerHTML = `
      <div id="emp-form-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <div class="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md">
                <i class="fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'}"></i>
              </div>
              <div>
                <h3 class="text-base font-black">${isEdit ? 'CHỈNH SỬA HỒ SƠ NHÂN SỰ' : 'THÊM MỚI NHÂN SỰ'}</h3>
                <p class="text-xs text-slate-400 font-medium">Hồ sơ thông tin và kỳ phép nhân sự</p>
              </div>
            </div>
            <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('emp-form-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="EmployeesManagementPage.handleFormSubmit(event, '${emp?.id || ''}')" class="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Mã nhân sự:</label>
                <input type="text" id="f-emp-code" value="${emp?.employeeCode || `NSG-NV${Math.floor(100 + Math.random() * 900)}`}" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" required>
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Họ và tên <span class="text-rose-500">*</span>:</label>
                <input type="text" id="f-emp-name" value="${emp?.fullName || ''}" placeholder="Nhập họ và tên đầy đủ" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500" required>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Ngày sinh:</label>
                <input type="date" id="f-emp-dob" value="${emp?.dateOfBirth || '1990-01-01'}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Số CCCD / CMND <span class="text-rose-500">*</span>:</label>
                <input type="text" id="f-emp-cccd" value="${emp?.citizenId || ''}" placeholder="12 chữ số" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" required>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Chức vụ <span class="text-rose-500">*</span>:</label>
                <select id="f-emp-position" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" required>
                  <option value="Chuyên Viên Bảo Trì" ${emp?.position === 'Chuyên Viên Bảo Trì' ? 'selected' : ''}>Chuyên Viên Bảo Trì CSVC</option>
                  <option value="Chuyên Viên IT" ${emp?.position === 'Chuyên Viên IT' ? 'selected' : ''}>Chuyên Viên IT</option>
                  <option value="Kỹ thuật viên Ký túc xá" ${emp?.position === 'Kỹ thuật viên Ký túc xá' ? 'selected' : ''}>Kỹ thuật viên Ký túc xá</option>
                  <option value="Cây Xanh" ${emp?.position === 'Cây Xanh' ? 'selected' : ''}>Nhân viên Cây xanh</option>
                  <option value="Tạp Vụ" ${emp?.position === 'Tạp Vụ' ? 'selected' : ''}>Nhân viên Tạp vụ</option>
                  <option value="Phó Trưởng phòng" ${emp?.position === 'Phó Trưởng phòng' ? 'selected' : ''}>Phó Trưởng phòng</option>
                  <option value="Trưởng phòng" ${emp?.position === 'Trưởng phòng' ? 'selected' : ''}>Trưởng phòng</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Chuyên môn nghiệp vụ:</label>
                <input type="text" id="f-emp-qual" value="${emp?.qualification || ''}" placeholder="VD: Điện lạnh, Mạng máy tính..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Số điện thoại:</label>
                <input type="tel" id="f-emp-phone" value="${emp?.phone || ''}" placeholder="0901234567" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Email:</label>
                <input type="email" id="f-emp-email" value="${emp?.email || ''}" placeholder="email@nsg.edu.vn" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Khoa / Phòng ban:</label>
              <input type="text" id="f-emp-dept" value="${emp?.departmentName || 'Phòng Quản trị Thiết bị và Cơ sở vật chất'}" placeholder="VD: Phòng Quản trị Thiết bị và Cơ sở vật chất" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500">
            </div>

            <!-- Khối thông tin ngày phép tự động tính (Mục 2) -->
            <div class="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
              <h5 class="font-extrabold text-indigo-900 text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-calculator text-indigo-600"></i>
                <span>THÔNG TIN NGÀY PHÉP NĂM ${this.selectedYear} (HỆ THỐNG TỰ ĐỘNG TÍNH)</span>
              </h5>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div class="p-2.5 bg-white rounded-xl border border-indigo-200">
                  <span class="text-[10px] text-slate-500 font-bold block">Phép được hưởng</span>
                  <input type="number" id="f-emp-annual" value="${bal.annualLeave || 12}" class="w-full text-center font-black text-indigo-700 text-sm border-0 focus:ring-0 p-0" oninput="EmployeesManagementPage.calcFormRemaining()">
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-indigo-200">
                  <span class="text-[10px] text-slate-500 font-bold block">Phép chuyển tiếp</span>
                  <input type="number" id="f-emp-carry" value="${bal.carryForward || 0}" class="w-full text-center font-black text-purple-700 text-sm border-0 focus:ring-0 p-0" oninput="EmployeesManagementPage.calcFormRemaining()">
                </div>

                <div class="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                  <span class="text-[10px] text-slate-500 font-bold block">Đã sử dụng</span>
                  <div id="f-emp-used" class="font-black text-amber-700 text-sm mt-0.5">${bal.usedLeave || 0}</div>
                </div>

                <div class="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <span class="text-[10px] text-indigo-200 font-bold block">Còn lại</span>
                  <div id="f-emp-remaining" class="font-black text-white text-sm mt-0.5">${bal.remainingLeave}</div>
                </div>
              </div>
              <p class="text-[10px] text-slate-500 italic">
                * Công thức: Còn lại = Phép được hưởng (${bal.annualLeave || 12}) + Chuyển tiếp (${bal.carryForward || 0}) - Đã nghỉ (${bal.usedLeave || 0}).
              </p>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Ghi chú:</label>
              <textarea id="f-emp-notes" rows="2" placeholder="Ghi chú thêm về nhân sự..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500">${emp?.notes || ''}</textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('emp-form-modal').remove()">
                Hủy bỏ
              </button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-check"></i>
                <span>${isEdit ? 'LƯU THAY ĐỔI' : 'TẠO NHÂN SỰ'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  calcFormRemaining() {
    const annual = Number(document.getElementById('f-emp-annual')?.value) || 0;
    const carry = Number(document.getElementById('f-emp-carry')?.value) || 0;
    const used = Number(document.getElementById('f-emp-used')?.innerText) || 0;
    const rem = annual + carry - used;

    const remEl = document.getElementById('f-emp-remaining');
    if (remEl) {
      remEl.innerText = rem;
      remEl.className = rem < 0 ? 'font-black text-rose-300 text-sm mt-0.5' : 'font-black text-white text-sm mt-0.5';
    }
  },

  async handleFormSubmit(e, empId) {
    e.preventDefault();

    const empData = {
      employeeCode: document.getElementById('f-emp-code').value.trim(),
      fullName: document.getElementById('f-emp-name').value.trim(),
      dateOfBirth: document.getElementById('f-emp-dob').value,
      citizenId: document.getElementById('f-emp-cccd').value.trim(),
      position: document.getElementById('f-emp-position').value,
      qualification: document.getElementById('f-emp-qual').value.trim(),
      phone: document.getElementById('f-emp-phone').value.trim(),
      email: document.getElementById('f-emp-email').value.trim(),
      departmentName: document.getElementById('f-emp-dept')?.value.trim() || 'Phòng Quản trị Thiết bị và Cơ sở vật chất',
      annualLeave: Number(document.getElementById('f-emp-annual').value) || 12,
      carryForward: Number(document.getElementById('f-emp-carry').value) || 0,
      notes: document.getElementById('f-emp-notes').value.trim(),
      status: 'ACTIVE'
    };

    if (!empData.fullName || !empData.citizenId) {
      Utils.showToast('Vui lòng nhập đầy đủ Họ tên và CCCD.', 'warning');
      return;
    }

    try {
      if (empId) {
        await ApiService.updateEmployee(empId, empData);
        Utils.showToast(`Đã cập nhật hồ sơ nhân sự ${empData.fullName}!`, 'success');
      } else {
        await ApiService.createEmployee(empData);
        Utils.showToast(`Đã thêm mới nhân sự ${empData.fullName}!`, 'success');
      }

      const modal = document.getElementById('emp-form-modal');
      if (modal) modal.remove();
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async handleDelete(empId, empName) {
    if (!confirm(`Bạn có chắc chắn muốn ngưng hoạt động nhân sự "${empName}"?\nLịch sử ngày phép và công việc của nhân sự này vẫn sẽ được lưu trữ an toàn trong hệ thống.`)) {
      return;
    }

    try {
      await ApiService.deleteEmployee(empId, false); // Soft delete
      Utils.showToast(`Đã chuyển trạng thái ngưng hoạt động cho nhân sự ${empName}.`, 'success');
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  // ========================================================
  // MODAL 3: TẠO ĐƠN NGHỈ PHÉP CHO NHÂN SỰ
  // ========================================================
  openLeaveModal(empId) {
    const emp = this.employees.find(e => e.id === empId);
    if (!emp) return;

    const container = document.getElementById('employee-modal-container');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div id="emp-leave-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
          <div class="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center text-base font-black">
                <i class="fa-solid fa-umbrella-beach"></i>
              </div>
              <div>
                <h3 class="text-sm font-black">ĐĂNG KÝ NGHỈ PHÉP</h3>
                <p class="text-[11px] text-amber-100 font-medium">Nhân sự: ${emp.fullName} (${emp.employeeCode})</p>
              </div>
            </div>
            <button class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('emp-leave-modal').remove()">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          <form onsubmit="EmployeesManagementPage.handleLeaveSubmit(event, '${emp.id}', '${emp.fullName}')" class="p-5 space-y-3.5 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Từ ngày <span class="text-rose-500">*</span>:</label>
                <input type="date" id="l-start-date" value="${todayStr}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500" required onchange="EmployeesManagementPage.calcLeaveDays()">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Đến ngày <span class="text-rose-500">*</span>:</label>
                <input type="date" id="l-end-date" value="${todayStr}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500" required onchange="EmployeesManagementPage.calcLeaveDays()">
              </div>
            </div>

            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <span class="text-xs font-bold text-amber-900">Số ngày nghỉ (loại trừ T7/CN):</span>
              <span id="l-days-display" class="text-sm font-black text-amber-700">1 ngày</span>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Loại phép:</label>
              <select id="l-leave-type" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500">
                <option value="ANNUAL">Phép năm (Trừ vào quỹ 12 ngày phép)</option>
                <option value="SICK">Nghỉ ốm / Khám bệnh / Thai sản</option>
                <option value="PERSONAL_PAID">Việc riêng có hưởng lương (Kết hôn, hiếu hỉ)</option>
                <option value="UNPAID">Nghỉ việc riêng không hưởng lương</option>
                <option value="COMPENSATORY">Nghỉ bù trực ca / Sự kiện</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Lý do nghỉ <span class="text-rose-500">*</span>:</label>
              <input type="text" id="l-reason" placeholder="VD: Việc gia đình, Giải quyết việc cá nhân..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500" required>
            </div>

            <!-- Tùy chọn duyệt luôn nếu là Lãnh đạo -->
            ${AuthService.canApproveLeave() ? `
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="l-auto-approve" class="w-4 h-4 text-amber-600 rounded" checked>
                  <span class="text-xs font-extrabold text-slate-800">Duyệt đơn và trừ phép ngay lập tức</span>
                </label>
              </div>
            ` : ''}

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('emp-leave-modal').remove()">
                Hủy
              </button>
              <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-paper-plane"></i>
                <span>GỬI ĐƠN NGHỈ PHÉP</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    this.calcLeaveDays();
  },

  calcLeaveDays() {
    const start = document.getElementById('l-start-date')?.value;
    const end = document.getElementById('l-end-date')?.value;
    const count = ApiService.calculateLeaveDays(start, end, true);
    const display = document.getElementById('l-days-display');
    if (display) display.innerText = `${count} ngày`;
  },

  async handleLeaveSubmit(e, empId, empName) {
    e.preventDefault();

    const start = document.getElementById('l-start-date').value;
    const end = document.getElementById('l-end-date').value;
    const leaveType = document.getElementById('l-leave-type').value;
    const reason = document.getElementById('l-reason').value.trim();
    const isAutoApprove = document.getElementById('l-auto-approve')?.checked || false;
    const leaveDays = ApiService.calculateLeaveDays(start, end, true);

    if (leaveDays <= 0) {
      Utils.showToast('Khoảng thời gian nghỉ không hợp lệ hoặc rơi vào ngày nghỉ cuối tuần.', 'warning');
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
      Utils.showToast(isAutoApprove ? `Đã tạo và duyệt đơn nghỉ phép ${leaveDays} ngày cho ${empName}!` : `Đã gửi đơn nghỉ phép cho ${empName} thành công!`, 'success');

      const modal = document.getElementById('emp-leave-modal');
      if (modal) modal.remove();
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi gửi đơn nghỉ phép: ' + err.message, 'error');
    }
  },

  // ========================================================
  // XUẤT BÁO CÁO EXCEL
  // ========================================================
  exportExcel() {
    const filtered = this.getFilteredEmployees();
    if (filtered.length === 0) {
      Utils.showToast('Không có dữ liệu để xuất.', 'warning');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'STT,MÃ NV,HỌ VÀ TÊN,NGÀY SINH,CCCD,CHỨC VỤ,CHUYÊN MÔN,SĐT,EMAIL,PHÉP NĂM,ĐÃ NGHỈ,CÒN LẠI,TRẠNG THÁI PHÉP\n';

    filtered.forEach((emp, i) => {
      const bal = this.leaveBalances[emp.id] || { annualLeave: 12, usedLeave: 0, remainingLeave: 12 };
      const rem = Number(bal.remainingLeave);
      let statusStr = 'Còn phép';
      if (rem < 0) statusStr = `Âm ${Math.abs(rem)} ngày`;
      else if (rem === 0) statusStr = 'Hết phép';
      else if (rem <= 3) statusStr = 'Sắp hết phép';

      csv += `"${i + 1}","${emp.employeeCode || ''}","${emp.fullName || ''}","${emp.dateOfBirth || ''}","${emp.citizenId || ''}","${emp.position || ''}","${emp.qualification || ''}","${emp.phone || ''}","${emp.email || ''}","${bal.annualLeave || 12}","${bal.usedLeave || 0}","${rem}","${statusStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_nhan_su_va_ngay_phep_${this.selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast('Đã xuất tệp dữ liệu nhân sự thành công!', 'success');
  }
};

window.EmployeesManagementPage = EmployeesManagementPage;
