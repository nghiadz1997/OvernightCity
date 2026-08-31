/**
 * NSG SUPPORT - TOP NAVIGATION BAR COMPONENT
 */

const NavbarComponent = {
  render(containerId = 'app-navbar') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = AuthService.getCurrentUser();
    const isAuth = Boolean(user);
    const unreadCount = RealtimeService.notifications.filter(n => !n.isRead).length;

    container.innerHTML = `
      <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Left: Mobile Menu & Logo -->
            <div class="flex items-center gap-3">
              <button id="mobile-menu-toggle" class="md:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg focus:outline-none">
                <i class="fa-solid fa-bars text-xl"></i>
              </button>

              <a href="#/" class="flex items-center gap-3 group">
                <div class="h-10 w-10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  ${(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.logoUrl) ? `
                    <img src="${APP_CONFIG.logoUrl}" alt="Logo" class="max-h-10 max-w-10 w-auto h-auto object-contain" onerror="this.style.display='none'; this.nextElementSibling ? this.nextElementSibling.style.display='flex' : null;">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 text-white items-center justify-center text-xl shadow-md hidden">
                      <i class="fa-solid fa-headset"></i>
                    </div>
                  ` : `
                    <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md">
                      <i class="fa-solid fa-headset"></i>
                    </div>
                  `}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-blue-900 text-lg tracking-tight">NSG SUPPORT</span>
                    <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Edu Tech</span>
                  </div>
                  <p class="text-[11px] text-slate-500 font-medium hidden sm:block">Phản Ánh & Hỗ Trợ Kỹ Thuật Nội Bộ</p>
                </div>
              </a>
            </div>

            <!-- Center: Navigation Links for Public or Quick Access -->
            <nav class="hidden lg:flex items-center gap-1">
              <a href="#/" class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                <i class="fa-solid fa-house mr-1 text-slate-400"></i> Trang chủ
              </a>
              <a href="#/report" class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                <i class="fa-solid fa-paper-plane mr-1 text-slate-400"></i> Gửi phản ánh
              </a>
              <a href="#/tracking" class="nav-link px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors">
                <i class="fa-solid fa-magnifying-glass mr-1 text-slate-400"></i> Tra cứu tiến độ
              </a>
              ${isAuth && AuthService.isManager() ? `
                <a href="#/admin" class="nav-link px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                  <i class="fa-solid fa-chart-pie mr-1 text-blue-500"></i> Quản trị
                </a>
              ` : ''}
              ${isAuth && AuthService.isStaff() ? `
                <a href="#/staff" class="nav-link px-3 py-2 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <i class="fa-solid fa-toolbox mr-1 text-indigo-500"></i> Kỹ thuật viên
                </a>
              ` : ''}
            </nav>

            <!-- Right: Notifications & User Profile -->
            <div class="flex items-center gap-3">
              <!-- Notifications Bell -->
              <button id="btn-toggle-notifications" class="relative p-2 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors" title="Thông báo hệ thống">
                <i class="fa-solid fa-bell text-lg"></i>
                <span id="nav-notif-badge" class="${unreadCount > 0 ? '' : 'hidden'} absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  ${unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>

              <!-- User Profile or Login -->
              ${isAuth ? `
                <div class="relative group">
                  <button id="user-menu-btn" class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none">
                    <img src="${user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.displayName}" class="w-8 h-8 rounded-lg bg-blue-100 border border-slate-200" alt="Avatar">
                    <div class="hidden md:block text-left">
                      <div class="text-xs font-bold text-slate-800 leading-tight">${user.displayName}</div>
                      <div class="text-[10px] text-blue-600 font-semibold">${user.role}</div>
                    </div>
                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                  </button>

                  <!-- Dropdown Menu -->
                  <div class="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 hidden group-hover:block hover:block z-50 animate-fade-in">
                    <div class="px-4 py-2 border-b border-slate-100">
                      <p class="text-xs text-slate-400">Đang đăng nhập với vai trò:</p>
                      <p class="text-sm font-bold text-slate-800">${user.displayName}</p>
                      <p class="text-xs text-blue-600 font-medium">${user.departmentName || user.role}</p>
                    </div>

                    <!-- Real User Menu -->
                    <div class="py-1">
                      ${AuthService.isManager() ? `
                        <a href="#/admin" class="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 flex items-center gap-2">
                          <i class="fa-solid fa-chart-pie text-blue-600"></i> Trang Quản trị
                        </a>
                      ` : ''}
                      ${AuthService.isStaff() ? `
                        <a href="#/staff" class="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 flex items-center gap-2">
                          <i class="fa-solid fa-toolbox text-indigo-600"></i> Cổng Kỹ thuật viên
                        </a>
                      ` : ''}
                      <a href="#/tracking" class="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 flex items-center gap-2">
                        <i class="fa-solid fa-magnifying-glass text-slate-500"></i> Tra cứu phản ánh
                      </a>
                    </div>

                    <div class="border-t border-slate-100 mt-1"></div>
                    <button class="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2" onclick="AuthService.logout(); window.location.hash='#/login'">
                      <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                  </div>
                </div>
              ` : `
                <a href="#/login" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all">
                  <i class="fa-solid fa-right-to-bracket"></i>
                  <span>Đăng nhập</span>
                </a>
              `}
            </div>
          </div>
        </div>
      </header>
    `;

    // Gắn sự kiện nút chuông thông báo
    const notifBtn = document.getElementById('btn-toggle-notifications');
    if (notifBtn) {
      notifBtn.onclick = () => NotificationDrawerComponent.toggle();
    }

    // Gắn sự kiện menu mobile
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    if (mobileBtn) {
      mobileBtn.onclick = () => SidebarComponent.toggleMobile();
    }
  },

  updateBadge(count) {
    const badge = document.getElementById('nav-notif-badge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count > 9 ? '9+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
};

window.NavbarComponent = NavbarComponent;
