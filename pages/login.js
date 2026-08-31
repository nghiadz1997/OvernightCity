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
              <label for="login-email" class="block text-xs font-bold text-slate-700 mb-1.5">Email tài khoản <span class="text-red-500">*</span></label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <input type="email" id="login-email" name="username" class="w-full text-sm pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nhập email tài khoản..." required autocomplete="username">
              </div>
            </div>

            <div>
              <label for="login-password" class="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu <span class="text-red-500">*</span></label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <input type="password" id="login-password" name="password" class="w-full text-sm pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nhập mật khẩu..." required autocomplete="current-password">
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
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me-checkbox')?.checked;
    const btn = document.getElementById('btn-login-submit');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang xác thực...';

    try {
      const user = await AuthService.login(email, pass);
      
      // Lưu hoặc xóa ghi nhớ mật khẩu
      if (rememberMe) {
        localStorage.setItem('nsg_remember_login', JSON.stringify({ email, password: pass }));
      } else {
        localStorage.removeItem('nsg_remember_login');
      }

      Utils.showToast(`Đăng nhập thành công!`, 'success');

      if (user.role === 'STAFF' || user.role === 'STAFF_KTX' || user.role === 'STAFF_IT' || user.role === 'STAFF_MAINTENANCE' || user.role === 'STAFF_GREEN' || user.role === 'STAFF_CLEANING') {
        window.location.hash = '#/staff';
      } else if (user.role === 'MANAGER' || user.role === 'DEPUTY_MANAGER' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        window.location.hash = '#/admin';
      } else {
        window.location.hash = '#/';
      }
    } catch (err) {
      Utils.showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1"></i><span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>';
    }
  }
};

window.LoginPage = LoginPage;
