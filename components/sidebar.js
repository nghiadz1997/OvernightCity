/**
 * NSG SUPPORT - ADMIN SIDEBAR COMPONENT (v8.6)
 * Hỗ trợ chế độ Thu gọn (Ẩn vào / Lấy ra) mượt mà cho không gian làm việc rộng rãi
 */

const SidebarComponent = {
  isCollapsed() {
    return localStorage.getItem('nsg_sidebar_collapsed') === 'true';
  },

  setCollapsed(collapsed) {
    localStorage.setItem('nsg_sidebar_collapsed', collapsed ? 'true' : 'false');
    this.render();
  },

  toggleCollapse() {
    const current = this.isCollapsed();
    this.setCollapsed(!current);
  },

  render(containerId = 'app-sidebar') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentHash = window.location.hash || '#/admin';
    const pendingReports = RealtimeService.reports.filter(r => r.status === 'CHỜ PHÂN CÔNG' || r.status === 'MỚI').length;
    const collapsed = this.isCollapsed();

    container.innerHTML = `
      <!-- Mobile Backdrop -->
      <div id="sidebar-backdrop" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 hidden md:hidden" onclick="SidebarComponent.closeMobile()"></div>

      <!-- Sidebar Container -->
      <aside id="sidebar-panel" class="fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out transform -translate-x-full md:translate-x-0 md:static md:inset-auto md:min-h-screen border-r border-slate-800 shadow-xl">
        
        <!-- Brand Header & Toggle Button -->
        <div class="h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} bg-slate-950 border-b border-slate-800 transition-all">
          <div class="flex items-center gap-3 overflow-hidden">
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
            ${!collapsed ? `
              <span class="font-extrabold text-white text-base tracking-wider whitespace-nowrap animate-fade-in">NSG SUPPORT</span>
            ` : ''}
          </div>

          <!-- Nút đóng mobile -->
          <button class="md:hidden text-slate-400 hover:text-white" onclick="SidebarComponent.closeMobile()">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>

          <!-- Nút thu gọn / mở rộng Desktop -->
          ${!collapsed ? `
            <button type="button" class="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-all cursor-pointer shadow-xs" title="Thu gọn menu (Ẩn vào)" onclick="SidebarComponent.toggleCollapse()">
              <i class="fa-solid fa-angles-left text-xs"></i>
            </button>
          ` : ''}
        </div>

        <!-- Navigation Links -->
        <div class="flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'} space-y-1.5 custom-scrollbar">
          
          <!-- 🏠 Tổng quan -->
          <a href="#/admin" title="Tổng quan" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
            <i class="fa-solid fa-house w-5 text-center text-base"></i>
            ${!collapsed ? `<span>Tổng quan</span>` : ''}
          </a>

          <!-- 📋 Quản lý công việc -->
          <div class="pt-2">
            ${!collapsed ? `
              <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Quản lý công việc
              </div>
            ` : `<div class="border-t border-slate-800 my-2"></div>`}

            <!-- Chờ phân công -->
            <a href="#/admin/pending" title="Chờ phân công" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3 relative' : 'justify-between px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/pending' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-hourglass-start w-5 text-center text-amber-400"></i>
                ${!collapsed ? `<span>Chờ phân công</span>` : ''}
              </div>
              <span id="sidebar-pending-badge" class="${pendingReports > 0 ? '' : 'hidden'} ${collapsed ? 'absolute -top-1 -right-1 w-4 h-4 text-[9px] flex items-center justify-center p-0' : 'px-2 py-0.5 text-xs'} font-bold rounded-full bg-red-500 text-white shadow-xs">
                ${pendingReports}
              </span>
            </a>

            <!-- Danh sách công việc -->
            <a href="#/admin/tasks" title="Danh sách công việc" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/tasks' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-list-check w-5 text-center text-blue-400"></i>
              ${!collapsed ? `<span>Danh sách công việc</span>` : ''}
            </a>

            ${!collapsed ? `
              <!-- Đang xử lý -->
              <a href="#/admin/tasks?status=ĐANG+XỬ+LÝ" class="sidebar-item flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                <i class="fa-solid fa-screwdriver-wrench w-4 text-center text-indigo-400"></i>
                <span>Đang xử lý</span>
              </a>

              <!-- Chờ nghiệm thu -->
              <a href="#/admin/tasks?status=CHỜ+NGHIỆM+THU" class="sidebar-item flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                <i class="fa-solid fa-clipboard-check w-4 text-center text-purple-400"></i>
                <span>Chờ nghiệm thu</span>
              </a>

              <!-- Hoàn thành -->
              <a href="#/admin/tasks?status=HOÀN+THÀNH" class="sidebar-item flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-medium pl-9 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                <i class="fa-solid fa-circle-check w-4 text-center text-emerald-400"></i>
                <span>Hoàn thành</span>
              </a>

              <!-- Quá hạn -->
              <a href="#/admin/tasks?filter=overdue" class="sidebar-item flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-medium pl-9 transition-all text-slate-400 hover:text-red-400 hover:bg-slate-800">
                <i class="fa-solid fa-triangle-exclamation w-4 text-center text-red-500"></i>
                <span>Quá hạn</span>
              </a>
            ` : ''}
          </div>

          <!-- ➕ Giao việc mới -->
          <div class="pt-2">
            <a href="#/admin/create-task" title="Giao việc mới" class="flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all">
              <i class="fa-solid fa-plus-circle w-5 text-center text-base"></i>
              ${!collapsed ? `<span>Giao việc mới</span>` : ''}
            </a>
          </div>

          <!-- 🏢 Quản lý phòng NSG (Cơ sở -> Tòa nhà -> Phòng -> Máy lạnh ❄️ -> Máy PC 💻) -->
          <div class="pt-2">
            ${!collapsed ? `
              <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cơ sở vật chất
              </div>
            ` : `<div class="border-t border-slate-800 my-2"></div>`}

            <a href="#/admin/rooms" title="Quản lý phòng NSG, Máy lạnh & Máy tính PC" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-bold transition-all ${currentHash.startsWith('#/admin/rooms') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-sky-300'}">
              <i class="fa-solid fa-door-open w-5 text-center text-sky-400"></i>
              ${!collapsed ? `<span>Quản lý phòng NSG</span>` : ''}
            </a>
          </div>

          <!-- 👥 Quản lý Nhân sự & Ngày phép -->
          <div class="pt-2">
            ${!collapsed ? `
              <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nhân sự & Ngày phép
              </div>
            ` : `<div class="border-t border-slate-800 my-2"></div>`}

            <!-- 🪪 Danh bạ nhân sự -->
            <a href="#/admin/employees" title="Quản lý nhân sự" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash.startsWith('#/admin/employees') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-id-card w-5 text-center text-indigo-400"></i>
              ${!collapsed ? `<span>Quản lý nhân sự</span>` : ''}
            </a>

            <!-- 🌴 Quản lý ngày phép -->
            <a href="#/admin/leave-management" title="Quản lý ngày phép" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'justify-between px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash.startsWith('#/admin/leave-management') ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-calendar-check w-5 text-center text-emerald-400"></i>
                ${!collapsed ? `<span>Quản lý ngày phép</span>` : ''}
              </div>
            </a>
          </div>

          <!-- Quản trị hệ thống -->
          <div class="pt-2">
            ${!collapsed ? `
              <div class="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Hệ thống
              </div>
            ` : `<div class="border-t border-slate-800 my-2"></div>`}

            <!-- 👑 Tài khoản & Phân quyền -->
            ${AuthService.canManageUsers() ? `
              <a href="#/admin/users" title="Tài khoản & Phân quyền" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-bold transition-all ${currentHash === '#/admin/users' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-purple-300'}">
                <i class="fa-solid fa-users-gear w-5 text-center text-purple-400"></i>
                ${!collapsed ? `<span>Tài khoản & Phân quyền</span>` : ''}
              </a>
            ` : ''}

            <!-- 🏢 Phòng/Khoa -->
            <a href="#/admin/departments" title="Phòng / Khoa" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/departments' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-building-columns w-5 text-center text-amber-400"></i>
              ${!collapsed ? `<span>Phòng / Khoa</span>` : ''}
            </a>

            <!-- 🏛️ Địa điểm & Tòa nhà -->
            ${AuthService.isSuperAdmin() ? `
              <a href="#/admin/locations" title="Địa điểm & Tòa nhà" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/locations' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-emerald-300'}">
                <i class="fa-solid fa-map-location-dot w-5 text-center text-emerald-400"></i>
                ${!collapsed ? `<span>Địa điểm & Tòa nhà</span>` : ''}
              </a>

              <a href="#/admin/categories" title="Loại thiết bị & SLA" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/categories' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-cyan-300'}">
                <i class="fa-solid fa-layer-group w-5 text-center text-cyan-400"></i>
                ${!collapsed ? `<span>Loại thiết bị & SLA</span>` : ''}
              </a>
            ` : ''}

            <!-- 📊 Báo cáo -->
            <a href="#/admin/reports" title="Báo cáo & Xuất Excel" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/reports' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
              <i class="fa-solid fa-chart-line w-5 text-center text-teal-400"></i>
              ${!collapsed ? `<span>Báo cáo & Xuất Excel</span>` : ''}
            </a>

            <!-- ⚙️ Cài đặt -->
            ${AuthService.isSuperAdmin() ? `
              <a href="#/admin/settings" title="Cài đặt hệ thống" class="sidebar-item flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-xl text-sm font-medium transition-all ${currentHash === '#/admin/settings' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}">
                <i class="fa-solid fa-sliders w-5 text-center text-slate-400"></i>
                ${!collapsed ? `<span>Cài đặt hệ thống</span>` : ''}
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Footer: Nút Chuyển Cổng & Nút Thu Gọn / Mở Rộng Nhanh -->
        <div class="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          <!-- Chuyển cổng KTV -->
          <a href="#/staff" title="Chuyển sang cổng Kỹ thuật viên" class="flex items-center ${collapsed ? 'justify-center p-2' : 'justify-center gap-2 py-2 px-3'} rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors">
            <i class="fa-solid fa-toolbox text-indigo-400"></i>
            ${!collapsed ? `<span>Cổng Kỹ thuật viên</span>` : ''}
          </a>

          <!-- Nút thu gọn / mở rộng ở chân trang -->
          <button type="button" onclick="SidebarComponent.toggleCollapse()" class="w-full flex items-center ${collapsed ? 'justify-center p-2' : 'justify-between px-3 py-1.5'} text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer" title="${collapsed ? 'Mở rộng menu (Lấy ra)' : 'Thu gọn menu (Ẩn vào)'}">
            <span class="${collapsed ? 'hidden' : 'inline'} flex items-center gap-1.5">
              <i class="fa-solid fa-bars-staggered"></i>
              <span>Thu gọn menu</span>
            </span>
            <i class="fa-solid ${collapsed ? 'fa-angles-right text-base text-blue-400' : 'fa-angles-left text-xs'}"></i>
          </button>
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
