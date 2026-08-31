/**
 * NSG SUPPORT - APPLICATION MAIN CONTROLLER & HASH ROUTER
 */

const App = {
  deferredPrompt: null,
  currentPage: null,

  init() {
    console.log('[App] Starting NSG SUPPORT System...');

    // 1. Luôn render Navbar & Drawer trước để trang web luôn có giao diện hiển thị
    try {
      NavbarComponent.render('app-navbar');
    } catch (e) {
      console.error('[App] Navbar render error:', e);
    }

    try {
      NotificationDrawerComponent.render('notification-drawer-container');
    } catch (e) {
      console.error('[App] NotificationDrawer render error:', e);
    }

    // 2. Lắng nghe thay đổi Hash URL để điều hướng
    window.addEventListener('hashchange', () => this.handleRouting());

    // 3. Tải và hiển thị ngay trang hiện tại (Trang chủ / Form / Login)
    try {
      this.handleRouting();
    } catch (e) {
      console.error('[App] Initial routing error:', e);
      const appMain = document.getElementById('app-main');
      if (appMain && typeof HomePage !== 'undefined') {
        appMain.innerHTML = HomePage.render();
      }
    }

    // 4. Khởi động các dịch vụ ngầm (Firebase Auth & Realtime) trong try/catch an toàn
    try {
      AuthService.init();
      AuthService.onAuthStateChanged((user) => {
        try {
          NavbarComponent.render('app-navbar');
          if (document.getElementById('app-sidebar')) {
            SidebarComponent.render('app-sidebar');
          }
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[App] AuthService init error:', e);
    }

    try {
      RealtimeService.init();
      RealtimeService.subscribeNotifications((notifs) => {
        try {
          const unread = notifs.filter(n => !n.isRead).length;
          NavbarComponent.updateBadge(unread);
        } catch (e) {}
      });

      RealtimeService.subscribeReports((reports) => {
        try {
          const pendingCount = reports.filter(r => r.status === 'CHỜ PHÂN CÔNG' || r.status === 'MỚI').length;
          SidebarComponent.updatePendingBadge(pendingCount);
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[App] RealtimeService init error:', e);
    }

    // 5. Đăng ký PWA Service Worker
    try {
      this.registerPWA();
    } catch (e) {}
  },

  handleRouting() {
    const rawHash = window.location.hash || '#/';
    const path = rawHash.split('?')[0];

    // Hủy các listener / charts của trang cũ nếu có
    if (this.currentPage && typeof this.currentPage.destroy === 'function') {
      this.currentPage.destroy();
    }

    // Đóng bất kỳ modal thành công nào còn sót lại khi chuyển trang
    const modal = document.getElementById('report-success-modal');
    if (modal) modal.remove();

    const appMain = document.getElementById('app-main');
    const appLayout = document.getElementById('app-layout');
    if (!appMain || !appLayout) return;

    // Đóng drawer mobile nếu đang mở
    SidebarComponent.closeMobile();
    window.scrollTo(0, 0);

    const isAdminRoute = path.startsWith('#/admin');
    const isStaffRoute = path.startsWith('#/staff');

    // Phân quyền thực tế (RBAC Auth Guard)
    if (isAdminRoute) {
      if (!AuthService.isAuthenticated() || !AuthService.isManager()) {
        Utils.showToast('Vui lòng đăng nhập với tài khoản Quản trị (SUPER_ADMIN hoặc MANAGER).', 'warning', 4000);
        window.location.hash = '#/login';
        return;
      }
    } else if (isStaffRoute) {
      if (!AuthService.isAuthenticated()) {
        Utils.showToast('Vui lòng đăng nhập để truy cập cổng Kỹ thuật viên.', 'warning', 4000);
        window.location.hash = '#/login';
        return;
      }
    }

    // Cập nhật Layout: Nếu là trang admin hoặc staff thì hiện Sidebar
    if (isAdminRoute) {
      appLayout.className = 'flex flex-col md:flex-row min-h-screen bg-slate-100';
      let sidebarContainer = document.getElementById('app-sidebar');
      if (!sidebarContainer) {
        sidebarContainer = document.createElement('div');
        sidebarContainer.id = 'app-sidebar';
        appLayout.insertBefore(sidebarContainer, appMain);
      }
      SidebarComponent.render('app-sidebar');
      appMain.className = 'flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full';
    } else {
      const sidebarContainer = document.getElementById('app-sidebar');
      if (sidebarContainer) sidebarContainer.remove();
      appLayout.className = 'min-h-screen flex flex-col bg-slate-50';
      appMain.className = 'flex-1';
    }

    // Điều hướng các trang
    if (path === '#/' || path === '') {
      this.currentPage = HomePage;
      appMain.innerHTML = HomePage.render();
    } else if (path === '#/report') {
      this.currentPage = ReportFormPage;
      appMain.innerHTML = ReportFormPage.render();
    } else if (path === '#/tracking') {
      this.currentPage = TrackingPage;
      appMain.innerHTML = TrackingPage.render();
    } else if (path === '#/login') {
      this.currentPage = LoginPage;
      appMain.innerHTML = LoginPage.render();
    } else if (path === '#/admin') {
      this.currentPage = DashboardPage;
      appMain.innerHTML = DashboardPage.render();
      DashboardPage.init();
    } else if (path === '#/admin/pending') {
      this.currentPage = PendingTasksPage;
      appMain.innerHTML = PendingTasksPage.render();
      PendingTasksPage.init();
    } else if (path === '#/admin/tasks') {
      this.currentPage = TasksPage;
      appMain.innerHTML = TasksPage.render();
      TasksPage.init();
    } else if (path === '#/admin/create-task') {
      this.currentPage = CreateTaskPage;
      appMain.innerHTML = CreateTaskPage.render();
    } else if (path === '#/admin/reports') {
      this.currentPage = ReportsExportPage;
      appMain.innerHTML = ReportsExportPage.render();
      ReportsExportPage.init();
    } else if (path === '#/admin/settings') {
      if (!AuthService.isSuperAdmin()) {
        Utils.showToast('Từ chối quyền: Chỉ Quản trị viên Super Admin mới có quyền truy cập Cài đặt hệ thống!', 'warning', 4000);
        window.location.hash = '#/admin';
        return;
      }
      this.currentPage = SettingsPage;
      appMain.innerHTML = SettingsPage.render();
      SettingsPage.init();
    } else if (path === '#/admin/departments') {
      this.currentPage = DepartmentsPage;
      appMain.innerHTML = DepartmentsPage.render();
      DepartmentsPage.init();
    } else if (path === '#/admin/locations') {
      if (!AuthService.isSuperAdmin()) {
        Utils.showToast('Từ chối quyền: Chỉ Super Admin mới có quyền quản lý địa điểm!', 'warning', 4000);
        window.location.hash = '#/admin';
        return;
      }
      this.currentPage = LocationsManagementPage;
      appMain.innerHTML = LocationsManagementPage.render();
      LocationsManagementPage.init();
    } else if (path === '#/admin/categories') {
      if (!AuthService.isSuperAdmin()) {
        Utils.showToast('Từ chối quyền: Chỉ Super Admin mới có quyền quản lý loại thiết bị!', 'warning', 4000);
        window.location.hash = '#/admin';
        return;
      }
      this.currentPage = CategoriesManagementPage;
      appMain.innerHTML = CategoriesManagementPage.render();
      CategoriesManagementPage.init();
    } else if (path === '#/admin/employees') {
      if (!AuthService.canViewEmployees()) {
        Utils.showToast('Từ chối quyền: Phải đăng nhập tài khoản Nội bộ để xem Danh bạ nhân sự!', 'warning', 4000);
        window.location.hash = '#/login';
        return;
      }
      this.currentPage = EmployeesManagementPage;
      appMain.innerHTML = EmployeesManagementPage.render();
      EmployeesManagementPage.init();
    } else if (path === '#/admin/leave-management') {
      if (!AuthService.canViewEmployees()) {
        Utils.showToast('Từ chối quyền: Phải đăng nhập tài khoản Nội bộ để xem Quản lý ngày phép!', 'warning', 4000);
        window.location.hash = '#/login';
        return;
      }
      this.currentPage = LeaveManagementPage;
      appMain.innerHTML = LeaveManagementPage.render();
      LeaveManagementPage.init();
    } else if (path === '#/admin/users') {
      this.currentPage = UserManagementPage;
      appMain.innerHTML = UserManagementPage.render();
      UserManagementPage.init();
    } else if (path === '#/staff') {
      this.currentPage = StaffDashboardPage;
      appMain.innerHTML = StaffDashboardPage.render();
      StaffDashboardPage.init();
    } else {
      // 404 Fallback
      appMain.innerHTML = `
        <div class="max-w-md mx-auto py-20 px-4 text-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-4">
            <i class="fa-solid fa-compass"></i>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">404 - Không tìm thấy trang</h2>
          <p class="text-lg font-bold text-slate-800 mb-4">Trang không tồn tại hoặc đã được di chuyển</p>
          <a href="#/" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700">
            Quay về trang chủ
          </a>
        </div>
      `;
    }
  },

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
          .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
      });
    }
  }
};

window.App = App;

// Khởi chạy an toàn bất kể DOM đã sẵn sàng hay chưa
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
