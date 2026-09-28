/**
 * NSG SUPPORT - SUPER ADMIN USER & ROLE PERMISSION MANAGEMENT PAGE
 * Quản lý nhân sự, Thêm - Sửa - Xóa và Phân quyền tài khoản hệ thống chuyên sâu cho Super Admin
 */

const UserManagementPage = {
  users: [],
  isLoading: true,
  currentFilterRole: 'ALL',

  async init() {
    await this.loadUsersFromFirestore();
  },

  async loadUsersFromFirestore() {
    this.isLoading = true;
    const body = document.getElementById('users-table-body');
    if (body) body.innerHTML = this.renderLoading();

    if (window.firebase && window.firebase.firestore) {
      try {
        const snap = await window.firebase.firestore().collection('users').get();
        const list = [];
        snap.forEach(doc => {
          list.push({ uid: doc.id, ...doc.data() });
        });
        this.users = list;
      } catch (err) {
        console.error('Lỗi tải danh sách users:', err);
      }
    }
    this.isLoading = false;
    const updatedBody = document.getElementById('users-table-body');
    if (updatedBody) updatedBody.innerHTML = this.renderRows();
    this.updateStats();
  },

  updateStats() {
    const totalEl = document.getElementById('stat-total-users');
    const adminEl = document.getElementById('stat-admin-users');
    const staffEl = document.getElementById('stat-staff-users');
    const userEl = document.getElementById('stat-regular-users');

    const visibleUsers = this.users.filter(u => u.role !== 'SUPER_ADMIN');
    if (totalEl) totalEl.innerText = visibleUsers.length;
    if (adminEl) adminEl.innerText = visibleUsers.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'DEPUTY_MANAGER').length;
    if (staffEl) staffEl.innerText = visibleUsers.filter(u => u.role === 'STAFF' || u.role === 'STAFF_KTX').length;
    if (userEl) userEl.innerText = visibleUsers.filter(u => u.role === 'USER' || !u.role).length;
  },

  render() {
    setTimeout(() => this.loadUsersFromFirestore(), 50);

    return `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <!-- Top Title & Action Bar -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                👑 Quản trị & Phân quyền Hệ thống
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <i class="fa-solid fa-users-gear text-blue-600"></i>
              <span>QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Khởi tạo nhân sự, phân cấp quyền hạn (Super Admin, Ban Giám Hiệu, Trưởng phòng, Phó Trưởng phòng, KTV Khoa, KTV KTX, Người dùng)
            </p>
          </div>

          <button type="button" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5 shrink-0" onclick="UserManagementPage.openCreateModal()">
            <i class="fa-solid fa-user-plus text-sm"></i>
            <span>+ THÊM TÀI KHOẢN MỚI</span>
          </button>
        </div>

        <!-- Metric Stat Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Tổng tài khoản</p>
              <h3 id="stat-total-users" class="text-2xl font-black text-slate-900">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">BGH & Lãnh đạo</p>
              <h3 id="stat-admin-users" class="text-2xl font-black text-purple-700">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-screwdriver-wrench"></i>
            </div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Kỹ thuật viên (Khoa + KTX)</p>
              <h3 id="stat-staff-users" class="text-2xl font-black text-indigo-700">0</h3>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-chalkboard-user"></i>
            </div>
            <div>
              <p class="text-xs text-slate-500 font-semibold">Cán bộ / Giảng viên / SV</p>
              <h3 id="stat-regular-users" class="text-2xl font-black text-emerald-700">0</h3>
            </div>
          </div>
        </div>

        <!-- Main User Table Card -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          
          <!-- Table Toolbar -->
          <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <span class="text-slate-400 font-bold mr-1">Lọc vai trò:</span>
              <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 flex-wrap">
                <button type="button" class="px-3 py-1 rounded-lg ${this.currentFilterRole === 'ALL' ? 'bg-white shadow-xs font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'} cursor-pointer" onclick="UserManagementPage.setRoleFilter('ALL')">Tất cả</button>
                <button type="button" class="px-3 py-1 rounded-lg ${this.currentFilterRole === 'ADMIN' ? 'bg-white shadow-xs font-bold text-purple-600' : 'text-slate-600 hover:text-slate-900'} cursor-pointer" onclick="UserManagementPage.setRoleFilter('ADMIN')">BGH & Lãnh đạo</button>
                <button type="button" class="px-3 py-1 rounded-lg ${this.currentFilterRole === 'STAFF' ? 'bg-white shadow-xs font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'} cursor-pointer" onclick="UserManagementPage.setRoleFilter('STAFF')">KTV Khoa</button>
                <button type="button" class="px-3 py-1 rounded-lg ${this.currentFilterRole === 'STAFF_KTX' ? 'bg-white shadow-xs font-bold text-cyan-600' : 'text-slate-600 hover:text-slate-900'} cursor-pointer" onclick="UserManagementPage.setRoleFilter('STAFF_KTX')">KTV Ký Túc Xá</button>
                <button type="button" class="px-3 py-1 rounded-lg ${this.currentFilterRole === 'USER' ? 'bg-white shadow-xs font-bold text-emerald-600' : 'text-slate-600 hover:text-slate-900'} cursor-pointer" onclick="UserManagementPage.setRoleFilter('USER')">Cán bộ / GV</button>
              </div>
            </div>

            <button type="button" class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-blue-50" onclick="UserManagementPage.loadUsersFromFirestore()">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>Làm mới danh sách</span>
            </button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th class="p-4">Nhân sự</th>
                  <th class="p-4">Email đăng nhập</th>
                  <th class="p-4">Khoa / Phòng ban</th>
                  <th class="p-4">Vai trò (Phân quyền)</th>
                  <th class="p-4">Quyền hạn hệ thống</th>
                  <th class="p-4">Trạng thái</th>
                  <th class="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="users-table-body" class="divide-y divide-slate-100">
                ${this.renderRows()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Dynamic Modal Container -->
        <div id="user-modal-container"></div>
      </div>
    `;
  },

  renderLoading() {
    return `<tr><td colspan="7" class="p-10 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mr-2 text-blue-600"></i> Đang tải dữ liệu từ Cloud Firestore...</td></tr>`;
  },

  setRoleFilter(role) {
    this.currentFilterRole = role;
    const body = document.getElementById('users-table-body');
    if (body) body.innerHTML = this.renderRows();
  },

  renderRows() {
    if (this.isLoading) return this.renderLoading();

    // ẨN HOÀN TOÀN TÀI KHOẢN SUPER ADMIN KHỎI BẢNG PHÂN QUYỀN (CHỈ HIỂN THỊ TỪ BAN GIÁM HIỆU TRỞ XUỐNG)
    let list = this.users.filter(u => u.role !== 'SUPER_ADMIN');

    if (this.currentFilterRole !== 'ALL') {
      if (this.currentFilterRole === 'ADMIN') {
        list = list.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'DEPUTY_MANAGER');
      } else {
        list = list.filter(u => u.role === this.currentFilterRole);
      }
    }

    if (list.length === 0) {
      return `
        <tr>
          <td colspan="7" class="p-10 text-center text-slate-400">
            <i class="fa-solid fa-user-slash text-4xl text-slate-300 mb-2 block"></i>
            <p class="font-medium text-sm text-slate-600">Không có tài khoản nào phù hợp.</p>
            <p class="text-xs text-slate-400 mt-1">Bấm "+ THÊM TÀI KHOẢN MỚI" ở trên để khởi tạo tài khoản.</p>
          </td>
        </tr>
      `;
    }

    const isSuperAdmin = AuthService.isSuperAdmin();

    return list.map(u => {
      const isBGHOrManager = u.role === 'ADMIN' || u.role === 'MANAGER';
      const canEditThisUser = isSuperAdmin || !isBGHOrManager;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <!-- Thông tin nhân sự -->
          <td class="p-4 font-bold text-slate-900 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl ${this.getRoleAvatarBg(u.role)} flex items-center justify-center text-sm font-black shadow-xs shrink-0">
              ${(u.displayName || u.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>${u.displayName || 'Chưa đặt tên'}</span>
                ${u.role === 'ADMIN' ? '<span class="text-purple-600" title="Ban Giám Hiệu"><i class="fa-solid fa-building-columns text-[11px]"></i></span>' : ''}
                ${u.role === 'MANAGER' ? '<span class="text-blue-600" title="Trưởng phòng"><i class="fa-solid fa-user-tie text-[11px]"></i></span>' : ''}
                ${u.role === 'DEPUTY_MANAGER' ? '<span class="text-indigo-600" title="Phó Trưởng phòng"><i class="fa-solid fa-user-check text-[11px]"></i></span>' : ''}
                ${u.role === 'STAFF_KTX' ? '<span class="text-cyan-600" title="KTV Ký Túc Xá"><i class="fa-solid fa-hotel text-[11px]"></i></span>' : ''}
              </p>
              <p class="text-[11px] text-slate-400 font-medium">
                ${u.phone ? '<i class="fa-solid fa-phone text-[10px] mr-1"></i>' + u.phone : 'Chưa có SĐT'}
              </p>
            </div>
          </td>

          <!-- Email -->
          <td class="p-4 font-mono font-semibold text-slate-800 text-xs">
            ${u.email}
          </td>

          <!-- Khoa/Phòng -->
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-lg ${u.departmentName === 'Ban Giám Hiệu' ? 'bg-purple-100 text-purple-800 font-bold border border-purple-200' : 'bg-slate-100 font-semibold text-slate-700'} text-[11px]">
              ${u.departmentName || 'Chưa phân bổ'}
            </span>
          </td>

          <!-- Vai trò chính (Dropdown đổi trực tiếp) -->
          <td class="p-4">
            ${canEditThisUser ? `
              <select class="py-1.5 px-3 rounded-xl text-xs font-bold border border-slate-300 ${this.getRoleSelectStyle(u.role)} cursor-pointer shadow-2xs" onchange="UserManagementPage.changeRoleDirect('${u.uid}', this.value)">
                ${isSuperAdmin ? `
                  <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>🏛️ Ban Giám Hiệu</option>
                  <option value="MANAGER" ${u.role === 'MANAGER' ? 'selected' : ''}>👔 Trưởng phòng</option>
                ` : ''}
                <option value="DEPUTY_MANAGER" ${u.role === 'DEPUTY_MANAGER' ? 'selected' : ''}>🎖️ Phó Trưởng phòng</option>
                <option value="STAFF_IT" ${u.role === 'STAFF_IT' ? 'selected' : ''}>💻 Chuyên Viên IT</option>
                <option value="STAFF_MAINTENANCE" ${u.role === 'STAFF_MAINTENANCE' ? 'selected' : ''}>🛠️ Chuyên Viên Bảo Trì</option>
                <option value="STAFF_GREEN" ${u.role === 'STAFF_GREEN' ? 'selected' : ''}>🌿 Cây Xanh</option>
                <option value="STAFF_CLEANING" ${u.role === 'STAFF_CLEANING' ? 'selected' : ''}>🧹 Tạp Vụ</option>
                <option value="STAFF_KTX" ${u.role === 'STAFF_KTX' ? 'selected' : ''}>🏢 KTV Ký túc xá</option>
                <option value="STAFF" ${u.role === 'STAFF' ? 'selected' : ''}>🔧 Kỹ thuật viên (Chung)</option>
                <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>🎓 Cán bộ / Giảng viên / SV</option>
              </select>
            ` : `
              <span class="py-1.5 px-3 rounded-xl text-xs font-bold ${this.getRoleSelectStyle(u.role)} inline-block">
                ${u.role === 'ADMIN' ? '🏛️ Ban Giám Hiệu' : '👔 Trưởng phòng'}
              </span>
            `}
          </td>

          <!-- Quyền hạn chi tiết -->
          <td class="p-4">
            <div class="flex flex-wrap gap-1 max-w-xs">
              ${this.renderPermissionBadges(u)}
            </div>
          </td>

          <!-- Trạng thái -->
          <td class="p-4">
            <span class="inline-flex items-center gap-1.5 text-xs font-black ${u.isActive !== false ? 'text-emerald-600' : 'text-rose-500'}">
              <span class="w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}"></span>
              ${u.isActive !== false ? 'Hoạt động' : 'Đã khóa'}
            </span>
          </td>

          <!-- Thao tác Thêm/Sửa/Xóa/Khóa -->
          <td class="p-4 text-right space-x-1 whitespace-nowrap">
            ${canEditThisUser ? `
              <!-- Nút Sửa -->
              <button class="p-2 rounded-xl text-blue-600 hover:bg-blue-50 font-bold cursor-pointer" title="Chỉnh sửa thông tin & phân quyền" onclick="UserManagementPage.openEditModal('${u.uid}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <!-- Nút Khóa / Mở khóa -->
              <button class="p-2 rounded-xl ${u.isActive !== false ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} font-bold cursor-pointer" title="${u.isActive !== false ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}" onclick="UserManagementPage.toggleLock('${u.uid}')">
                <i class="fa-solid ${u.isActive !== false ? 'fa-lock' : 'fa-lock-open'}"></i>
              </button>

              <!-- Nút Xóa -->
              <button class="p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold cursor-pointer" title="Xóa tài khoản khỏi hệ thống" onclick="UserManagementPage.deleteUser('${u.uid}', '${u.displayName || u.email}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : `
              <span class="text-xs text-slate-400 font-medium italic pr-2">Cấp quản lý cấp cao</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPermissionBadges(u) {
    if (u.role === 'SUPER_ADMIN') {
      return `
        <span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">Toàn quyền hệ thống</span>
        <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold">Xóa task</span>
      `;
    }
    if (u.role === 'ADMIN') {
      return `
        <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">Ban Giám Hiệu</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Giám sát CSVC</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Báo cáo</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Giao việc</span>
      `;
    }
    if (u.role === 'MANAGER') {
      return `
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Giao việc</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Nghiệm thu</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Báo cáo</span>
        <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold">Cấp quyền</span>
      `;
    }
    if (u.role === 'DEPUTY_MANAGER') {
      return `
        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">Giao việc</span>
        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">Nghiệm thu</span>
        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">Báo cáo</span>
      `;
    }
    if (u.role === 'STAFF_KTX') {
      return `
        <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-semibold">Xử lý Ký túc xá</span>
        <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-semibold">Gửi nghiệm thu</span>
      `;
    }
    if (u.role === 'STAFF') {
      return `
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Nhận việc Khoa/GĐ</span>
        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Gửi nghiệm thu</span>
      `;
    }
    return `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">Gửi phản ánh & Đánh giá</span>`;
  },

  getRoleSelectStyle(role) {
    if (role === 'SUPER_ADMIN') return 'text-purple-800 bg-purple-50 border-purple-300';
    if (role === 'ADMIN') return 'text-purple-800 bg-purple-50 border-purple-300';
    if (role === 'MANAGER') return 'text-blue-800 bg-blue-50 border-blue-300';
    if (role === 'DEPUTY_MANAGER') return 'text-indigo-800 bg-indigo-50 border-indigo-300';
    if (role === 'STAFF_KTX') return 'text-cyan-800 bg-cyan-50 border-cyan-300';
    if (role === 'STAFF') return 'text-blue-800 bg-blue-50 border-blue-300';
    return 'text-emerald-800 bg-emerald-50 border-emerald-300';
  },

  getRoleAvatarBg(role) {
    if (role === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-700';
    if (role === 'ADMIN') return 'bg-purple-100 text-purple-700';
    if (role === 'MANAGER') return 'bg-blue-100 text-blue-700';
    if (role === 'DEPUTY_MANAGER') return 'bg-indigo-100 text-indigo-700';
    if (role === 'STAFF_KTX') return 'bg-cyan-100 text-cyan-700';
    if (role === 'STAFF') return 'bg-blue-100 text-blue-700';
    return 'bg-emerald-100 text-emerald-700';
  },

  // 1. MODAL: THÊM TÀI KHOẢN MỚI
  openCreateModal() {
    const departments = window.APP_CONFIG.DEPARTMENTS;
    const isSuperAdmin = AuthService.isSuperAdmin();
    const container = document.getElementById('user-modal-container');
    container.innerHTML = `
      <div id="user-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 relative max-h-[90vh] overflow-y-auto">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="UserManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-user-plus"></i>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900">THÊM TÀI KHOẢN HỆ THỐNG</h3>
              <p class="text-xs text-slate-500">${isSuperAdmin ? 'Khởi tạo tài khoản Ban Giám Hiệu, Trưởng phòng và các cấp nhân sự' : 'Khởi tạo và phân quyền nhân sự cấp dưới (từ Phó Trưởng phòng trở xuống)'}</p>
            </div>
          </div>

          <form class="space-y-4" onsubmit="UserManagementPage.handleCreateSubmit(event)">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ và tên nhân sự <span class="text-red-500">*</span></label>
              <input type="text" id="modal-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="${isSuperAdmin ? 'Ví dụ: TS. Nguyễn Văn A (Phó Hiệu Trưởng)' : 'Ví dụ: Nguyễn Văn B (Kỹ thuật viên)'}" required>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Email đăng nhập hệ thống <span class="text-red-500">*</span></label>
              <input type="email" id="modal-email" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono" placeholder="nhanvien@nsg.edu.vn" required>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu khởi tạo <span class="text-red-500">*</span></label>
                <input type="password" id="modal-pass" minlength="6" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono" placeholder="Tối thiểu 6 ký tự" value="Password123!" required>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input type="tel" id="modal-phone" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="090xxxxxxx">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Khoa / Phòng / Bộ phận</label>
              <select id="modal-dept" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500">
                ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
                <option value="Khác">Khác / Bên ngoài</option>
              </select>
            </div>

            <!-- Phân quyền Vai trò -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Phân quyền Vai trò hệ thống (Role RBAC) <span class="text-red-500">*</span></label>
              <select id="modal-role" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold" onchange="UserManagementPage.handleRoleSelectChange(this.value)">
                ${isSuperAdmin ? `
                  <option value="ADMIN" class="text-amber-800 font-bold">🏛️ Ban Giám Hiệu</option>
                  <option value="MANAGER" class="text-blue-700 font-bold">👔 Trưởng phòng</option>
                ` : ''}
                <option value="DEPUTY_MANAGER" class="text-purple-700 font-bold">🎖️ Phó Trưởng phòng</option>
                <option value="STAFF_IT" class="text-cyan-700 font-bold">💻 Chuyên Viên IT</option>
                <option value="STAFF_MAINTENANCE" class="text-orange-700 font-bold">🛠️ Chuyên Viên Bảo Trì</option>
                <option value="STAFF_GREEN" class="text-emerald-700 font-bold">🌿 Cây Xanh</option>
                <option value="STAFF_CLEANING" class="text-teal-700 font-bold">🧹 Tạp Vụ</option>
                <option value="STAFF_KTX" class="text-indigo-700 font-bold">🏢 Kỹ thuật viên Ký túc xá</option>
                <option value="STAFF" class="text-blue-700 font-bold">🔧 Kỹ thuật viên (Chung)</option>
                <option value="USER" class="text-slate-700 font-bold">🎓 Cán bộ / Giảng viên / Sinh viên</option>
              </select>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="UserManagementPage.closeModal()">
                Hủy bỏ
              </button>
              <button type="submit" id="btn-modal-submit" class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-user-plus"></i>
                <span>TẠO TÀI KHOẢN NGAY</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  handleRoleSelectChange(role) {
    const deptSelect = document.getElementById('modal-dept');
    if (deptSelect) {
      if (role === 'ADMIN') {
        deptSelect.value = 'Ban Giám Hiệu';
      } else if (['MANAGER', 'DEPUTY_MANAGER', 'STAFF_IT', 'STAFF_MAINTENANCE', 'STAFF_GREEN', 'STAFF_CLEANING', 'STAFF'].includes(role)) {
        deptSelect.value = 'Phòng Quản trị Thiết bị và Cơ sở vật chất';
      } else if (role === 'STAFF_KTX') {
        deptSelect.value = 'Ban Quản lý Ký túc xá';
      }
    }
  },

  // 2. MODAL: CHỈNH SỬA & PHÂN QUYỀN TÀI KHOẢN
  openEditModal(uid) {
    const u = this.users.find(x => x.uid === uid);
    if (!u) return;

    const isSuperAdmin = AuthService.isSuperAdmin();
    if (!isSuperAdmin && (u.role === 'ADMIN' || u.role === 'MANAGER')) {
      Utils.showToast('Từ chối quyền: Trưởng phòng chỉ có thể chỉnh sửa nhân sự từ cấp Phó Trưởng phòng trở xuống!', 'warning');
      return;
    }

    const departments = window.APP_CONFIG.DEPARTMENTS;
    const container = document.getElementById('user-modal-container');
    container.innerHTML = `
      <div id="user-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 relative max-h-[90vh] overflow-y-auto">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="UserManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-user-pen"></i>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900">CHỈNH SỬA TÀI KHOẢN</h3>
              <p class="text-xs text-slate-500 font-semibold">${u.email}</p>
            </div>
          </div>

          <form class="space-y-4" onsubmit="UserManagementPage.handleEditSubmit(event, '${u.uid}')">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ và tên <span class="text-red-500">*</span></label>
              <input type="text" id="edit-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold" value="${u.displayName || ''}" required>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
              <input type="tel" id="edit-phone" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" value="${u.phone || ''}">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Khoa / Phòng / Bộ phận</label>
              <select id="edit-dept" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500">
                ${departments.map(d => `<option value="${d}" ${(u.departmentName === d || (u.role === 'ADMIN' && d === 'Ban Giám Hiệu')) ? 'selected' : ''}>${d}</option>`).join('')}
                <option value="Khác" ${!departments.includes(u.departmentName) ? 'selected' : ''}>Khác</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Vai trò & Phân quyền hệ thống <span class="text-red-500">*</span></label>
              <select id="edit-role" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold" onchange="UserManagementPage.handleRoleSelectChange(this.value)">
                ${isSuperAdmin ? `
                  <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>🏛️ Ban Giám Hiệu</option>
                  <option value="MANAGER" ${u.role === 'MANAGER' ? 'selected' : ''}>👔 Trưởng phòng</option>
                ` : ''}
                <option value="DEPUTY_MANAGER" ${u.role === 'DEPUTY_MANAGER' ? 'selected' : ''}>🎖️ Phó Trưởng phòng</option>
                <option value="STAFF_IT" ${u.role === 'STAFF_IT' ? 'selected' : ''}>💻 Chuyên Viên IT</option>
                <option value="STAFF_MAINTENANCE" ${u.role === 'STAFF_MAINTENANCE' ? 'selected' : ''}>🛠️ Chuyên Viên Bảo Trì</option>
                <option value="STAFF_GREEN" ${u.role === 'STAFF_GREEN' ? 'selected' : ''}>🌿 Cây Xanh</option>
                <option value="STAFF_CLEANING" ${u.role === 'STAFF_CLEANING' ? 'selected' : ''}>🧹 Tạp Vụ</option>
                <option value="STAFF_KTX" ${u.role === 'STAFF_KTX' ? 'selected' : ''}>🏢 Kỹ thuật viên Ký túc xá</option>
                <option value="STAFF" ${u.role === 'STAFF' ? 'selected' : ''}>🔧 Kỹ thuật viên (Chung)</option>
                <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>🎓 Cán bộ / Giảng viên / Sinh viên</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Trạng thái kích hoạt</label>
              <select id="edit-status" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold">
                <option value="true" ${u.isActive !== false ? 'selected' : ''} class="text-emerald-700 font-bold">🟢 Đang hoạt động bình thường</option>
                <option value="false" ${u.isActive === false ? 'selected' : ''} class="text-rose-700 font-bold">🔴 Đã tạm khóa (Không cho đăng nhập)</option>
              </select>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="UserManagementPage.closeModal()">
                Hủy bỏ
              </button>
              <button type="submit" id="btn-edit-submit" class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-floppy-disk"></i>
                <span>LƯU THAY ĐỔI</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  closeModal() {
    const backdrop = document.getElementById('user-modal-backdrop');
    if (backdrop) backdrop.remove();
  },

  // 3. XỬ LÝ TẠO TÀI KHOẢN MỚI TRỰC TIẾP LÊN FIREBASE
  async handleCreateSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-modal-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang tạo trên Firebase...';

    const name = document.getElementById('modal-name').value.trim();
    const email = document.getElementById('modal-email').value.trim();
    const pass = document.getElementById('modal-pass').value;
    const phone = document.getElementById('modal-phone').value.trim();
    let dept = document.getElementById('modal-dept').value;
    const role = document.getElementById('modal-role').value;

    if (role === 'ADMIN') {
      dept = 'Ban Giám Hiệu';
    }

    try {
      // Dùng Firebase Identity Toolkit REST API để tạo user mà không làm mất phiên đăng nhập của Admin
      const apiKey = window.APP_CONFIG.firebaseConfig.apiKey;
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true })
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error?.message || 'Lỗi tạo tài khoản';
        if (msg === 'EMAIL_EXISTS') msg = 'Email này đã tồn tại trên hệ thống.';
        throw new Error(msg);
      }

      const uid = data.localId;

      // Lưu hồ sơ và phân quyền vào Cloud Firestore
      const userDoc = {
        uid,
        email,
        displayName: name,
        phone,
        departmentName: dept,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await window.firebase.firestore().collection('users').doc(uid).set(userDoc);

      Utils.showToast(`Đã tạo thành công tài khoản [${role}] cho ${name}!`, 'success', 4000);
      this.closeModal();
      await this.loadUsersFromFirestore();
    } catch (err) {
      Utils.showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i><span>TẠO TÀI KHOẢN NGAY</span>';
    }
  },

  // 4. XỬ LÝ LƯU CHỈNH SỬA TÀI KHOẢN
  async handleEditSubmit(e, uid) {
    e.preventDefault();
    const btn = document.getElementById('btn-edit-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang lưu...';

    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    let dept = document.getElementById('edit-dept').value;
    const role = document.getElementById('edit-role').value;
    const isActive = document.getElementById('edit-status').value === 'true';

    if (role === 'ADMIN') {
      dept = 'Ban Giám Hiệu';
    }

    try {
      await window.firebase.firestore().collection('users').doc(uid).set({
        displayName: name,
        phone,
        departmentName: dept,
        role,
        isActive,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      Utils.showToast(`Đã cập nhật thông tin và quyền hạn của ${name} thành công!`, 'success');
      this.closeModal();
      await this.loadUsersFromFirestore();
    } catch (err) {
      Utils.showToast('Lỗi cập nhật: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>LƯU THAY ĐỔI</span>';
    }
  },

  // 5. ĐỔI VAI TRÒ NHANH TRỰC TIẾP TỪ DROPDOWN BẢNG
  async changeRoleDirect(uid, newRole) {
    const isSuperAdmin = AuthService.isSuperAdmin();
    const u = this.users.find(x => x.uid === uid);
    if (!u) return;

    if (!isSuperAdmin && (u.role === 'ADMIN' || u.role === 'MANAGER' || newRole === 'ADMIN' || newRole === 'MANAGER' || newRole === 'SUPER_ADMIN')) {
      Utils.showToast('Từ chối quyền: Trưởng phòng chỉ có thể phân quyền từ Phó Trưởng phòng trở xuống!', 'warning');
      const body = document.getElementById('users-table-body');
      if (body) body.innerHTML = this.renderRows();
      return;
    }

    if (window.firebase && window.firebase.firestore) {
      try {
        const updateData = {
          role: newRole,
          updatedAt: new Date().toISOString()
        };
        if (newRole === 'ADMIN') {
          updateData.departmentName = 'Ban Giám Hiệu';
          u.departmentName = 'Ban Giám Hiệu';
        }
        await window.firebase.firestore().collection('users').doc(uid).update(updateData);
        u.role = newRole;
        Utils.showToast(`Đã đổi vai trò của ${u ? u.displayName : uid} thành [${newRole}]!`, 'success');
        this.updateStats();
        const body = document.getElementById('users-table-body');
        if (body) body.innerHTML = this.renderRows();
      } catch (err) {
        Utils.showToast('Lỗi cập nhật vai trò: ' + err.message, 'error');
      }
    }
  },

  // 6. KHÓA / MỞ KHÓA TÀI KHOẢN
  async toggleLock(uid) {
    const isSuperAdmin = AuthService.isSuperAdmin();
    const u = this.users.find(x => x.uid === uid);
    if (!u) return;

    if (!isSuperAdmin && (u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'SUPER_ADMIN')) {
      Utils.showToast('Từ chối quyền: Trưởng phòng không thể khóa tài khoản Ban Giám Hiệu hoặc Quản trị viên!', 'warning');
      return;
    }

    const newStatus = u.isActive === false ? true : false;

    if (window.firebase && window.firebase.firestore) {
      try {
        await window.firebase.firestore().collection('users').doc(uid).update({
          isActive: newStatus,
          updatedAt: new Date().toISOString()
        });
        u.isActive = newStatus;
        const body = document.getElementById('users-table-body');
        if (body) body.innerHTML = this.renderRows();
        Utils.showToast(`Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản ${u.displayName || u.email}.`, 'info');
      } catch (err) {
        Utils.showToast('Lỗi cập nhật: ' + err.message, 'error');
      }
    }
  },

  // 7. XÓA TÀI KHOẢN (SUPER ADMIN CÓ QUYỀN XÓA TẤT CẢ USER)
  async deleteUser(uid, name) {
    const isSuperAdmin = AuthService.isSuperAdmin();
    const currentUser = AuthService.getCurrentUser();

    if (!isSuperAdmin && currentUser?.role !== 'MANAGER') {
      Utils.showToast('Từ chối quyền: Chỉ Quản trị viên Super Admin mới có quyền xóa tài khoản khỏi hệ thống!', 'warning');
      return;
    }

    const targetUser = this.users.find(x => x.uid === uid);
    if (!isSuperAdmin && targetUser && (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN' || targetUser.role === 'MANAGER')) {
      Utils.showToast('Từ chối quyền: Trưởng phòng không thể xóa tài khoản Ban Giám Hiệu hoặc Quản trị viên!', 'warning');
      return;
    }

    if (currentUser && currentUser.uid === uid) {
      if (!confirm(`CẢNH BÁO: Bạn đang xóa chính tài khoản hiện tại của mình ("${name}")!\nBạn có chắc chắn muốn tiếp tục xóa không?`)) return;
    } else {
      if (!confirm(`XÁC NHẬN XÓA TÀI KHOẢN:\nBạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${name}" khỏi hệ thống Firestore?\nThao tác này không thể hoàn tác.`)) return;
    }

    if (window.firebase && window.firebase.firestore) {
      try {
        await window.firebase.firestore().collection('users').doc(uid).delete();
        this.users = this.users.filter(x => x.uid !== uid);
        const body = document.getElementById('users-table-body');
        if (body) body.innerHTML = this.renderRows();
        this.updateStats();
        Utils.showToast(`Đã xóa vĩnh viễn tài khoản "${name}" khỏi hệ thống thành công!`, 'success');
      } catch (err) {
        Utils.showToast('Lỗi xóa tài khoản: ' + err.message, 'error');
      }
    }
  }
};

window.UserManagementPage = UserManagementPage;
