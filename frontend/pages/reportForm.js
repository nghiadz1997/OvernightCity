/**
 * NSG SUPPORT - REPORT SUBMISSION FORM PAGE
 * Form gửi phản ánh đầy đủ trường theo yêu cầu mục 6 & 45 chống spam
 * Hỗ trợ bộ chọn phân cấp 3 tầng: Cơ sở -> Khu vực -> Phòng
 */

const ReportFormPage = {
  selectedFiles: [],
  isSubmitting: false,
  COOLDOWN_MS: 5 * 60 * 1000, // 5 phút (300 giây)
  spamInterval: null,

  getRemainingCooldown() {
    const user = AuthService.getCurrentUser();
    // Tài khoản nội bộ (KTV, Trưởng phòng, Admin) được miễn giới hạn chống spam
    if (user && (AuthService.isStaff() || AuthService.isManager() || AuthService.isAdmin())) {
      return 0;
    }

    try {
      const lastSubmit = localStorage.getItem('nsg_last_report_submit_time');
      if (!lastSubmit) return 0;
      const elapsed = Date.now() - parseInt(lastSubmit, 10);
      if (elapsed < this.COOLDOWN_MS) {
        return Math.ceil((this.COOLDOWN_MS - elapsed) / 1000);
      }
    } catch (e) {}
    return 0;
  },

  checkAndStartSpamTimer() {
    const remaining = this.getRemainingCooldown();
    const btn = document.getElementById('btn-submit-report');
    const warningBox = document.getElementById('rep-spam-warning');

    if (remaining > 0) {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-60', 'cursor-not-allowed');
      }
      if (warningBox) {
        warningBox.classList.remove('hidden');
      }

      this.updateCountdownUI(remaining);

      if (this.spamInterval) clearInterval(this.spamInterval);
      this.spamInterval = setInterval(() => {
        const rem = this.getRemainingCooldown();
        if (rem <= 0) {
          clearInterval(this.spamInterval);
          this.spamInterval = null;
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-60', 'cursor-not-allowed');
            btn.innerHTML = '<i class="fa-solid fa-paper-plane text-lg"></i><span>GỬI PHẢN ÁNH NGAY</span>';
          }
          if (warningBox) warningBox.classList.add('hidden');
        } else {
          this.updateCountdownUI(rem);
        }
      }, 1000);
    } else {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-60', 'cursor-not-allowed');
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-lg"></i><span>GỬI PHẢN ÁNH NGAY</span>';
      }
      if (warningBox) warningBox.classList.add('hidden');
    }
  },

  updateCountdownUI(remSec) {
    const mins = Math.floor(remSec / 60);
    const secs = remSec % 60;
    const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const timerSpan = document.getElementById('rep-spam-countdown');
    if (timerSpan) timerSpan.innerText = timeStr;

    const btn = document.getElementById('btn-submit-report');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-hourglass-half text-lg animate-pulse text-amber-300"></i><span>VUI LÒNG ĐỢI ${timeStr} ĐỂ GỬI TIẾP</span>`;
    }
  },

  async init() {
    // Kiểm tra giới hạn 5 phút chống spam
    this.checkAndStartSpamTimer();

    // 1. Tải danh mục thiết bị động
    try {
      const categories = await ApiService.loadCategories();
      const catSelect = document.getElementById('rep-category-id');
      if (catSelect && categories && categories.length > 0) {
        catSelect.innerHTML = `
          <option value="">-- Chọn danh mục phản ánh --</option>
          ${categories.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
        `;
      }
    } catch (e) {
      console.warn('Lỗi nạp categories:', e);
    }

    // 3. Tải địa điểm động & Khởi tạo bộ chọn Cơ sở -> Khu vực -> Phòng
    try {
      await ApiService.loadCampuses();
    } catch (e) {}
    this.initLocationSelectors();
  },

  initLocationSelectors() {
    const campusSelect = document.getElementById('rep-campus');
    const zoneSelect = document.getElementById('rep-zone');
    const roomSelect = document.getElementById('rep-room-select');
    const customRoomContainer = document.getElementById('rep-room-custom-container');

    if (!campusSelect || !zoneSelect || !roomSelect) return;

    // Nạp danh sách Cơ sở
    const campuses = window.APP_CONFIG.CAMPUSES || [];
    campusSelect.innerHTML = `
      <option value="">-- Chọn Cơ sở --</option>
      ${campuses.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
    `;

    // Reset cấp dưới
    zoneSelect.innerHTML = `<option value="">-- Vui lòng chọn Cơ sở trước --</option>`;
    zoneSelect.disabled = true;
    roomSelect.innerHTML = `<option value="">-- Vui lòng chọn Khu vực trước --</option>`;
    roomSelect.disabled = true;
    if (customRoomContainer) customRoomContainer.classList.add('hidden');

    // Sự kiện khi đổi Cơ sở
    campusSelect.onchange = () => {
      const selectedCampusId = campusSelect.value;
      const campus = campuses.find(c => c.id === selectedCampusId);

      if (campus && campus.zones && campus.zones.length > 0) {
        zoneSelect.disabled = false;
        zoneSelect.innerHTML = `
          <option value="">-- Chọn Khu vực / Tòa nhà --</option>
          ${campus.zones.map(z => `<option value="${z.id}" data-name="${z.name}">${z.name}</option>`).join('')}
        `;
      } else {
        zoneSelect.innerHTML = `<option value="">-- Vui lòng chọn Cơ sở trước --</option>`;
        zoneSelect.disabled = true;
      }

      roomSelect.innerHTML = `<option value="">-- Vui lòng chọn Khu vực trước --</option>`;
      roomSelect.disabled = true;
      if (customRoomContainer) customRoomContainer.classList.add('hidden');
    };

    // Sự kiện khi đổi Khu vực
    zoneSelect.onchange = () => {
      const selectedCampusId = campusSelect.value;
      const selectedZoneId = zoneSelect.value;
      const campus = campuses.find(c => c.id === selectedCampusId);
      const zone = campus?.zones?.find(z => z.id === selectedZoneId);

      if (zone && zone.rooms && zone.rooms.length > 0) {
        roomSelect.disabled = false;
        roomSelect.innerHTML = `
          <option value="">-- Chọn Phòng / Vị trí cụ thể --</option>
          ${zone.rooms.map(r => `<option value="${r}">${r}</option>`).join('')}
          <option value="CUSTOM">➕ Phòng / Vị trí khác (Nhập tay)...</option>
        `;
      } else {
        roomSelect.innerHTML = `<option value="">-- Vui lòng chọn Khu vực trước --</option>`;
        roomSelect.disabled = true;
      }

      if (customRoomContainer) customRoomContainer.classList.add('hidden');
    };

    // Sự kiện khi đổi Phòng
    roomSelect.onchange = () => {
      if (roomSelect.value === 'CUSTOM') {
        if (customRoomContainer) {
          customRoomContainer.classList.remove('hidden');
          const customInput = document.getElementById('rep-room-custom');
          if (customInput) customInput.focus();
        }
      } else {
        if (customRoomContainer) customRoomContainer.classList.add('hidden');
      }
    };
  },

  render() {
    const user = AuthService.getCurrentUser();
    const categories = window.APP_CONFIG.CATEGORIES;
    const departments = window.APP_CONFIG.DEPARTMENTS;

    // Lấy query param priority nếu có (ví dụ: ?priority=KHẨN+CẤP)
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const defaultPriority = urlParams.get('priority') || 'BÌNH THƯỜNG';

    this.isSubmitting = false;

    // 1. NẾU CHƯA ĐĂNG NHẬP GOOGLE: BẮT BUỘC ĐĂNG NHẬP MỚI MỞ FORM PHẢN ÁNH
    if (!user) {
      return `
        <div class="max-w-lg mx-auto px-4 py-12 sm:py-16 animate-fade-in">
          <!-- Breadcrumb -->
          <div class="flex items-center justify-between mb-6">
            <nav class="flex items-center gap-2 text-xs text-slate-500">
              <a href="#/" class="hover:text-blue-600">Trang chủ</a>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
              <span class="text-slate-900 font-semibold">Gửi phản ánh sự cố</span>
            </nav>
          </div>

          <!-- Auth Gate Card -->
          <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-center p-8 sm:p-10 relative">
            <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-blue-500/25">
              <i class="fa-solid fa-shield-halved"></i>
            </div>

            <span class="inline-block text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 mb-3">
              Xác thực danh tính trước khi gửi
            </span>

            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">
              Đăng nhập để gửi phản ánh
            </h1>

            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed mb-8">
              Để đảm bảo phản ánh được chuyển đúng bộ phận kỹ thuật, ngăn chặn spam và <strong>tự động nhận email cập nhật tiến độ xử lý</strong>, vui lòng đăng nhập tài khoản Google để tiếp tục.
            </p>

            <!-- Google Login Button -->
            <button type="button" id="btn-google-login-gate" onclick="ReportFormPage.handleGoogleLogin()" class="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border-2 border-slate-200 hover:border-blue-500 shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-3 transform active:scale-98 cursor-pointer group">
              <svg class="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <span>ĐĂNG NHẬP BẰNG GOOGLE</span>
            </button>

            <div class="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <i class="fa-solid fa-lock text-emerald-500"></i>
              <span>Họ tên & Email của bạn sẽ tự động điền và bảo mật</span>
            </div>
          </div>
        </div>
      `;
    }

    setTimeout(() => this.init(), 50);

    // 2. ĐÃ ĐĂNG NHẬP: HIỂN THỊ TOÀN BỘ FORM PHẢN ÁNH
    return `
      <div class="max-w-3xl mx-auto px-4 py-8 sm:px-6 animate-fade-in">
        <!-- Breadcrumb -->
        <div class="flex items-center justify-between mb-6">
          <nav class="flex items-center gap-2 text-xs text-slate-500">
            <a href="#/" class="hover:text-blue-600">Trang chủ</a>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <span class="text-slate-900 font-semibold">Gửi phản ánh sự cố</span>
          </nav>
        </div>

        <!-- Form Card -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 sm:px-8 py-6 text-white">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0">
                <i class="fa-solid fa-paper-plane"></i>
              </div>
              <div>
                <h1 class="text-xl sm:text-2xl font-black">PHIẾU PHẢN ÁNH & HỖ TRỢ KỸ THUẬT</h1>
                <p class="text-xs sm:text-sm text-blue-100 mt-0.5 font-light">
                  Vui lòng chọn chính xác địa điểm theo Cơ sở / Khu vực và mô tả sự cố để xử lý nhanh nhất.
                </p>
              </div>
            </div>
          </div>

          <!-- Main Form -->
          <form id="report-submission-form" class="p-6 sm:p-8 space-y-6" onsubmit="ReportFormPage.handleSubmit(event)">
            <!-- Honeypot Field chống spam (mục 45) -->
            <input type="text" name="_hp_website" id="_hp_website" style="display:none !important;" tabindex="-1" autocomplete="off">

            <!-- Thẻ định danh người dùng đã xác thực Google -->
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden ring-2 ring-emerald-300">
                  ${user.photoURL ? `<img src="${user.photoURL}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user-check"></i>`}
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-slate-900">${user.displayName || 'Người dùng'}</span>
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <i class="fa-solid fa-circle-check text-emerald-600"></i> Đã xác thực Google
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 font-medium">${user.email}</div>
                </div>
              </div>
              <button type="button" onclick="ReportFormPage.handleSwitchAccount()" class="text-xs text-slate-600 hover:text-red-600 font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 transition shrink-0">
                <i class="fa-solid fa-arrow-right-from-bracket mr-1"></i> Đổi tài khoản
              </button>
            </div>

            <!-- Phần 1: Địa điểm xảy ra sự cố & Loại thiết bị (ĐẨY LÊN ĐẦU TIÊN) -->
            <div class="space-y-4">
              <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-map-location-dot text-blue-600"></i> 1. Địa điểm xảy ra sự cố & Loại thiết bị
              </h3>

              <!-- Cụm chọn Địa điểm 3 tầng (Cơ sở -> Khu vực -> Phòng) -->
              <div class="p-5 bg-blue-50/50 rounded-3xl border border-blue-200 shadow-xs space-y-3.5">
                <span class="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <i class="fa-solid fa-building text-blue-600"></i> Chọn vị trí chính xác (3 Tầng):
                </span>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- Tầng 1: Cơ sở -->
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">1. Cơ sở <span class="text-red-500">*</span></label>
                    <select id="rep-campus" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required>
                      <option value="">-- Chọn Cơ sở --</option>
                    </select>
                  </div>

                  <!-- Tầng 2: Khu vực / Tòa nhà -->
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">2. Khu vực / Tòa nhà <span class="text-red-500">*</span></label>
                    <select id="rep-zone" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required disabled>
                      <option value="">-- Vui lòng chọn Cơ sở --</option>
                    </select>
                  </div>

                  <!-- Tầng 3: Phòng / Vị trí -->
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">3. Phòng cụ thể <span class="text-red-500">*</span></label>
                    <select id="rep-room-select" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required disabled>
                      <option value="">-- Vui lòng chọn Khu vực --</option>
                    </select>
                  </div>
                </div>

                <!-- Ô nhập phòng khác nếu chọn CUSTOM -->
                <div id="rep-room-custom-container" class="hidden pt-1">
                  <label class="block text-xs font-bold text-blue-700 mb-1">Nhập tên phòng / vị trí cụ thể khác <span class="text-red-500">*</span></label>
                  <input type="text" id="rep-room-custom" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white font-medium" placeholder="Ví dụ: Phòng họp giao ban, Góc hành lang lầu 2...">
                </div>
              </div>

              <!-- Danh mục & Mức độ khẩn cấp -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Loại phản ánh / Thiết bị <span class="text-red-500">*</span></label>
                  <select id="rep-category-id" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" required>
                    <option value="">-- Chọn danh mục phản ánh --</option>
                    ${categories.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Mức độ khẩn cấp <span class="text-red-500">*</span></label>
                  <select id="rep-priority" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold" required>
                    <option value="BÌNH THƯỜNG" class="text-blue-700" ${defaultPriority === 'BÌNH THƯỜNG' ? 'selected' : ''}>🟢 Bình thường (Xử lý trong 48h)</option>
                    <option value="TRUNG BÌNH" class="text-yellow-700" ${defaultPriority === 'TRUNG BÌNH' ? 'selected' : ''}>🟡 Trung bình (Xử lý trong 24h)</option>
                    <option value="CAO" class="text-orange-700" ${defaultPriority === 'CAO' ? 'selected' : ''}>🟠 Cao (Xử lý trong 8h)</option>
                    <option value="KHẨN CẤP" class="text-red-700 font-black" ${defaultPriority === 'KHẨN CẤP' ? 'selected' : ''}>🔴 Khẩn cấp (Xử lý ngay trong 2h)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Phần 2: Nội dung sự cố chi tiết -->
            <div class="border-t border-slate-200 pt-6">
              <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-blue-600"></i> 2. Mô tả chi tiết sự cố
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Tiêu đề phản ánh <span class="text-red-500">*</span></label>
                  <input type="text" id="rep-title" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Tóm tắt ngắn gọn: Máy chiếu không lên nguồn, mất mạng wifi, hỏng bóng đèn..." required>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết <span class="text-red-500">*</span></label>
                  <textarea id="rep-description" rows="4" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 leading-relaxed font-normal" placeholder="Mô tả hiện tượng sự cố, thời điểm bắt đầu xảy ra, các dấu hiệu (chớp đèn đỏ, có mùi khét, không nhận dây HDMI...)..." required></textarea>
                </div>

                <!-- Chụp ảnh / Tải tệp đính kèm -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Hình ảnh / Video / Tệp đính kèm (Tối đa 5 tệp)</span>
                    <span class="text-[11px] text-slate-400 font-normal">Hỗ trợ JPG, PNG, MP4, PDF, DOCX (&lt;10MB)</span>
                  </label>
                  <div class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/60 cursor-pointer" onclick="document.getElementById('rep-file-input').click()">
                    <i class="fa-solid fa-cloud-arrow-up text-3xl text-blue-600 mb-2"></i>
                    <p class="text-xs font-bold text-slate-700">Nhấn để chụp ảnh hoặc chọn tệp từ máy tính / điện thoại</p>
                    <p class="text-[11px] text-slate-500 mt-1">Ảnh sẽ được tự động nén tối ưu trước khi gửi để đảm bảo tốc độ</p>
                  </div>
                  <input type="file" id="rep-file-input" multiple accept="image/*,video/*,application/pdf,.doc,.docx" class="hidden" onchange="ReportFormPage.handleFileSelect(event)">

                  <!-- Previews -->
                  <div id="file-previews-container" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2"></div>
                </div>
              </div>
            </div>

            <!-- Phần 3: Thông tin người gửi phản ánh -->
            <div class="border-t border-slate-200 pt-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-address-card text-blue-600"></i> 3. Thông tin người gửi phản ánh
                </h3>
                ${user ? `
                  <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <i class="fa-solid fa-lock text-[10px]"></i> Đã định danh Google
                  </span>
                ` : ''}
              </div>
              <p class="text-xs text-slate-500 mb-4 font-normal">
                ${user 
                  ? 'Họ tên và Email được trích xuất tự động từ tài khoản Google đã xác thực. Bạn chỉ cần nhập thêm Số điện thoại liên hệ.' 
                  : 'Vui lòng cung cấp chính xác Họ tên, Email và Số điện thoại để nhận email xác nhận & thông báo kết quả xử lý sự cố.'}
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Họ và tên -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên người gửi <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <i class="fa-solid fa-user"></i>
                    </div>
                    <input type="text" id="rep-sender-name" class="w-full pl-10 pr-3 text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium ${user ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : ''}" placeholder="Ví dụ: Nguyễn Văn An" value="${user?.displayName || ''}" ${user ? 'readonly' : ''} required>
                  </div>
                </div>

                <!-- Email nhận phản hồi -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    Email nhận thông báo kết quả <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <i class="fa-solid fa-envelope"></i>
                    </div>
                    <input type="email" id="rep-sender-email" class="w-full pl-10 pr-3 text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium ${user ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : ''}" placeholder="example@gmail.com" value="${user?.email || ''}" ${user ? 'readonly' : ''} required>
                  </div>
                </div>

                <!-- Số điện thoại -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại liên hệ <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500">
                      <i class="fa-solid fa-phone"></i>
                    </div>
                    <input type="tel" id="rep-sender-phone" class="w-full pl-10 pr-3 text-sm p-3 rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 font-bold bg-blue-50/30" placeholder="Ví dụ: 0912345678" value="${user?.phone || ''}" required>
                  </div>
                </div>
              </div>
            </div>

            <!-- Spam Cooldown Warning -->
            <div id="rep-spam-warning" class="hidden mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 flex items-center gap-3 text-xs text-amber-950 shadow-2xs animate-fade-in">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-extrabold text-amber-950 uppercase tracking-wide">Giới hạn chống gửi trùng lặp / Spam</h4>
                <p class="text-amber-800 mt-0.5">Mỗi thiết bị gửi phản ánh cách nhau <strong>5 phút</strong>. Vui lòng đợi <strong id="rep-spam-countdown" class="font-mono font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">05:00</strong> để gửi tiếp phiếu mới.</p>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="border-t border-slate-200 pt-6">
              <button type="submit" id="btn-submit-report" class="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 cursor-pointer">
                <i class="fa-solid fa-paper-plane text-lg"></i>
                <span>GỬI PHẢN ÁNH NGAY</span>
              </button>
              <p class="text-[11px] text-slate-400 text-center mt-3">
                Sau khi gửi thành công, bạn sẽ nhận được Mã yêu cầu để theo dõi tiến độ xử lý và đánh giá chất lượng.
              </p>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const container = document.getElementById('file-previews-container');
    container.innerHTML = '<div class="col-span-full text-xs text-blue-600 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tối ưu hóa tệp ảnh...</div>';

    this.selectedFiles = [];
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        // Tự động nén ảnh qua canvas
        const compressed = await Utils.compressImage(f);
        this.selectedFiles.push(compressed);
      } else {
        this.selectedFiles.push(f);
      }
    }

    container.innerHTML = '';
    this.selectedFiles.forEach((file, index) => {
      const isImg = file.type.startsWith('image/');
      const card = document.createElement('div');
      card.className = 'relative border border-slate-200 rounded-xl p-2 bg-white flex items-center gap-2 text-xs overflow-hidden shadow-xs';
      card.innerHTML = `
        <i class="fa-solid ${isImg ? 'fa-image text-emerald-500' : 'fa-file-lines text-blue-500'} text-lg"></i>
        <div class="truncate flex-1">
          <p class="font-bold text-slate-800 truncate">${file.name}</p>
          <p class="text-[10px] text-slate-400">${(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button type="button" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer" onclick="ReportFormPage.removeFile(${index})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      container.appendChild(card);
    });
  },

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    const event = { target: { files: this.selectedFiles } };
    this.handleFileSelect(event);
  },

  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    // Kiểm tra giới hạn 5 phút chống spam
    const remaining = this.getRemainingCooldown();
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      Utils.showToast(`Để chống spam, vui lòng đợi ${timeStr} nữa để gửi tiếp phản ánh!`, 'warning');
      return;
    }

    // Chống honeypot bot trap
    const hp = document.getElementById('_hp_website')?.value;
    if (hp) {
      console.warn('Bot detected via honeypot');
      return;
    }

    // Lấy thông tin địa điểm 3 tầng
    const campusSelect = document.getElementById('rep-campus');
    const zoneSelect = document.getElementById('rep-zone');
    const roomSelect = document.getElementById('rep-room-select');
    const customRoomInput = document.getElementById('rep-room-custom');

    const campusName = campusSelect.options[campusSelect.selectedIndex]?.getAttribute('data-name') || campusSelect.value;
    const zoneName = zoneSelect.options[zoneSelect.selectedIndex]?.getAttribute('data-name') || zoneSelect.value;
    
    let roomName = roomSelect.value;
    if (roomName === 'CUSTOM') {
      roomName = customRoomInput ? customRoomInput.value.trim() : '';
      if (!roomName) {
        Utils.showToast('Vui lòng nhập tên phòng / vị trí cụ thể!', 'warning');
        if (customRoomInput) customRoomInput.focus();
        return;
      }
    }

    if (!campusName || !zoneName || !roomName) {
      Utils.showToast('Vui lòng chọn đầy đủ Cơ sở, Khu vực và Phòng xảy ra sự cố!', 'warning');
      return;
    }

    const fullLocation = `${campusName} - ${zoneName}`;

    // Lấy thông tin tiêu đề và mô tả
    const title = document.getElementById('rep-title')?.value?.trim();
    const description = document.getElementById('rep-description')?.value?.trim();
    if (!title) {
      Utils.showToast('Vui lòng nhập Tiêu đề phản ánh sự cố!', 'warning');
      document.getElementById('rep-title')?.focus();
      return;
    }
    if (!description) {
      Utils.showToast('Vui lòng nhập Mô tả chi tiết sự cố!', 'warning');
      document.getElementById('rep-description')?.focus();
      return;
    }

    // Lấy và kiểm tra thông tin người gửi
    const senderName = document.getElementById('rep-sender-name')?.value?.trim();
    const senderEmail = document.getElementById('rep-sender-email')?.value?.trim();
    const senderPhone = document.getElementById('rep-sender-phone')?.value?.trim();

    if (!senderName) {
      Utils.showToast('Vui lòng nhập Họ và tên người gửi phản ánh!', 'warning');
      document.getElementById('rep-sender-name')?.focus();
      return;
    }

    if (!senderEmail || !senderEmail.includes('@')) {
      Utils.showToast('Vui lòng nhập địa chỉ Email hợp lệ để nhận thông báo tiến độ!', 'warning');
      document.getElementById('rep-sender-email')?.focus();
      return;
    }

    if (!senderPhone) {
      Utils.showToast('Vui lòng nhập Số điện thoại liên hệ để Kỹ thuật viên liên lạc!', 'warning');
      document.getElementById('rep-sender-phone')?.focus();
      return;
    }

    const cleanPhone = senderPhone.replace(/[\s\.\-]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      Utils.showToast('Số điện thoại liên hệ không hợp lệ (Vui lòng nhập từ 9-11 chữ số)!', 'warning');
      document.getElementById('rep-sender-phone')?.focus();
      return;
    }

    const submitBtn = document.getElementById('btn-submit-report');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-lg"></i><span>Đang xử lý & tạo mã yêu cầu...</span>';
    this.isSubmitting = true;

    try {
      // 1. Upload files nếu có
      let uploadedAttachments = [];
      if (this.selectedFiles.length > 0) {
        try {
          const uploadRes = await ApiService.uploadFiles(this.selectedFiles);
          if (uploadRes.success && uploadRes.files) {
            uploadedAttachments = uploadRes.files;
          }
        } catch (uploadErr) {
          console.warn('[ReportFormPage] Upload error fallback:', uploadErr);
        }
      }

      // 2. Lấy dữ liệu form & Device ID định danh thiết bị
      const catSelect = document.getElementById('rep-category-id');
      const catName = catSelect.options[catSelect.selectedIndex]?.getAttribute('data-name') || 'Khác';
      const deviceId = Utils.getOrCreateDeviceId();

      const currentUser = AuthService.getCurrentUser();
      const payload = {
        senderName: senderName,
        senderCode: currentUser?.uid || '',
        senderDept: currentUser?.departmentName || '',
        senderPhone: senderPhone,
        senderEmail: senderEmail || currentUser?.email || '',
        deviceId: deviceId,
        categoryId: catSelect.value,
        categoryName: catName,
        priority: document.getElementById('rep-priority').value,
        location: fullLocation,
        room: roomName,
        title: title,
        description: description,
        attachments: uploadedAttachments
      };

      const result = await ApiService.submitReport(payload);

      if (result.success) {
        // Ghi nhận thời gian gửi để kích hoạt giới hạn 5 phút chống spam cho thiết bị này
        const user = AuthService.getCurrentUser();
        if (!user || (!AuthService.isStaff() && !AuthService.isManager() && !AuthService.isAdmin())) {
          localStorage.setItem('nsg_last_report_submit_time', Date.now().toString());
        }

        // Cập nhật realtime engine cho client an toàn
        if (result.data) {
          try {
            RealtimeService.handleIncomingReport(result.data);
          } catch (rtErr) {
            console.warn('[ReportFormPage] Realtime sync error:', rtErr);
          }
        }

        try {
          SoundService.playSuccess();
        } catch (sErr) {}

        this.renderSuccessModal(result.code, senderEmail);
      } else {
        throw new Error(result.message || 'Lỗi gửi phản ánh.');
      }
    } catch (err) {
      Utils.showToast(err.message || 'Không thể gửi phản ánh. Vui lòng kiểm tra lại kết nối.', 'error');
    } finally {
      if (submitBtn) {
        this.checkAndStartSpamTimer();
      }
      this.isSubmitting = false;
    }
  },

  /**
   * Đăng nhập nhanh bằng Google ngay tại Form
   */
  async handleGoogleLogin() {
    try {
      const btn = document.getElementById('btn-google-login-gate') || document.getElementById('btn-google-login');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-sm mr-2"></i><span>Đang kết nối Google...</span>';
      }
      const user = await AuthService.loginWithGoogle();
      Utils.showToast(`✅ Đã xác thực: ${user.displayName} (${user.email})`, 'success');

      // Re-render lại trang để hiển thị form phản ánh đầy đủ
      const appMain = document.getElementById('app-main');
      if (appMain) {
        appMain.innerHTML = this.render();
      }
    } catch (err) {
      Utils.showToast(err.message || 'Đăng nhập Google thất bại.', 'error');
      const btn = document.getElementById('btn-google-login-gate') || document.getElementById('btn-google-login');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>ĐĂNG NHẬP BẰNG GOOGLE</span>';
      }
    }
  },

  /**
   * Đổi tài khoản hoặc Đăng xuất tại Form
   */
  async handleSwitchAccount() {
    try {
      await AuthService.logout();
      Utils.showToast('Đã đăng xuất. Bạn có thể đăng nhập tài khoản khác.', 'info');
      const appMain = document.getElementById('app-main');
      if (appMain) {
        appMain.innerHTML = this.render();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  /**
   * Hiển thị thông báo thành công theo đúng yêu cầu mục 6
   */
  renderSuccessModal(code, senderEmail = '') {
    // Xóa modal cũ nếu có
    const old = document.getElementById('report-success-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'report-success-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100 relative">
        <button type="button" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 cursor-pointer" onclick="document.getElementById('report-success-modal')?.remove()">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>

        <div class="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
          <i class="fa-solid fa-check"></i>
        </div>

        <h2 class="text-2xl font-black text-slate-900 mb-1">Gửi phản ánh thành công!</h2>
        <p class="text-xs text-slate-500 mb-4">Hệ thống đã lưu vào cơ sở dữ liệu và chuyển thông tin tới Trưởng bộ phận Kỹ thuật.</p>

        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <span class="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Mã yêu cầu của bạn:</span>
          <span class="font-mono text-2xl font-black text-blue-900 tracking-wider select-all">${code}</span>
          <p class="text-[11px] text-blue-700/80 mt-1">Vui lòng lưu lại mã này để tra cứu tình trạng xử lý.</p>
        </div>

        ${senderEmail ? `
          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 text-xs text-emerald-900 flex items-center gap-2 text-left">
            <i class="fa-solid fa-envelope-circle-check text-emerald-600 text-lg shrink-0"></i>
            <div>
              Email xác nhận đã được gửi tự động tới: <strong>${senderEmail}</strong>. Bạn có thể kiểm tra hộp thư đến (hoặc hòm thư Spam).
            </div>
          </div>
        ` : ''}

        <div class="space-y-3">
          <a href="#/tracking?code=${code}" class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5" onclick="document.getElementById('report-success-modal')?.remove()">
            <i class="fa-solid fa-comments"></i>
            <span>THEO DÕI TIẾN ĐỘ & NHẮN TIN VỚI KỸ THUẬT</span>
          </a>
          <a href="#/" class="block w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors" onclick="document.getElementById('report-success-modal')?.remove()">
            Về trang chủ
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
};

window.ReportFormPage = ReportFormPage;
