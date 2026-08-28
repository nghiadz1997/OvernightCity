/**
 * NSG SUPPORT - REPORT SUBMISSION FORM PAGE
 * Form gửi phản ánh đầy đủ trường theo yêu cầu mục 6 & 45 chống spam
 * Hỗ trợ bộ chọn phân cấp 3 tầng: Cơ sở -> Khu vực -> Phòng
 */

const ReportFormPage = {
  selectedFiles: [],
  isSubmitting: false,

  async init() {
    // 1. Tải danh sách phòng ban động
    try {
      const depts = await ApiService.loadDepartments();
      const deptSelect = document.getElementById('rep-sender-dept');
      if (deptSelect && depts && depts.length > 0) {
        const user = AuthService.getCurrentUser();
        const currentVal = deptSelect.value;
        deptSelect.innerHTML = `
          <option value="">-- Chọn đơn vị --</option>
          ${depts.map(d => `<option value="${d}" ${user?.departmentName === d || currentVal === d ? 'selected' : ''}>${d}</option>`).join('')}
          <option value="Khác">Khác / Bên ngoài</option>
        `;
      }
    } catch (e) {
      console.warn('Lỗi nạp departments:', e);
    }

    // 2. Tải danh mục thiết bị động
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

    setTimeout(() => this.init(), 50);

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

            <!-- Thông tin người gửi (Ẩn tự động lấy từ phiên đăng nhập) -->
            <input type="hidden" id="rep-sender-name" value="${user?.displayName || 'Cán bộ / Sinh viên'}">
            <input type="hidden" id="rep-sender-phone" value="${user?.phone || ''}">
            <input type="hidden" id="rep-sender-dept" value="${user?.departmentName || 'Chung'}">
            <input type="hidden" id="rep-sender-code" value="${user?.staffCode || ''}">

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

      // 2. Lấy dữ liệu form
      const catSelect = document.getElementById('rep-category-id');
      const catName = catSelect.options[catSelect.selectedIndex]?.getAttribute('data-name') || 'Khác';

      const payload = {
        senderName: document.getElementById('rep-sender-name').value,
        senderCode: document.getElementById('rep-sender-code').value,
        senderDept: document.getElementById('rep-sender-dept').value,
        senderPhone: document.getElementById('rep-sender-phone').value,
        categoryId: catSelect.value,
        categoryName: catName,
        priority: document.getElementById('rep-priority').value,
        location: fullLocation,
        room: roomName,
        title: document.getElementById('rep-title').value,
        description: document.getElementById('rep-description').value,
        attachments: uploadedAttachments
      };

      const result = await ApiService.submitReport(payload);

      if (result.success) {
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

        this.renderSuccessModal(result.code);
      } else {
        throw new Error(result.message || 'Lỗi gửi phản ánh.');
      }
    } catch (err) {
      Utils.showToast(err.message || 'Không thể gửi phản ánh. Vui lòng kiểm tra lại kết nối.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-lg"></i><span>GỬI PHẢN ÁNH NGAY</span>';
      }
      this.isSubmitting = false;
    }
  },

  /**
   * Hiển thị thông báo thành công theo đúng yêu cầu mục 6
   */
  renderSuccessModal(code) {
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
        <p class="text-xs text-slate-500 mb-5">Hệ thống đã lưu vào Cloud Firestore và chuyển thông tin tới Trưởng bộ phận Kỹ thuật.</p>

        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <span class="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Mã yêu cầu của bạn:</span>
          <span class="font-mono text-2xl font-black text-blue-900 tracking-wider select-all">${code}</span>
          <p class="text-[11px] text-blue-700/80 mt-1">Vui lòng lưu lại mã này để tra cứu tình trạng xử lý.</p>
        </div>

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
