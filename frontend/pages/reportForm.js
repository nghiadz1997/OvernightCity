/**
 * NSG SUPPORT - MULTI-CATEGORY REPORT SUBMISSION FORM
 * Hỗ trợ 4 phân hệ phản ánh chuyên sâu:
 * 1. 🏫 Cơ sở vật chất (Thiết bị, điện nước, mạng, giảng đường)
 * 2. 🚗 Tài xế (Chuyến xe, giờ đi/về, an toàn giao thông, thái độ, lộ trình)
 * 3. 🧹 Vệ sinh – Tạp vụ (Phòng học, WC, hành lang, rác, nước đọng, vật tư)
 * 4. 🛡️ Bảo vệ (An ninh trật tự, ca trực, kiểm soát ra vào, trông xe)
 */

const ReportFormPage = {
  selectedType: 'FACILITIES', // 'FACILITIES' | 'DRIVER' | 'CLEANING' | 'SECURITY'
  selectedFiles: [],
  isSubmitting: false,
  COOLDOWN_MS: 5 * 60 * 1000, // 5 phút (300 giây)
  spamInterval: null,

  REPORT_TYPES: {
    FACILITIES: {
      id: 'FACILITIES',
      name: 'Cơ sở vật chất',
      emoji: '🏫',
      icon: 'fa-building',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      activeColor: 'from-blue-600 to-indigo-600',
      borderActive: 'border-blue-600 bg-blue-50/60 shadow-md',
      desc: 'Báo hỏng máy tính, máy chiếu, mạng, điện nước, thiết bị giảng đường & văn phòng'
    },
    DRIVER: {
      id: 'DRIVER',
      name: 'Tài xế',
      emoji: '🚗',
      icon: 'fa-car-side',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      activeColor: 'from-amber-600 to-orange-600',
      borderActive: 'border-amber-600 bg-amber-50/60 shadow-md',
      desc: 'Phản ánh chuyến xe, lộ trình, giờ giấc đưa đón, thái độ và an toàn lái xe'
    },
    CLEANING: {
      id: 'CLEANING',
      name: 'Vệ sinh – Tạp vụ',
      emoji: '🧹',
      icon: 'fa-broom',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      activeColor: 'from-emerald-600 to-teal-600',
      borderActive: 'border-emerald-600 bg-emerald-50/60 shadow-md',
      desc: 'Phản ánh vệ sinh phòng học, nhà vệ sinh, hành lang, rác thải và cảnh quan'
    },
    SECURITY: {
      id: 'SECURITY',
      name: 'Bảo vệ',
      emoji: '🛡️',
      icon: 'fa-shield-halved',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      activeColor: 'from-indigo-600 to-purple-600',
      borderActive: 'border-indigo-600 bg-indigo-50/60 shadow-md',
      desc: 'Phản ánh an ninh trật tự, ca trực, kiểm soát ra vào, trông giữ xe và an toàn'
    }
  },

  getRemainingCooldown() {
    const user = AuthService.getCurrentUser();
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
    this.checkAndStartSpamTimer();
    this.initDynamicForm();
  },

  async initDynamicForm() {
    // 1. Tải địa điểm động nếu form hiện tại có bộ chọn địa điểm 3 tầng
    try {
      await ApiService.loadCampuses();
    } catch (e) {}
    this.initLocationSelectors();

    // 2. Tải danh mục thiết bị nếu là form Cơ sở vật chất
    if (this.selectedType === 'FACILITIES') {
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
    }

    // 3. Tự động gán ngày hôm nay cho các form cần chọn ngày
    const todayStr = new Date().toISOString().split('T')[0];
    const tripDateEl = document.getElementById('driver-trip-date');
    if (tripDateEl && !tripDateEl.value) tripDateEl.value = todayStr;

    const secDateEl = document.getElementById('security-date');
    if (secDateEl && !secDateEl.value) secDateEl.value = todayStr;
  },

  initLocationSelectors() {
    const campusSelect = document.getElementById('rep-campus');
    const zoneSelect = document.getElementById('rep-zone');
    const roomSelect = document.getElementById('rep-room-select');
    const customRoomContainer = document.getElementById('rep-room-custom-container');

    if (!campusSelect) return;

    // Nạp danh sách Cơ sở
    const campuses = window.APP_CONFIG.CAMPUSES || [];
    campusSelect.innerHTML = `
      <option value="">-- Chọn Cơ sở --</option>
      ${campuses.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
    `;

    // Nếu không có zoneSelect (ví dụ chỉ chọn Cơ sở ở form Tài xế)
    if (!zoneSelect || !roomSelect) return;

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

  selectReportType(typeKey) {
    if (!this.REPORT_TYPES[typeKey]) return;
    this.selectedType = typeKey;

    const formBody = document.getElementById('report-dynamic-content');
    const headerTitle = document.getElementById('report-header-title');
    const headerDesc = document.getElementById('report-header-desc');

    if (formBody) {
      formBody.innerHTML = this.renderCurrentTypeForm();
      this.initDynamicForm();
    }

    // Cập nhật giao diện thanh chuyển Tab
    Object.keys(this.REPORT_TYPES).forEach(k => {
      const btn = document.getElementById(`tab-type-${k}`);
      if (btn) {
        if (k === typeKey) {
          btn.className = `flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${this.REPORT_TYPES[k].borderActive}`;
          const checkIcon = btn.querySelector('.tab-check-icon');
          if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
          btn.className = `flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-center bg-white text-slate-700`;
          const checkIcon = btn.querySelector('.tab-check-icon');
          if (checkIcon) checkIcon.classList.add('hidden');
        }
      }
    });

    if (headerTitle && headerDesc) {
      const t = this.REPORT_TYPES[typeKey];
      headerTitle.innerText = `PHIẾU PHẢN ÁNH: ${t.name.toUpperCase()}`;
      headerDesc.innerText = t.desc;
    }
  },

  render() {
    const user = AuthService.getCurrentUser();

    // Lấy query param type nếu có (ví dụ: ?type=DRIVER hoặc ?type=CLEANING)
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const requestedType = urlParams.get('type')?.toUpperCase();
    if (requestedType && this.REPORT_TYPES[requestedType]) {
      this.selectedType = requestedType;
    }

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
              Để đảm bảo phản ánh được chuyển đúng bộ phận (<strong>Cơ sở vật chất, Tài xế, Tạp vụ, Bảo vệ</strong>), chống spam và <strong>nhận email cập nhật tiến độ xử lý</strong>, vui lòng đăng nhập tài khoản Google.
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

    const currentTypeObj = this.REPORT_TYPES[this.selectedType];

    // 2. ĐÃ ĐĂNG NHẬP: HIỂN THỊ FORM CHUYỂN ĐỔI 4 LOẠI PHẢN ÁNH
    return `
      <div class="max-w-4xl mx-auto px-4 py-8 sm:px-6 animate-fade-in">
        <!-- Breadcrumb -->
        <div class="flex items-center justify-between mb-6">
          <nav class="flex items-center gap-2 text-xs text-slate-500">
            <a href="#/" class="hover:text-blue-600 font-medium">Trang chủ</a>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <span class="text-slate-900 font-semibold">Gửi phản ánh & hỗ trợ</span>
          </nav>
        </div>

        <!-- Form Card -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          <!-- Top Header -->
          <div class="bg-gradient-to-r ${currentTypeObj.activeColor} px-6 sm:px-8 py-6 text-white transition-all duration-300">
            <div class="flex items-center gap-3.5">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shrink-0 shadow-xs">
                <span>${currentTypeObj.emoji}</span>
              </div>
              <div>
                <h1 id="report-header-title" class="text-xl sm:text-2xl font-black tracking-tight">
                  PHIẾU PHẢN ÁNH: ${currentTypeObj.name.toUpperCase()}
                </h1>
                <p id="report-header-desc" class="text-xs sm:text-sm text-white/90 mt-0.5 font-light">
                  ${currentTypeObj.desc}
                </p>
              </div>
            </div>
          </div>

          <!-- Main Form Container -->
          <form id="report-submission-form" class="p-6 sm:p-8 space-y-6" onsubmit="ReportFormPage.handleSubmit(event)">
            <!-- Honeypot Field chống spam -->
            <input type="text" name="_hp_website" id="_hp_website" style="display:none !important;" tabindex="-1" autocomplete="off">

            <!-- Thẻ định danh người dùng đã xác thực Google -->
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
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
              <button type="button" onclick="ReportFormPage.handleSwitchAccount()" class="text-xs text-slate-600 hover:text-red-600 font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 transition shrink-0 cursor-pointer">
                <i class="fa-solid fa-arrow-right-from-bracket mr-1"></i> Đổi tài khoản
              </button>
            </div>

            <!-- BỘ CHỌN 4 LOẠI PHẢN ÁNH CHÍNH THEO YÊU CẦU MỚI -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-layer-group text-blue-600"></i> Chọn phân hệ phản ánh:
                </span>
                <span class="text-[11px] text-slate-400 font-normal">Nhấn vào từng mục để đổi biểu mẫu tương ứng</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${Object.values(this.REPORT_TYPES).map(t => {
                  const isActive = t.id === this.selectedType;
                  return `
                    <button type="button" id="tab-type-${t.id}" onclick="ReportFormPage.selectReportType('${t.id}')" class="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${isActive ? t.borderActive : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700'}">
                      <span class="text-2xl sm:text-3xl mb-1.5">${t.emoji}</span>
                      <span class="text-xs font-extrabold text-slate-900">${t.name}</span>
                      <span class="tab-check-icon ${isActive ? '' : 'hidden'} absolute top-2 right-2 text-blue-600 text-xs font-bold">
                        <i class="fa-solid fa-circle-check"></i>
                      </span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- NỘI DUNG BIỂU MẪU ĐỘNG THEO LOẠI ĐÃ CHỌN -->
            <div id="report-dynamic-content" class="space-y-6 pt-2">
              ${this.renderCurrentTypeForm()}
            </div>

            <!-- PHẦN CHUNG: THÔNG TIN NGƯỜI GỬI PHẢN ÁNH (GIỮ NGUYÊN ĐỊNH DẠNG) -->
            <div class="border-t border-slate-200 pt-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-address-card text-blue-600"></i> Thông tin người gửi phản ánh
                </h3>
                <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <i class="fa-solid fa-lock text-[10px]"></i> Đã định danh Google
                </span>
              </div>
              <p class="text-xs text-slate-500 mb-4 font-normal">
                Họ tên và Email được trích xuất tự động từ tài khoản Google đã xác thực. Bạn chỉ cần nhập thêm Số điện thoại để nhận thông báo và liên hệ hỗ trợ.
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
                    <input type="text" id="rep-sender-name" class="w-full pl-10 pr-3 text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium bg-slate-100 text-slate-700 cursor-not-allowed" placeholder="Ví dụ: Nguyễn Văn An" value="${user?.displayName || ''}" readonly required>
                  </div>
                </div>

                <!-- Email nhận phản hồi -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    Email nhận kết quả xử lý <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <i class="fa-solid fa-envelope"></i>
                    </div>
                    <input type="email" id="rep-sender-email" class="w-full pl-10 pr-3 text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium bg-slate-100 text-slate-700 cursor-not-allowed" placeholder="example@gmail.com" value="${user?.email || ''}" readonly required>
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
                Sau khi gửi thành công, bạn sẽ nhận được Mã yêu cầu và Email xác nhận để theo dõi tiến độ xử lý.
              </p>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  /**
   * Render nội dung form theo từng loại
   */
  renderCurrentTypeForm() {
    switch (this.selectedType) {
      case 'DRIVER':
        return this.renderDriverForm();
      case 'CLEANING':
        return this.renderCleaningForm();
      case 'SECURITY':
        return this.renderSecurityForm();
      case 'FACILITIES':
      default:
        return this.renderFacilitiesForm();
    }
  },

  // ========================================================
  // 1. FORM 🏫 CƠ SỞ VẬT CHẤT (Biểu mẫu thiết bị & hạ tầng)
  // ========================================================
  renderFacilitiesForm() {
    const categories = window.APP_CONFIG.CATEGORIES || [];
    return `
      <!-- Khối 1: Vị trí 3 tầng -->
      <div class="space-y-4">
        <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-map-location-dot text-blue-600"></i> 1. Địa điểm xảy ra sự cố & Loại thiết bị
        </h3>

        <!-- Cụm chọn Địa điểm 3 tầng -->
        <div class="p-5 bg-blue-50/50 rounded-3xl border border-blue-200 shadow-2xs space-y-3.5">
          <span class="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
            <i class="fa-solid fa-building text-blue-600"></i> Chọn vị trí chính xác (3 Tầng):
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">1. Cơ sở <span class="text-red-500">*</span></label>
              <select id="rep-campus" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required>
                <option value="">-- Chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">2. Khu vực / Tòa nhà <span class="text-red-500">*</span></label>
              <select id="rep-zone" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">3. Phòng cụ thể <span class="text-red-500">*</span></label>
              <select id="rep-room-select" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Khu vực --</option>
              </select>
            </div>
          </div>

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
              <option value="BÌNH THƯỜNG" class="text-blue-700">🟢 Bình thường (Xử lý trong 48h)</option>
              <option value="TRUNG BÌNH" class="text-yellow-700">🟡 Trung bình (Xử lý trong 24h)</option>
              <option value="CAO" class="text-orange-700">🟠 Cao (Xử lý trong 8h)</option>
              <option value="KHẨN CẤP" class="text-red-700 font-black">🔴 Khẩn cấp (Xử lý ngay trong 2h)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Khối 2: Mô tả chi tiết sự cố -->
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

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-screwdriver-wrench text-blue-600"></i>
                <span>Yêu cầu kỹ thuật / Đề xuất hỗ trợ <span class="text-slate-400 font-normal text-[11px]">(Tùy chọn)</span></span>
              </span>
              <span class="text-[11px] text-blue-600 font-medium">Gợi ý mang theo linh kiện, công cụ</span>
            </label>
            <textarea id="rep-tech-requirement" rows="2" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 leading-relaxed font-normal bg-slate-50/50" placeholder="Ví dụ: Cần thay dây HDMI dài 5m, mang thang chữ A để kiểm tra trần, chuẩn bị bóng đèn tuýp LED 1m2..."></textarea>
          </div>

          <!-- Đính kèm ảnh / video -->
          ${this.renderAttachmentPicker()}
        </div>
      </div>
    `;
  },

  // ========================================================
  // 2. FORM 🚗 TÀI XẾ (Biểu mẫu dịch vụ xe đưa đón)
  // ========================================================
  renderDriverForm() {
    return `
      <!-- Khối 1: Thông tin chuyến xe & Lộ trình di chuyển -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-car-side text-amber-600"></i> 1. Thông tin chuyến xe & Lộ trình di chuyển
          </h3>
          <span class="text-[11px] text-amber-800 font-bold bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
            <i class="fa-solid fa-pen-to-square text-[10px] text-amber-600"></i> Nhập trực tiếp
          </span>
        </div>

        <div class="p-5 bg-amber-50/60 rounded-3xl border border-amber-200 shadow-2xs space-y-4">
          <!-- Hàng 1: Điểm đón và Điểm đến -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-location-dot text-amber-600"></i>
                <span>Điểm đón / Nơi xuất phát <span class="text-red-500">*</span></span>
              </label>
              <input type="text" id="driver-pickup" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-bold bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ví dụ: Cơ sở 1 (04 Nguyễn Thông), Sân bay Tân Sơn Nhất, Tòa nhà A..." required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-flag-checkered text-amber-600"></i>
                <span>Điểm đến / Nơi đến <span class="text-red-500">*</span></span>
              </label>
              <input type="text" id="driver-destination" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-bold bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ví dụ: Cơ sở 2 (Nhà Bè), Khách sạn Rex, Trung tâm Hội nghị..." required>
            </div>
          </div>

          <!-- Hàng 2: Thời gian sử dụng xe -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-calendar-day text-amber-600"></i>
                <span>Ngày sử dụng xe <span class="text-red-500">*</span></span>
              </label>
              <input type="date" id="driver-trip-date" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-bold bg-white text-slate-900" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-clock text-amber-600"></i>
                <span>Giờ đi / Giờ đón</span>
              </label>
              <input type="time" id="driver-dept-time" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white text-slate-900">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-clock-rotate-left text-amber-600"></i>
                <span>Giờ về / Giờ trả</span>
              </label>
              <input type="time" id="driver-return-time" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white text-slate-900">
            </div>
          </div>

          <!-- Hàng 3: Biển số xe, Tên tài xế & Mục đích chuyến đi -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-rectangle-ad text-amber-600"></i>
                <span>Biển số xe (nếu nhớ)</span>
              </label>
              <input type="text" id="driver-plate" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono font-bold bg-white text-blue-900 placeholder:text-slate-400 uppercase" placeholder="Ví dụ: 51B-123.45, 50F-888.99...">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-id-badge text-amber-600"></i>
                <span>Tên tài xế (nếu biết)</span>
              </label>
              <input type="text" id="driver-name" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ví dụ: Chú Ba, Anh Tuấn...">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-bullseye text-amber-600"></i>
                <span>Mục đích chuyến đi / công tác</span>
              </label>
              <input type="text" id="driver-purpose" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium bg-white text-slate-900 placeholder:text-slate-400" placeholder="Ví dụ: Đưa đón giảng viên, đoàn công tác...">
            </div>
          </div>
        </div>
      </div>

      <!-- Khối 2: Nội dung phản ánh (Checkboxes nhiều mục) -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check text-amber-600"></i> 2. Nội dung phản ánh (Chọn một hoặc nhiều mục) <span class="text-red-500">*</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Tài xế đến trễ',
            'Không đúng lịch điều xe',
            'Thái độ giao tiếp chưa phù hợp',
            'Không hỗ trợ hành khách khi cần',
            'Sử dụng điện thoại khi lái xe',
            'Lái xe nhanh / thiếu an toàn',
            'Không tuân thủ quy định giao thông',
            'Tự ý thay đổi lộ trình',
            'Xe không sạch sẽ',
            'Điều hòa / trang thiết bị trên xe có vấn đề',
            'Hút thuốc trên xe',
            'Có lời nói hoặc hành vi gây khó chịu',
            'Khác'
          ].map((item, idx) => `
            <label class="flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-100/50 cursor-pointer text-xs font-semibold text-slate-800 transition">
              <input type="checkbox" name="driver-issues" value="${item}" class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 mt-0.5 cursor-pointer">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết sự việc <span class="text-red-500">*</span></label>
          <textarea id="driver-description" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 leading-relaxed font-normal" placeholder="Vui lòng ghi rõ thời gian, địa điểm, diễn biến sự việc và các thông tin liên quan để đơn vị có cơ sở kiểm tra..." required></textarea>
        </div>
      </div>

      <!-- Khối 3: Mức độ sự việc -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-gauge-high text-amber-600"></i> 3. Mức độ sự việc <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 cursor-pointer text-xs font-bold text-emerald-800 transition">
            <input type="radio" name="driver-severity" value="GÓP Ý" class="text-emerald-600" checked>
            <span>🟢 Góp ý</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-yellow-50 cursor-pointer text-xs font-bold text-yellow-800 transition">
            <input type="radio" name="driver-severity" value="CẦN NHẮC NHỞ" class="text-yellow-600">
            <span>🟡 Cần nhắc nhở</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 cursor-pointer text-xs font-bold text-orange-800 transition">
            <input type="radio" name="driver-severity" value="NGHIÊM TRỌNG" class="text-orange-600">
            <span>🟠 Nghiêm trọng</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-red-50 cursor-pointer text-xs font-bold text-red-800 transition">
            <input type="radio" name="driver-severity" value="NGUY CƠ AN TOÀN" class="text-red-600">
            <span>🔴 Nguy cơ an toàn</span>
          </label>
        </div>
      </div>

      <!-- Khối 4: Minh chứng & Nhân chứng -->
      <div class="border-t border-slate-200 pt-6 space-y-4">
        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-paperclip text-amber-600"></i> 4. Minh chứng & Nhân chứng
        </h3>

        ${this.renderAttachmentPicker()}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Có nhân chứng đi cùng không?</label>
            <div class="flex items-center gap-4 pt-1">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input type="radio" name="driver-has-witness" value="YES" onchange="document.getElementById('driver-witness-container').classList.remove('hidden')">
                <span>Có nhân chứng</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input type="radio" name="driver-has-witness" value="NO" checked onchange="document.getElementById('driver-witness-container').classList.add('hidden')">
                <span>Không có</span>
              </label>
            </div>
          </div>
          <div id="driver-witness-container" class="hidden">
            <label class="block text-xs font-bold text-slate-700 mb-1">Tên / người đi cùng liên quan</label>
            <input type="text" id="driver-witness-name" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium" placeholder="Ví dụ: Thầy Nam, Cô Hương (Khoa CNTT)...">
          </div>
        </div>
      </div>

      <!-- Khối 5: Mong muốn xử lý -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-bullseye text-amber-600"></i> 5. Mong muốn xử lý
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Chỉ ghi nhận góp ý',
            'Đề nghị kiểm tra sự việc',
            'Đề nghị phản hồi kết quả',
            'Đề nghị liên hệ trực tiếp với tôi',
            'Khác'
          ].map(out => `
            <label class="flex items-center gap-2 p-2 rounded-xl hover:bg-amber-100/40 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="driver-outcomes" value="${out}" class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500">
              <span>${out}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ========================================================
  // 3. FORM 🧹 VỆ SINH – TẠP VỤ (Biểu mẫu làm sạch & cảnh quan)
  // ========================================================
  renderCleaningForm() {
    return `
      <!-- Khối 1: Vị trí 3 tầng -->
      <div class="space-y-4">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-map-location-dot text-emerald-600"></i> 1. Địa điểm xảy ra vấn đề vệ sinh
        </h3>

        <!-- Cụm chọn Địa điểm 3 tầng -->
        <div class="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-200 space-y-3.5">
          <span class="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
            <i class="fa-solid fa-building text-emerald-600"></i> Chọn vị trí chính xác (3 Tầng):
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">1. Cơ sở <span class="text-red-500">*</span></label>
              <select id="rep-campus" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold bg-white" required>
                <option value="">-- Chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">2. Khu vực / Tòa nhà <span class="text-red-500">*</span></label>
              <select id="rep-zone" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">3. Phòng / Vị trí cụ thể <span class="text-red-500">*</span></label>
              <select id="rep-room-select" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Khu vực --</option>
              </select>
            </div>
          </div>

          <div id="rep-room-custom-container" class="hidden pt-1">
            <label class="block text-xs font-bold text-emerald-700 mb-1">Nhập tên phòng / vị trí cụ thể khác <span class="text-red-500">*</span></label>
            <input type="text" id="rep-room-custom" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-emerald-300 focus:ring-2 focus:ring-emerald-500 bg-white font-medium" placeholder="Ví dụ: Nhà vệ sinh nữ lầu 2, Hành lang khu B...">
          </div>
        </div>
      </div>

      <!-- Khối 2: Khu vực cụ thể cần phản ánh -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-vector-square text-emerald-600"></i> 2. Loại khu vực cần vệ sinh
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Phòng học',
            'Phòng làm việc',
            'Hành lang',
            'Cầu thang',
            'Nhà vệ sinh',
            'Sân trường',
            'Bãi xe',
            'Khu vực công cộng',
            'Thùng rác',
            'Khác'
          ].map(area => `
            <label class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-100/50 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="cleaning-areas" value="${area}" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500">
              <span>${area}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Khối 3: Nội dung phản ánh -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check text-emerald-600"></i> 3. Nội dung phản ánh chi tiết <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Sàn nhà bẩn / có nước đọng',
            'Có rác chưa được thu gom',
            'Thùng rác đầy',
            'Có mùi khó chịu',
            'Nhà vệ sinh chưa sạch',
            'Thiếu giấy vệ sinh',
            'Thiếu xà phòng rửa tay',
            'Bồn rửa tay bẩn / nghẹt',
            'Bồn cầu / bồn tiểu bẩn hoặc nghẹt',
            'Kính / cửa / bàn ghế nhiều bụi',
            'Hành lang / cầu thang chưa vệ sinh',
            'Có côn trùng',
            'Chất thải hoặc nước thải chưa xử lý',
            'Nhân viên tạp vụ chưa thực hiện đúng lịch',
            'Thái độ phục vụ chưa phù hợp',
            'Khác'
          ].map(item => `
            <label class="flex items-start gap-2.5 p-2 rounded-xl hover:bg-emerald-100/50 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="cleaning-issues" value="${item}" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 mt-0.5">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả tình trạng chi tiết <span class="text-red-500">*</span></label>
          <textarea id="cleaning-description" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-normal" placeholder="Ví dụ: Nhà vệ sinh nữ tầng 3 khu A, khoảng 14:20, sàn có nhiều nước và thùng rác đã đầy..." required></textarea>
        </div>
      </div>

      <!-- Khối 4: Mức độ cần xử lý -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-gauge-high text-emerald-600"></i> 4. Mức độ cần xử lý <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 cursor-pointer text-xs font-bold text-emerald-800 transition">
            <input type="radio" name="cleaning-severity" value="THÔNG THƯỜNG" class="text-emerald-600" checked>
            <span>🟢 Thông thường</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-yellow-50 cursor-pointer text-xs font-bold text-yellow-800 transition">
            <input type="radio" name="cleaning-severity" value="CẦN XỬ LÝ SỚM" class="text-yellow-600">
            <span>🟡 Cần xử lý sớm</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 cursor-pointer text-xs font-bold text-orange-800 transition">
            <input type="radio" name="cleaning-severity" value="CẦN XỬ LÝ NGAY" class="text-orange-600">
            <span>🟠 Cần xử lý ngay</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-red-50 cursor-pointer text-xs font-bold text-red-800 transition">
            <input type="radio" name="cleaning-severity" value="KHẨN CẤP" class="text-red-600">
            <span>🔴 Khẩn cấp (Nguy cơ ngã/tràn)</span>
          </label>
        </div>
      </div>

      <!-- Khối 5: Minh chứng -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-camera text-emerald-600"></i> 5. Hình ảnh / Minh chứng thực tế
        </h3>
        <p class="text-xs text-slate-500">Hình ảnh sẽ giúp bộ phận phụ trách xác định vị trí và cử nhân viên đến xử lý nhanh hơn.</p>
        ${this.renderAttachmentPicker()}
      </div>

      <!-- Khối 6: Mong muốn xử lý -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-bullseye text-emerald-600"></i> 6. Mong muốn xử lý
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Đề nghị vệ sinh lại khu vực',
            'Đề nghị bổ sung vật tư',
            'Đề nghị kiểm tra thiết bị',
            'Đề nghị kiểm tra lịch làm việc',
            'Chỉ góp ý',
            'Khác'
          ].map(out => `
            <label class="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-100/40 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="cleaning-outcomes" value="${out}" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500">
              <span>${out}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ========================================================
  // 4. FORM 🛡️ BẢO VỆ (Biểu mẫu an ninh & trật tự)
  // ========================================================
  renderSecurityForm() {
    return `
      <!-- Khối 1: Vị trí 3 tầng -->
      <div class="space-y-4">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-map-location-dot text-indigo-600"></i> 1. Địa điểm xảy ra sự việc
        </h3>

        <!-- Cụm chọn Địa điểm 3 tầng -->
        <div class="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-200 space-y-3.5">
          <span class="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
            <i class="fa-solid fa-building text-indigo-600"></i> Chọn vị trí chính xác (3 Tầng):
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">1. Cơ sở <span class="text-red-500">*</span></label>
              <select id="rep-campus" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required>
                <option value="">-- Chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">2. Khu vực / Cổng / Tòa nhà <span class="text-red-500">*</span></label>
              <select id="rep-zone" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Cơ sở --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">3. Vị trí cụ thể <span class="text-red-500">*</span></label>
              <select id="rep-room-select" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required disabled>
                <option value="">-- Vui lòng chọn Khu vực --</option>
              </select>
            </div>
          </div>

          <div id="rep-room-custom-container" class="hidden pt-1">
            <label class="block text-xs font-bold text-indigo-700 mb-1">Nhập vị trí / cổng cụ thể khác <span class="text-red-500">*</span></label>
            <input type="text" id="rep-room-custom" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 bg-white font-medium" placeholder="Ví dụ: Cổng phụ đường Nguyễn Huệ, Khu gửi xe giáo viên...">
          </div>
        </div>
      </div>

      <!-- Khối 2: Thời gian xảy ra & Ca trực -->
      <div class="border-t border-slate-200 pt-6 space-y-4">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-clock text-indigo-600"></i> 2. Thời gian xảy ra & Ca trực
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ngày xảy ra <span class="text-red-500">*</span></label>
            <input type="date" id="security-date" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Giờ xảy ra (khoảng)</label>
            <input type="time" id="security-time" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-white">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ca trực liên quan <span class="text-red-500">*</span></label>
            <select id="security-shift" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required>
              <option value="SÁNG">🌅 Ca Sáng (06:00 - 12:00)</option>
              <option value="CHIỀU">☀️ Ca Chiều (12:00 - 18:00)</option>
              <option value="TỐI">🌆 Ca Tối (18:00 - 22:00)</option>
              <option value="ĐÊM">🌙 Ca Đêm (22:00 - 06:00)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Khối 3: Nội dung phản ánh -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check text-indigo-600"></i> 3. Nội dung phản ánh (Chọn một hoặc nhiều mục) <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Thái độ giao tiếp chưa phù hợp',
            'Không hướng dẫn khách/người đến liên hệ',
            'Không có mặt tại vị trí trực',
            'Rời vị trí trực không rõ lý do',
            'Kiểm soát người ra vào chưa chặt chẽ',
            'Không kiểm tra thẻ/giấy tờ khi cần thiết',
            'Xử lý xe ra vào chưa phù hợp',
            'Sắp xếp xe chưa đúng khu vực',
            'Chậm xử lý sự cố',
            'Không hỗ trợ khi có yêu cầu',
            'Có lời nói/hành vi gây khó chịu',
            'Sử dụng điện thoại riêng trong lúc trực',
            'Ngủ hoặc mất tập trung khi trực',
            'Không thực hiện đúng quy định an ninh',
            'Có dấu hiệu gây mất an toàn',
            'Khác'
          ].map(item => `
            <label class="flex items-start gap-2.5 p-2 rounded-xl hover:bg-indigo-100/50 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="security-issues" value="${item}" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết sự việc <span class="text-red-500">*</span></label>
          <textarea id="security-description" rows="3" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 leading-relaxed font-normal" placeholder="Ví dụ: Khoảng 10:20 tại cổng chính, khách đến liên hệ nhưng không được hướng dẫn khu vực làm việc và phải chờ khá lâu..." required></textarea>
        </div>
      </div>

      <!-- Khối 4: Mức độ sự việc -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-gauge-high text-indigo-600"></i> 4. Mức độ sự việc <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 cursor-pointer text-xs font-bold text-emerald-800 transition">
            <input type="radio" name="security-severity" value="GÓP Ý" class="text-emerald-600" checked>
            <span>🟢 Góp ý</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-yellow-50 cursor-pointer text-xs font-bold text-yellow-800 transition">
            <input type="radio" name="security-severity" value="CẦN NHẮC NHỞ" class="text-yellow-600">
            <span>🟡 Cần nhắc nhở</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 cursor-pointer text-xs font-bold text-orange-800 transition">
            <input type="radio" name="security-severity" value="KIỂM TRA SỚM" class="text-orange-600">
            <span>🟠 Cần kiểm tra sớm</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-red-50 cursor-pointer text-xs font-bold text-red-800 transition">
            <input type="radio" name="security-severity" value="KHẨN CẤP" class="text-red-600">
            <span>🔴 Khẩn cấp (Xâm nhập/Xô xát)</span>
          </label>
        </div>
      </div>

      <!-- Khối 5: Minh chứng & Nhận dạng liên quan -->
      <div class="border-t border-slate-200 pt-6 space-y-4">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-paperclip text-indigo-600"></i> 5. Minh chứng & Nhận dạng đối tượng
        </h3>

        ${this.renderAttachmentPicker()}

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Biển số xe liên quan (nếu có)</label>
            <input type="text" id="security-plate" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono font-bold" placeholder="Ví dụ: 59X1-999.99">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả nhận dạng người liên quan</label>
            <input type="text" id="security-person" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="Ví dụ: Nam, áo đen, đeo kính...">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Có nhân chứng không?</label>
            <select id="security-has-witness" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium bg-white">
              <option value="NO">Không có</option>
              <option value="YES">Có nhân chứng</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Khối 6: Mong muốn xử lý -->
      <div class="border-t border-slate-200 pt-6 space-y-3">
        <h3 class="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-bullseye text-indigo-600"></i> 6. Mong muốn xử lý
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          ${[
            'Chỉ ghi nhận góp ý',
            'Đề nghị kiểm tra camera',
            'Đề nghị xác minh ca trực',
            'Đề nghị nhắc nhở nhân viên',
            'Đề nghị phản hồi kết quả',
            'Đề nghị liên hệ trực tiếp',
            'Khác'
          ].map(out => `
            <label class="flex items-center gap-2 p-2 rounded-xl hover:bg-indigo-100/40 cursor-pointer text-xs font-semibold text-slate-800">
              <input type="checkbox" name="security-outcomes" value="${out}" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500">
              <span>${out}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Khối tải đính kèm file dùng chung
   */
  renderAttachmentPicker() {
    return `
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
    `;
  },

  async handleFileSelect(e) {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;

    const container = document.getElementById('file-previews-container');
    if (container) {
      container.innerHTML = '<div class="col-span-full text-xs text-blue-600 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang nén & tối ưu hóa tệp ảnh...</div>';
    }

    if (!this.selectedFiles) this.selectedFiles = [];

    for (const f of newFiles) {
      if (this.selectedFiles.length >= 5) {
        Utils.showToast('Tối đa đính kèm 5 tệp / ảnh!', 'warning');
        break;
      }
      if (f.type.startsWith('image/')) {
        const compressed = await Utils.compressImage(f);
        this.selectedFiles.push(compressed);
      } else {
        this.selectedFiles.push(f);
      }
    }

    this.renderFilePreviews();
    // Reset file input để có thể chọn lại cùng 1 file nếu cần
    if (e.target) e.target.value = '';
  },

  renderFilePreviews() {
    const container = document.getElementById('file-previews-container');
    if (!container) return;
    container.innerHTML = '';

    (this.selectedFiles || []).forEach((file, index) => {
      const isImg = file.type.startsWith('image/');
      const card = document.createElement('div');
      card.className = 'relative border border-slate-200 rounded-xl p-2.5 bg-white flex items-center gap-2 text-xs overflow-hidden shadow-xs hover:border-blue-300 transition-all';
      card.innerHTML = `
        <div class="w-8 h-8 rounded-lg ${isImg ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center shrink-0">
          <i class="fa-solid ${isImg ? 'fa-image' : 'fa-file-lines'} text-sm"></i>
        </div>
        <div class="truncate flex-1">
          <p class="font-bold text-slate-800 truncate text-[11px]">${file.name}</p>
          <p class="text-[10px] text-emerald-600 font-medium">${(file.size / 1024).toFixed(1)} KB ${isImg ? '(Đã tối ưu)' : ''}</p>
        </div>
        <button type="button" class="text-slate-400 hover:text-red-500 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors" onclick="ReportFormPage.removeFile(${index})" title="Xóa tệp">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      container.appendChild(card);
    });
  },

  removeFile(index) {
    if (!this.selectedFiles) return;
    this.selectedFiles.splice(index, 1);
    this.renderFilePreviews();
  },

  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    // 1. Kiểm tra chống spam
    const remaining = this.getRemainingCooldown();
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      Utils.showToast(`Để chống spam, vui lòng đợi ${timeStr} nữa để gửi tiếp phản ánh!`, 'warning');
      return;
    }

    // 2. Chống honeypot
    const hp = document.getElementById('_hp_website')?.value;
    if (hp) {
      console.warn('Bot detected via honeypot');
      return;
    }

    // 3. Thông tin người gửi dùng chung
    const senderName = document.getElementById('rep-sender-name')?.value?.trim();
    const senderEmail = document.getElementById('rep-sender-email')?.value?.trim();
    const senderPhone = document.getElementById('rep-sender-phone')?.value?.trim();

    if (!senderName) {
      Utils.showToast('Vui lòng nhập Họ và tên người gửi phản ánh!', 'warning');
      return;
    }

    if (!senderEmail || !senderEmail.includes('@')) {
      Utils.showToast('Vui lòng nhập Email hợp lệ!', 'warning');
      return;
    }

    if (!senderPhone) {
      Utils.showToast('Vui lòng nhập Số điện thoại liên hệ!', 'warning');
      document.getElementById('rep-sender-phone')?.focus();
      return;
    }

    const cleanPhone = senderPhone.replace(/[\s\.\-]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      Utils.showToast('Số điện thoại liên hệ không hợp lệ (Vui lòng nhập từ 9-11 chữ số)!', 'warning');
      document.getElementById('rep-sender-phone')?.focus();
      return;
    }

    // 4. Thu thập dữ liệu địa điểm chung
    const campusSelect = document.getElementById('rep-campus');
    const zoneSelect = document.getElementById('rep-zone');
    const roomSelect = document.getElementById('rep-room-select');
    const customRoomInput = document.getElementById('rep-room-custom');

    const campusName = campusSelect?.options[campusSelect.selectedIndex]?.getAttribute('data-name') || campusSelect?.value || 'Cơ sở chính';
    const zoneName = zoneSelect?.options[zoneSelect.selectedIndex]?.getAttribute('data-name') || zoneSelect?.value || '';
    
    let roomName = roomSelect?.value || '';
    if (roomName === 'CUSTOM') {
      roomName = customRoomInput ? customRoomInput.value.trim() : '';
      if (!roomName) {
        Utils.showToast('Vui lòng nhập tên phòng / vị trí cụ thể!', 'warning');
        if (customRoomInput) customRoomInput.focus();
        return;
      }
    }

    let fullLocation = campusName;
    if (zoneName) fullLocation += ` - ${zoneName}`;

    // 5. Chuẩn bị payload theo từng loại form
    let title = '';
    let description = '';
    let categoryId = 'OTHER';
    let categoryName = 'Khác';
    let priority = 'BÌNH THƯỜNG';
    let extraMeta = {};

    const typeObj = this.REPORT_TYPES[this.selectedType];

    if (this.selectedType === 'FACILITIES') {
      if (!zoneName || !roomName) {
        Utils.showToast('Vui lòng chọn đầy đủ Cơ sở, Khu vực và Phòng xảy ra sự cố!', 'warning');
        return;
      }
      const catSelect = document.getElementById('rep-category-id');
      categoryId = catSelect?.value || 'FACILITIES';
      categoryName = catSelect?.options[catSelect.selectedIndex]?.getAttribute('data-name') || 'Cơ sở vật chất';
      priority = document.getElementById('rep-priority')?.value || 'BÌNH THƯỜNG';
      title = document.getElementById('rep-title')?.value?.trim();
      description = document.getElementById('rep-description')?.value?.trim();

      if (!title || !description) {
        Utils.showToast('Vui lòng nhập đầy đủ Tiêu đề và Mô tả chi tiết sự cố!', 'warning');
        return;
      }
    } else if (this.selectedType === 'DRIVER') {
      const tripDate = document.getElementById('driver-trip-date')?.value || '';
      const deptTime = document.getElementById('driver-dept-time')?.value || '';
      const returnTime = document.getElementById('driver-return-time')?.value || '';
      const pickup = document.getElementById('driver-pickup')?.value?.trim() || '';
      const destination = document.getElementById('driver-destination')?.value?.trim() || '';
      const plate = document.getElementById('driver-plate')?.value?.trim() || '';
      const driverName = document.getElementById('driver-name')?.value?.trim() || '';
      const purpose = document.getElementById('driver-purpose')?.value?.trim() || '';

      if (!pickup || !destination) {
        Utils.showToast('Vui lòng nhập đầy đủ Điểm đón và Điểm đến của chuyến xe!', 'warning');
        return;
      }

      const issuesChecked = Array.from(document.querySelectorAll('input[name="driver-issues"]:checked')).map(cb => cb.value);
      const rawDesc = document.getElementById('driver-description')?.value?.trim() || '';

      if (!rawDesc && issuesChecked.length === 0) {
        Utils.showToast('Vui lòng chọn ít nhất một nội dung phản ánh hoặc mô tả chi tiết sự việc!', 'warning');
        return;
      }

      const severity = document.querySelector('input[name="driver-severity"]:checked')?.value || 'GÓP Ý';
      const hasWitness = document.querySelector('input[name="driver-has-witness"]:checked')?.value === 'YES';
      const witnessName = document.getElementById('driver-witness-name')?.value?.trim() || '';
      const outcomes = Array.from(document.querySelectorAll('input[name="driver-outcomes"]:checked')).map(cb => cb.value);

      // Mapping priority
      if (severity === 'NGUY CƠ AN TOÀN') priority = 'KHẨN CẤP';
      else if (severity === 'NGHIÊM TRỌNG') priority = 'CAO';
      else if (severity === 'CẦN NHẮC NHỞ') priority = 'TRUNG BÌNH';
      else priority = 'BÌNH THƯỜNG';

      categoryId = 'DRIVER';
      categoryName = 'Tài xế / Dịch vụ xe';
      title = `[Tài xế] ${issuesChecked[0] || 'Phản ánh chuyến xe'} - ${plate ? `Xe ${plate}` : `${pickup} ➔ ${destination}`}`;
      
      description = `📌 NỘI DUNG PHẢN ÁNH CHUYẾN XE / TÀI XẾ:\n` +
        `• Ngày đi: ${tripDate} ${deptTime ? `(${deptTime}${returnTime ? ` - ${returnTime}` : ''})` : ''}\n` +
        `• Lộ trình: ${pickup} ➔ ${destination}\n` +
        `• Biển số xe: ${plate || 'Chưa rõ'} | Tài xế: ${driverName || 'Chưa rõ'}\n` +
        `• Mục đích: ${purpose || 'Không ghi'}\n` +
        `• Vấn đề: ${issuesChecked.join(', ') || 'Xem mô tả'}\n` +
        `• Mức độ: ${severity}\n` +
        `• Nhân chứng: ${hasWitness ? `Có (${witnessName || 'Có người đi cùng'})` : 'Không'}\n` +
        `• Mong muốn: ${outcomes.join(', ') || 'Ghi nhận xử lý'}\n\n` +
        `📝 CHI TIẾT SỰ VIỆC:\n${rawDesc}`;

      fullLocation = `${pickup} ➔ ${destination}`;
      roomName = plate ? `Xe ${plate}` : (driverName ? `Tài xế ${driverName}` : 'Xe đưa đón');

      extraMeta = {
        tripDate,
        deptTime,
        returnTime,
        tripDepartureTime: deptTime,
        tripReturnTime: returnTime,
        pickup,
        destination,
        tripPickupLocation: pickup,
        tripDestination: destination,
        plate,
        licensePlate: plate,
        tripLicensePlate: plate,
        driverName,
        tripDriverName: driverName,
        purpose,
        tripPurpose: purpose,
        issuesList: issuesChecked,
        severity,
        hasWitness,
        witnessName,
        desiredOutcomes: outcomes
      };
    } else if (this.selectedType === 'CLEANING') {
      if (!zoneName || !roomName) {
        Utils.showToast('Vui lòng chọn đầy đủ Cơ sở, Khu vực và Phòng xảy ra sự cố!', 'warning');
        return;
      }

      const cleaningAreas = Array.from(document.querySelectorAll('input[name="cleaning-areas"]:checked')).map(cb => cb.value);
      const issuesChecked = Array.from(document.querySelectorAll('input[name="cleaning-issues"]:checked')).map(cb => cb.value);
      const rawDesc = document.getElementById('cleaning-description')?.value?.trim() || '';

      if (!rawDesc && issuesChecked.length === 0) {
        Utils.showToast('Vui lòng chọn nội dung phản ánh hoặc mô tả chi tiết tình trạng vệ sinh!', 'warning');
        return;
      }

      const severity = document.querySelector('input[name="cleaning-severity"]:checked')?.value || 'THÔNG THƯỜNG';
      const outcomes = Array.from(document.querySelectorAll('input[name="cleaning-outcomes"]:checked')).map(cb => cb.value);

      if (severity === 'KHẨN CẤP') priority = 'KHẨN CẤP';
      else if (severity === 'CẦN XỬ LÝ NGAY') priority = 'CAO';
      else if (severity === 'CẦN XỬ LÝ SỚM') priority = 'TRUNG BÌNH';
      else priority = 'BÌNH THƯỜNG';

      categoryId = 'CLEANING';
      categoryName = 'Vệ sinh – Tạp vụ';
      title = `[Vệ sinh] ${cleaningAreas.join(', ') || roomName} - ${issuesChecked[0] || 'Yêu cầu vệ sinh'}`;

      description = `📌 PHẢN ÁNH VỆ SINH – TẠP VỤ:\n` +
        `• Vị trí: ${fullLocation} - ${roomName}\n` +
        `• Khu vực: ${cleaningAreas.join(', ') || 'Chung'}\n` +
        `• Tình trạng: ${issuesChecked.join(', ') || 'Xem mô tả'}\n` +
        `• Mức độ cần xử lý: ${severity}\n` +
        `• Mong muốn: ${outcomes.join(', ') || 'Đề nghị vệ sinh lại'}\n\n` +
        `📝 CHI TIẾT HIỆN TRƯỜNG:\n${rawDesc}`;

      extraMeta = {
        cleaningAreas, issuesList: issuesChecked, severity, desiredOutcomes: outcomes
      };
    } else if (this.selectedType === 'SECURITY') {
      if (!zoneName || !roomName) {
        Utils.showToast('Vui lòng chọn đầy đủ Cơ sở, Khu vực và Vị trí xảy ra sự việc!', 'warning');
        return;
      }

      const secDate = document.getElementById('security-date')?.value || '';
      const secTime = document.getElementById('security-time')?.value || '';
      const secShift = document.getElementById('security-shift')?.value || 'SÁNG';
      const secPlate = document.getElementById('security-plate')?.value?.trim() || '';
      const secPerson = document.getElementById('security-person')?.value?.trim() || '';
      const secWitness = document.getElementById('security-has-witness')?.value || 'NO';

      const issuesChecked = Array.from(document.querySelectorAll('input[name="security-issues"]:checked')).map(cb => cb.value);
      const rawDesc = document.getElementById('security-description')?.value?.trim() || '';

      if (!rawDesc && issuesChecked.length === 0) {
        Utils.showToast('Vui lòng chọn nội dung phản ánh hoặc mô tả chi tiết sự việc an ninh!', 'warning');
        return;
      }

      const severity = document.querySelector('input[name="security-severity"]:checked')?.value || 'GÓP Ý';
      const outcomes = Array.from(document.querySelectorAll('input[name="security-outcomes"]:checked')).map(cb => cb.value);

      if (severity === 'KHẨN CẤP') priority = 'KHẨN CẤP';
      else if (severity === 'KIỂM TRA SỚM') priority = 'CAO';
      else if (severity === 'CẦN NHẮC NHỞ') priority = 'TRUNG BÌNH';
      else priority = 'BÌNH THƯỜNG';

      categoryId = 'SECURITY';
      categoryName = 'An ninh – Bảo vệ';
      title = `[Bảo vệ] Ca ${secShift} - ${issuesChecked[0] || 'Phản ánh an ninh trật tự'}`;

      description = `📌 PHẢN ÁNH AN NINH & BẢO VỆ:\n` +
        `• Thời điểm: ${secDate} ${secTime ? `(${secTime})` : ''} - Ca trực: ${secShift}\n` +
        `• Vị trí: ${fullLocation} - ${roomName}\n` +
        `• Vấn đề: ${issuesChecked.join(', ') || 'Xem mô tả'}\n` +
        `• Mức độ: ${severity}\n` +
        `• Biển số xe / Người liên quan: ${secPlate || 'Không'} | ${secPerson || 'Không'}\n` +
        `• Nhân chứng: ${secWitness === 'YES' ? 'Có' : 'Không'}\n` +
        `• Mong muốn: ${outcomes.join(', ') || 'Kiểm tra xác minh'}\n\n` +
        `📝 CHI TIẾT SỰ VIỆC:\n${rawDesc}`;

      extraMeta = {
        incidentDate: secDate, incidentTime: secTime, incidentShift: secShift,
        licensePlate: secPlate, personDescription: secPerson, hasWitness: secWitness === 'YES',
        issuesList: issuesChecked, severity, desiredOutcomes: outcomes
      };
    }

    const submitBtn = document.getElementById('btn-submit-report');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-lg"></i><span>Đang xử lý & tạo mã yêu cầu...</span>';
    }
    this.isSubmitting = true;

    try {
      // 6. Upload files đính kèm
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

      // 7. Tạo Payload hoàn chỉnh
      const currentUser = AuthService.getCurrentUser();
      const deviceId = Utils.getOrCreateDeviceId();
      const techRequirement = (document.getElementById('rep-tech-requirement')?.value || '').trim();

      const payload = {
        reportType: this.selectedType,
        reportTypeName: typeObj.name,
        reportTypeEmoji: typeObj.emoji,
        senderName: senderName,
        senderCode: currentUser?.uid || '',
        senderDept: currentUser?.departmentName || '',
        senderPhone: senderPhone,
        senderEmail: senderEmail || currentUser?.email || '',
        deviceId: deviceId,
        categoryId: categoryId,
        categoryName: categoryName,
        priority: priority,
        location: fullLocation,
        room: roomName,
        title: title,
        description: description,
        techRequirement: techRequirement,
        technicalRequirement: techRequirement,
        attachments: uploadedAttachments,
        ...extraMeta
      };

      const result = await ApiService.submitReport(payload);

      if (result.success) {
        // Ghi nhận thời gian gửi chống spam
        const user = AuthService.getCurrentUser();
        if (!user || (!AuthService.isStaff() && !AuthService.isManager() && !AuthService.isAdmin())) {
          localStorage.setItem('nsg_last_report_submit_time', Date.now().toString());
        }

        // Đồng bộ realtime engine
        if (result.data && window.RealtimeService) {
          try {
            RealtimeService.handleIncomingReport(result.data);
          } catch (rtErr) {}
        }

        try {
          SoundService.playSuccess();
        } catch (sErr) {}

        this.renderSuccessModal(result.code, senderEmail, typeObj);
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
   * Đổi tài khoản tại Form
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
   * Hiển thị thông báo thành công trực quan
   */
  renderSuccessModal(code, senderEmail = '', typeObj = null) {
    const old = document.getElementById('report-success-modal');
    if (old) old.remove();

    const tName = typeObj?.name || 'Phản ánh';
    const tEmoji = typeObj?.emoji || '📋';

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
        <p class="text-xs text-slate-500 mb-4">Hệ thống đã tiếp nhận yêu cầu <strong>${tEmoji} ${tName}</strong> và chuyển tới bộ phận phụ trách xử lý.</p>

        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <span class="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Mã yêu cầu của bạn:</span>
          <span class="font-mono text-2xl font-black text-blue-900 tracking-wider select-all">${code}</span>
          <p class="text-[11px] text-blue-700/80 mt-1">Vui lòng lưu lại mã này để tra cứu tiến độ xử lý và đánh giá chất lượng.</p>
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
            <span>THEO DÕI TIẾN ĐỘ & TRAO ĐỔI TRỰC TUYẾN</span>
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
