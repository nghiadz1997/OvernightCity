/**
 * NSG SUPPORT - LOGIN PAGE (INTERNAL AUTHENTICATION)
 * Đăng nhập hệ thống nội bộ - Dành cho Quản trị viên, Trưởng bộ phận và Kỹ thuật viên
 */

const LoginPage = {
  render() {
    let savedEmail = '';
    let savedPassword = '';
    let isRemembered = false;

    try {
      const saved = localStorage.getItem('nsg_remember_login');
      if (saved) {
        const parsed = JSON.parse(saved);
        savedEmail = parsed.email || '';
        savedPassword = parsed.password || '';
        isRemembered = true;
      }
    } catch (e) {}

    // Tự động điền sau khi render
    setTimeout(() => {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const remCheckbox = document.getElementById('remember-me-checkbox');
      if (emailInput && savedEmail) emailInput.value = savedEmail;
      if (passInput && savedPassword) passInput.value = savedPassword;
      if (remCheckbox) remCheckbox.checked = isRemembered;
    }, 50);

    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      const isMgr = AuthService.isManager();
      const isStf = AuthService.isStaff();

      return `
        <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/80 animate-fade-in">
          <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-6">
            <div class="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto text-3xl shadow-sm">
              <i class="fa-solid fa-user-check"></i>
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-900 tracking-tight">BẠN ĐANG ĐĂNG NHẬP</h2>
              <p class="text-base font-bold text-blue-700 mt-1">${currentUser.displayName}</p>
              <span class="inline-block mt-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-lg">${AuthService.getRoleLabel(currentUser.role)} - ${currentUser.departmentName || 'Hệ thống'}</span>
            </div>
            <div class="pt-2 flex flex-col gap-3">
              ${isMgr ? `
                <a href="#/admin" class="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-chart-pie"></i>
                  <span>VÀO TRANG QUẢN TRỊ</span>
                </a>
              ` : ''}
              ${isStf ? `
                <a href="#/staff" class="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-toolbox"></i>
                  <span>VÀO CỔNG KỸ THUẬT VIÊN</span>
                </a>
              ` : ''}
              <a href="#/report" class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-paper-plane"></i>
                <span>GỬI PHẢN ÁNH SỰ CỐ</span>
              </a>
              <a href="#/tracking" class="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-magnifying-glass"></i>
                <span>TRA CỨU TIẾN ĐỘ PHẢN ÁNH</span>
              </a>
              <button type="button" class="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer" onclick="NavbarComponent.handleLogout()">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>ĐĂNG XUẤT KHỎI TÀI KHOẢN NÀY</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/80">
        <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 space-y-6 animate-fade-in">
          
          <!-- Header -->
          <div class="text-center">
            <div class="h-20 w-20 mx-auto mb-3 flex items-center justify-center">
              ${(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.logoUrl) ? `
                <img src="${APP_CONFIG.logoUrl}" alt="Logo" class="max-h-20 max-w-20 w-auto h-auto object-contain" onerror="this.style.display='none'; this.nextElementSibling ? this.nextElementSibling.style.display='flex' : null;">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white items-center justify-center text-3xl shadow-lg hidden">
                  <i class="fa-solid fa-shield-halved"></i>
                </div>
              ` : `
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg">
                  <i class="fa-solid fa-shield-halved"></i>
                </div>
              `}
            </div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">ĐĂNG NHẬP HỆ THỐNG</h2>
            <p class="text-xs text-slate-500 mt-1">Cổng Quản trị, Điều phối và Xử lý công việc kỹ thuật NSG</p>
          </div>

          <!-- Form Đăng nhập -->
          <form id="system-login-form" name="loginForm" method="POST" action="javascript:void(0);" class="space-y-4" onsubmit="LoginPage.handleLoginSubmit(event)">
            <div>
              <label for="login-email" class="block text-xs font-bold text-slate-700 mb-1.5">Email hoặc Tên tài khoản <span class="text-red-500">*</span></label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-user"></i>
                </div>
                <input type="text" id="login-email" name="username" class="w-full text-sm pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nhập email hoặc tên tài khoản (ví dụ: admin, trongnghia...)" required autocomplete="username" autocapitalize="none" spellcheck="false">
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="login-password" class="block text-xs font-bold text-slate-700">Mật khẩu <span class="text-red-500">*</span></label>
                <button type="button" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" onclick="LoginPage.openForgotPasswordModal()">
                  Quên mật khẩu?
                </button>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <input type="password" id="login-password" name="password" class="w-full text-sm pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nhập mật khẩu của bạn..." required autocomplete="current-password">
                <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" onclick="LoginPage.togglePasswordVisibility()">
                  <i id="toggle-password-icon" class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>

            <!-- Ghi nhớ mật khẩu -->
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                <input type="checkbox" id="remember-me-checkbox" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer">
                <span>Ghi nhớ mật khẩu trên thiết bị này</span>
              </label>
            </div>

            <div class="pt-2">
              <button type="submit" id="btn-login-submit" class="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg">
                <i class="fa-solid fa-right-to-bracket"></i>
                <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
              </button>
            </div>
          </form>

        </div>
      </div>

      <!-- Modal Quên Mật Khẩu -->
      <div id="forgot-password-modal-container"></div>
    `;
  },

  togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('toggle-password-icon');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash text-blue-600';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye text-slate-400';
    }
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const rawInput = document.getElementById('login-email')?.value?.trim() || '';
    const pass = document.getElementById('login-password')?.value || '';
    const rememberMe = document.getElementById('remember-me-checkbox')?.checked;
    const btn = document.getElementById('btn-login-submit');

    if (!rawInput || !pass) {
      Utils.showToast('Vui lòng nhập đầy đủ tài khoản và mật khẩu.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang xác thực...';

    try {
      const user = await AuthService.login(rawInput, pass);
      
      // Lưu hoặc xóa ghi nhớ mật khẩu
      if (rememberMe) {
        localStorage.setItem('nsg_remember_login', JSON.stringify({ email: rawInput, password: pass }));
      } else {
        localStorage.removeItem('nsg_remember_login');
      }

      Utils.showToast(`Đăng nhập thành công! Chào mừng ${user.displayName}`, 'success');

      if (AuthService.isManager()) {
        window.location.hash = '#/admin';
      } else if (AuthService.isStaff()) {
        window.location.hash = '#/staff';
      } else {
        window.location.hash = '#/report';
      }
    } catch (err) {
      Utils.showToast(err.message, 'error', 6000);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1"></i><span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>';
    }
  },

  openForgotPasswordModal() {
    const currentInput = document.getElementById('login-email')?.value.trim() || '';
    const container = document.getElementById('forgot-password-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="forgot-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative space-y-4">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer text-xl" onclick="document.getElementById('forgot-modal-backdrop').remove()">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-key"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">ĐẶT LẠI MẬT KHẨU</h3>
              <p class="text-xs text-slate-500">Khôi phục mật khẩu qua email</p>
            </div>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            Nhập email tài khoản của bạn để nhận liên kết đặt lại mật khẩu mới an toàn qua thư điện tử.
          </p>

          <form onsubmit="LoginPage.handleForgotPasswordSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Email hoặc Tên tài khoản <span class="text-red-500">*</span></label>
              <input type="text" id="forgot-email-input" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nhập email hoặc tên tài khoản..." value="${currentInput}" required autocapitalize="none">
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button type="button" class="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer" onclick="document.getElementById('forgot-modal-backdrop').remove()">
                Hủy bỏ
              </button>
              <button type="submit" id="btn-forgot-submit" class="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                <i class="fa-solid fa-paper-plane"></i>
                <span>Gửi liên kết</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const rawInput = document.getElementById('forgot-email-input')?.value?.trim() || '';
    if (!rawInput) return;

    const email = rawInput.includes('@') ? rawInput.toLowerCase() : `${rawInput.toLowerCase()}@nsg.edu.vn`;
    const btn = document.getElementById('btn-forgot-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang gửi...';

    try {
      await AuthService.sendPasswordReset(email);
      Utils.showToast(`Đã gửi email khôi phục mật khẩu tới ${email}! Vui lòng kiểm tra hộp thư đến (hoặc thư rác/Spam).`, 'success', 8000);
      const modal = document.getElementById('forgot-modal-backdrop');
      if (modal) modal.remove();
    } catch (err) {
      Utils.showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Gửi lại</span>';
    }
  }
};

window.LoginPage = LoginPage;

