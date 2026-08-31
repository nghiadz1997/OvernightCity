/**
 * NSG SUPPORT - ADMIN SIDEBAR COMPONENT
 * Cấu trúc menu chuẩn theo yêu cầu mục 39
 */

const SidebarComponent = {
  render(containerId = 'app-sidebar') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentHash = window.location.hash || '#/admin';
    const pendingReports = RealtimeService.reports.filter(r => r.status === 'CHỜ PHÂN CÔNG' || r.status === 'MỚI').length;

    container.innerHTML = `
      <!-- Mobile Backdrop -->
      <div id="sidebar-backdrop" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 hidden md:hidden" onclick="SidebarComponent.closeMobile()"></div>

      <!-- Sidebar Container -->
      <aside id="sidebar-panel" class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform transform -translate-x-full md:translate-x-0 md:static md:inset-auto md:min-h-screen">
        <!-- Brand Header -->
        <div class="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 flex items-center justify-center shrink-0">
              ${(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.logoUrl) ? `
                <img src="${APP_CONFIG.logoUrl}" alt="Logo" class="max-h-9 max-w-9 w-auto h-auto object-contain" onerror="this.style.display='none'; this.nextElementSibling ? this.nextElementSibling.style.display='flex' : null;">
                <div class="w-8 h-8 rounded-lg bg-blue-600 text-white items-center justify-center text-base shadow hidden">
                  <i class="fa-solid fa-headset"></i>
                </div>
              ` : `
                <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-base shadow">
                  <i class="fa-solid fa-headset"></i>
                </div>
              `}
            </div>
            <span class="font-extrabold text-white text-base tracking-wider">NSG SUPPORT</span>
          </div>
          <button class="md:hidden text-slate-400 hover:text-white" onclick="SidebarComponent.closeMobile()">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Navigation Links -->
        <div class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <!-- 🏠 Tổng quan -->
          <a href="#/admin" class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
            <i class="fa-solid fa-house w-5 text-center text-base"></i>
            <span>Tổng quan</span>
          </a>

          <!-- 📋 Công việc (Menu cha) -->
          <div class="pt-2">
            <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quản lý công việc
            </div>

            <!-- Chờ phân công (ĐẶC BIỆT CÓ BADGE REALTIME MỤC 40) -->
            <a href="#/admin/pending" class="sidebar-item flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/pending' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-hourglass-start w-5 text-center text-amber-400"></i>
                <span>Chờ phân công</span>
              </div>
              <span id="sidebar-pending-badge" class="${pendingReports > 0 ? '' : 'hidden'} px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white shadow-xs">
                ${pendingReports}
              </span>
            </a>

            <!-- Tất cả công việc -->
            <a href="#/admin/tasks" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/tasks' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-list-check w-5 text-center text-blue-400"></i>
              <span>Danh sách công việc</span>
            </a>

            <!-- Đang xử lý -->
            <a href="#/admin/tasks?status=ĐANG+XỬ+LÝ" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
              <i class="fa-solid fa-screwdriver-wrench w-4 text-center text-indigo-400"></i>
              <span>Đang xử lý</span>
            </a>

            <!-- Chờ nghiệm thu -->
            <a href="#/admin/tasks?status=CHỜ+NGHIỆM+THU" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
              <i class="fa-solid fa-clipboard-check w-4 text-center text-purple-400"></i>
              <span>Chờ nghiệm thu</span>
            </a>

            <!-- Hoàn thành -->
            <a href="#/admin/tasks?status=HOÀN+THÀNH" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
              <i class="fa-solid fa-circle-check w-4 text-center text-emerald-400"></i>
              <span>Hoàn thành</span>
            </a>

            <!-- Quá hạn -->
            <a href="#/admin/tasks?filter=overdue" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium pl-9 transition-all text-slate-400 hover:text-red-400 hover:bg-slate-800">
              <i class="fa-solid fa-triangle-exclamation w-4 text-center text-red-500"></i>
              <span>Quá hạn</span>
            </a>
          </div>

          <!-- ➕ Giao việc mới -->
          <div class="pt-2">
            <a href="#/admin/create-task" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all">
              <i class="fa-solid fa-plus-circle w-5 text-center text-base"></i>
              <span>Giao việc mới</span>
            </a>
          <!-- 👥 Quản lý Nhân sự & Ngày phép (Dành riêng cho Nội bộ) -->
          <div class="pt-2">
            <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Nhân sự & Ngày phép
            </div>

            <!-- 🪪 Danh bạ nhân sự -->
            <a href="#/admin/employees" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash.startsWith('#/admin/employees') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-id-card w-5 text-center text-indigo-400"></i>
              <span>Quản lý nhân sự</span>
            </a>

            <!-- 🌴 Quản lý ngày phép -->
            <a href="#/admin/leave-management" class="sidebar-item flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash.startsWith('#/admin/leave-management') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-calendar-check w-5 text-center text-emerald-400"></i>
                <span>Quản lý ngày phép</span>
              </div>
            </a>
          </div>

          <!-- Quản trị chung -->
          <div class="pt-3">
            <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Hệ thống
            </div>

            <!-- 📢 Phản ánh -->
            <a href="#/admin/tasks?type=REPORT" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-slate-800 text-slate-300">
              <i class="fa-solid fa-bullhorn w-5 text-center text-cyan-400"></i>
              <span>Phản ánh người dùng</span>
            </a>

            <!-- 👑 Tài khoản & Phân quyền (Chỉ Super Admin & Trưởng phòng) -->
            ${AuthService.canManageUsers() ? `
              <a href="#/admin/users" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${currentHash === '#/admin/users' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-purple-300'}">
                <i class="fa-solid fa-users-gear w-5 text-center text-purple-400"></i>
                <span>Tài khoản & Phân quyền</span>
              </a>
            ` : ''}

            <!-- 🏢 Quản lý phòng NSG (Cơ sở -> Tòa nhà -> Phòng -> Thiết bị -> PC) -->
            <a href="#/admin/rooms" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${currentHash.startsWith('#/admin/rooms') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-blue-300'}">
              <i class="fa-solid fa-door-open w-5 text-center text-amber-400"></i>
              <span>Quản lý phòng NSG</span>
            </a>

            <!-- 🏢 Phòng/Khoa -->
            <a href="#/admin/departments" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/departments' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-building-columns w-5 text-center text-amber-400"></i>
              <span>Phòng / Khoa</span>
            </a>

            <!-- 🏛️ Địa điểm & Phòng (Super Admin) -->
            ${AuthService.isSuperAdmin() ? `
              <a href="#/admin/locations" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/locations' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-emerald-300'}">
                <i class="fa-solid fa-map-location-dot w-5 text-center text-emerald-400"></i>
                <span>Địa điểm & Phòng</span>
              </a>

              <a href="#/admin/categories" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/categories' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-cyan-300'}">
                <i class="fa-solid fa-layer-group w-5 text-center text-cyan-400"></i>
                <span>Loại thiết bị & SLA</span>
              </a>
            ` : ''}

            <!-- 📊 Báo cáo -->
            <a href="#/admin/reports" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/reports' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-chart-line w-5 text-center text-teal-400"></i>
              <span>Báo cáo & Xuất Excel</span>
            </a>

            <!-- ⚙️ Cài đặt (Chỉ dành riêng cho Super Admin) -->
            ${AuthService.isSuperAdmin() ? `
              <a href="#/admin/settings" class="sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/settings' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
                <i class="fa-solid fa-sliders w-5 text-center text-slate-400"></i>
                <span>Cài đặt hệ thống</span>
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Footer: Switch to Staff Portal -->
        <div class="p-3 bg-slate-950 border-t border-slate-800">
          <a href="#/staff" class="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors">
            <i class="fa-solid fa-toolbox text-indigo-400"></i>
            <span>Chuyển cổng Kỹ thuật viên</span>
          </a>
        </div>
      </aside>
    `;
  },

  toggleMobile() {
    const sidebar = document.getElementById('sidebar-panel');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      const isOpen = !sidebar.classList.contains('-translate-x-full');
      if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      } else {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
      }
    }
  },

  closeMobile() {
    const sidebar = document.getElementById('sidebar-panel');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  },

  updatePendingBadge(count) {
    const badge = document.getElementById('sidebar-pending-badge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
};

window.SidebarComponent = SidebarComponent;
