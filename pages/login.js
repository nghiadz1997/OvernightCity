/**
 * NSG SUPPORT - LOGIN PAGE (INTERNAL AUTHENTICATION)
 * Đăng nhập hệ thống nội bộ - Dành cho Quản trị viên, Trưởng bộ phận và Kỹ thuật viên
 */

const LoginPage = {
  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
        <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6 animate-fade-in">
          
          <!-- Header -->
          <div class="text-center">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">ĐĂNG NHẬP HỆ THỐNG</h2>
            <p class="text-xs text-slate-500 mt-1">Cổng Quản trị, Điều phối và Xử lý công việc kỹ thuật nội bộ NSG</p>
          </div>

          <!-- Form Đăng nhập -->
          <form class="space-y-4" onsubmit="LoginPage.handleLoginSubmit(event)">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Email tài khoản <span class="text-red-500">*</span></label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <input type="email" id="login-email" class="w-full text-sm pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="admin@nsg.edu.vn" required autocomplete="email">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu <span class="text-red-500">*</span></label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <input type="password" id="login-password" class="w-full text-sm pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="••••••••" required autocomplete="current-password">
              </div>
            </div>

            <button type="submit" id="btn-login-submit" class="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg">
              <i class="fa-solid fa-right-to-bracket"></i>
              <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
            </button>
          </form>

          <div class="text-center pt-2 border-t border-slate-100">
            <p class="text-[11px] text-slate-400 leading-relaxed">
              <i class="fa-solid fa-circle-info mr-1 text-blue-500"></i>
              Tài khoản hệ thống do <b>Super Admin</b> quản lý và phân quyền nội bộ.
            </p>
          </div>

        </div>
      </div>
    `;
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang xác thực với Firebase...';

    try {
      const user = await AuthService.login(email, pass);
      Utils.showToast(`Đăng nhập thành công! Vai trò: ${user.role}`, 'success');

      if (user.role === 'STAFF') {
        window.location.hash = '#/staff';
      } else if (user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
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
