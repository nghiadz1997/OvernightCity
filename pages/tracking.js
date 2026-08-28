/**
 * NSG SUPPORT - PUBLIC TICKET TRACKING PAGE
 * Tra cứu tiến độ phản ánh theo yêu cầu mục 8 & 44
 */

const TrackingPage = {
  currentReport: null,
  selectedRating: 5,

  render() {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const prefilledCode = urlParams.get('code') || '';

    // Nếu có mã trên URL thì tự động tìm kiếm ngay
    if (prefilledCode) {
      setTimeout(() => {
        const input = document.getElementById('tracking-code-input');
        if (input) {
          input.value = prefilledCode;
          TrackingPage.searchReport(prefilledCode);
        }
      }, 50);
    }

    return `
      <div class="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <a href="#/" class="hover:text-blue-600">Trang chủ</a>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span class="text-slate-900 font-semibold">Theo dõi tình trạng phản ánh</span>
        </nav>

        <!-- Search Box Card -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 mb-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 mb-2">TRA CỨU TIẾN ĐỘ PHẢN ÁNH</h1>
          <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            Nhập Mã yêu cầu đã nhận khi gửi phiếu (ví dụ: <span class="font-mono font-bold text-blue-600">PYC-2026-000001</span>) để theo dõi tiến độ thời gian thực.
          </p>

          <form class="max-w-md mx-auto flex items-center gap-2" onsubmit="TrackingPage.handleSearchSubmit(event)">
            <input type="text" id="tracking-code-input" class="flex-1 text-sm sm:text-base font-mono font-bold p-3.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400" placeholder="Nhập mã phiếu (PYC-...)" value="${prefilledCode}" required>
            <button type="submit" id="btn-tracking-search" class="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0">
              <i class="fa-solid fa-search"></i>
              <span>Tra cứu</span>
            </button>
          </form>
        </div>

        <!-- Result Container -->
        <div id="tracking-result-container">
          <!-- Placeholder State -->
          <div class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-file-waveform text-5xl text-slate-300 mb-3 block"></i>
            <p class="text-sm font-medium">Vui lòng nhập mã phiếu và nhấn Tra cứu để xem chi tiết.</p>
          </div>
        </div>
      </div>
    `;
  },

  async handleSearchSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('tracking-code-input').value.trim();
    if (!code) return;
    await this.searchReport(code);
  },

  async searchReport(code) {
    const container = document.getElementById('tracking-result-container');
    const searchBtn = document.getElementById('btn-tracking-search');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    }

    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <i class="fa-solid fa-circle-notch fa-spin text-4xl text-blue-600 mb-3 block"></i>
        <p class="text-sm font-semibold text-slate-700">Đang tìm kiếm thông tin phiếu yêu cầu...</p>
      </div>
    `;

    try {
      // 1. Kiểm tra cache realtime trước
      let report = RealtimeService.reports.find(r => r.code?.toUpperCase() === code.toUpperCase());

      // 2. Nếu không có, gọi Backend API
      if (!report) {
        const res = await ApiService.trackReport(code);
        if (res.success && res.data) {
          report = res.data;
        }
      }

      if (!report) {
        throw new Error(`Không tìm thấy dữ liệu cho mã phiếu "${code}". Vui lòng kiểm tra lại.`);
      }

      this.currentReport = report;
      this.renderReportDetail(report);
    } catch (err) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl p-8 text-center border border-red-200 shadow-sm">
          <div class="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-3">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-1">Không tìm thấy phiếu yêu cầu</h3>
          <p class="text-sm text-slate-600 mb-4">${err.message}</p>
          <button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold" onclick="document.getElementById('tracking-code-input').focus()">
            Thử nhập lại mã
          </button>
        </div>
      `;
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fa-solid fa-search"></i><span>Tra cứu</span>';
      }
    }
  },

  renderReportDetail(report) {
    const container = document.getElementById('tracking-result-container');
    const status = report.status || 'CHỜ PHÂN CÔNG';
    const isCompleted = status === 'HOÀN THÀNH';
    const deadlineInfo = Utils.getDeadlineStatus(report.deadline, isCompleted);

    // Xác định thứ tự bước trong Timeline mục 8:
    // ✓ Đã tiếp nhận (MỚI, CHỜ PHÂN CÔNG)
    // ✓ Đã phân công (ĐÃ PHÂN CÔNG)
    // ✓ Đang xử lý (ĐANG XỬ LÝ)
    // ○ Chờ nghiệm thu (CHỜ NGHIỆM THU)
    // ○ Hoàn thành (HOÀN THÀNH)
    const stepOrder = ['CHỜ PHÂN CÔNG', 'ĐÃ PHÂN CÔNG', 'ĐANG XỬ LÝ', 'CHỜ NGHIỆM THU', 'HOÀN THÀNH'];
    const currentStepIndex = stepOrder.indexOf(status) >= 0 ? stepOrder.indexOf(status) : 0;

    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in space-y-6">
        <!-- Top Status Bar -->
        <div class="bg-slate-900 text-white p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-base font-black px-3 py-1 bg-blue-600 rounded-lg">${report.code}</span>
              ${Utils.renderPriorityBadge(report.priority)}
            </div>
            <h2 class="text-xl font-bold mt-2">${report.title}</h2>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block mb-1">Trạng thái hiện tại:</span>
            ${Utils.renderStatusBadge(report.status, report.isOverdue)}
          </div>
        </div>

        <!-- Timeline 5 bước chuẩn mục 8 -->
        <div class="px-6 py-4 bg-slate-50 border-y border-slate-200">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Tiến trình giải quyết sự cố</h3>
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-semibold">
            ${this.renderTimelineStep('Đã tiếp nhận', currentStepIndex >= 0, 'fa-file-circle-check')}
            ${this.renderTimelineStep('Đã phân công', currentStepIndex >= 1, 'fa-user-check')}
            ${this.renderTimelineStep('Đang xử lý', currentStepIndex >= 2, 'fa-screwdriver-wrench')}
            ${this.renderTimelineStep('Chờ nghiệm thu', currentStepIndex >= 3, 'fa-clipboard-check')}
            ${this.renderTimelineStep('Hoàn thành', currentStepIndex >= 4, 'fa-circle-check')}
          </div>
        </div>

        <!-- Detailed Information Grid -->
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <!-- Cột thông tin sự cố -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-1">Chi tiết phản ánh</h4>
            <div><span class="text-slate-500">Người gửi:</span> <strong class="text-slate-800">${report.senderName} (${report.senderDept || 'Khách'})</strong></div>
            <div><span class="text-slate-500">Số điện thoại:</span> <strong class="text-slate-800">${report.senderPhone}</strong></div>
            <div><span class="text-slate-500">Địa điểm:</span> <strong class="text-slate-800">${report.location} ${report.room ? `- ${report.room}` : ''}</strong></div>
            <div><span class="text-slate-500">Danh mục:</span> <strong class="text-slate-800">${report.categoryName || 'Kỹ thuật'}</strong></div>
            <div><span class="text-slate-500">Ngày gửi:</span> <strong class="text-slate-800">${Utils.formatDateTime(report.createdAt)}</strong></div>
            <div><span class="text-slate-500">Nội dung mô tả:</span>
              <p class="mt-1 bg-slate-50 p-3 rounded-lg border text-slate-700 leading-relaxed">${report.description}</p>
            </div>
          </div>

          <!-- Cột thông tin xử lý -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-1">Đơn vị tiếp nhận & xử lý</h4>
            <div><span class="text-slate-500">Kỹ thuật viên phụ trách:</span> <strong class="text-indigo-700">${report.assignedToName || 'Đang điều phối nhân sự'}</strong></div>
            <div><span class="text-slate-500">Người giao việc:</span> <strong class="text-slate-800">${report.assignedByName || 'Trưởng phòng Kỹ thuật'}</strong></div>
            <div><span class="text-slate-500">Hạn chót (Deadline):</span> <strong class="text-slate-800">${report.deadline ? Utils.formatDateTime(report.deadline) : 'Theo quy định'} (${deadlineInfo.label})</strong></div>
            <div><span class="text-slate-500">Tiến độ cập nhật mới nhất:</span>
              <p class="mt-1 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-indigo-950 font-medium">
                ${report.latestNote || report.completionNote || 'Hệ thống đã ghi nhận phiếu và chuyển tới bộ phận kỹ thuật để xử lý.'}
              </p>
            </div>
          </div>
        </div>

        <!-- 5-Star Rating Form if Completed (Mục 44) -->
        ${isCompleted ? `
          <div class="mx-6 mb-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
            <div class="flex items-center gap-3 mb-2">
              <i class="fa-solid fa-award text-amber-500 text-2xl"></i>
              <div>
                <h3 class="font-extrabold text-slate-900 text-base">ĐÁNH GIÁ CHẤT LƯỢNG DỊCH VỤ</h3>
                <p class="text-xs text-slate-600">Sự cố của bạn đã được xử lý xong. Hãy cho chúng tôi biết mức độ hài lòng của bạn!</p>
              </div>
            </div>

            ${report.rating ? `
              <div class="bg-white/80 p-4 rounded-xl border border-amber-200 mt-3 text-xs">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-slate-800">Đánh giá của bạn:</span>
                  <div class="text-amber-500 text-sm">
                    ${[1, 2, 3, 4, 5].map(s => `<i class="fa-solid fa-star ${s <= report.rating ? '' : 'text-slate-300'}"></i>`).join('')}
                  </div>
                  <strong class="text-slate-900 font-bold">(${report.rating} / 5 sao)</strong>
                </div>
                <p class="text-slate-700 italic">"${report.feedback || 'Không có ý kiến thêm.'}"</p>
              </div>
            ` : `
              <form class="space-y-3 mt-4" onsubmit="TrackingPage.handleFeedbackSubmit(event, '${report.code}')">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold text-slate-700">Mức độ hài lòng:</span>
                  <div class="flex items-center gap-1 text-2xl text-slate-300 cursor-pointer" id="rating-stars">
                    ${[1, 2, 3, 4, 5].map(s => `
                      <i class="fa-solid fa-star text-amber-400 hover:scale-110 transition-transform" data-star="${s}" onclick="TrackingPage.setRating(${s})"></i>
                    `).join('')}
                  </div>
                  <span id="rating-label" class="text-xs font-bold text-amber-600 ml-2">Rất hài lòng (5 sao)</span>
                </div>

                <div>
                  <textarea id="feedback-comment" rows="2" class="w-full text-xs p-3 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white" placeholder="Ý kiến phản hồi thêm về thái độ kỹ thuật viên, chất lượng thiết bị sau sửa chữa..."></textarea>
                </div>

                <button type="submit" class="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                  Gửi đánh giá dịch vụ
                </button>
              </form>
            `}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderTimelineStep(title, isDone, icon) {
    return `
      <div class="flex items-center gap-2 p-2.5 rounded-xl border ${isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}">
        <i class="fa-solid ${isDone ? 'fa-circle-check text-emerald-600' : icon} text-base shrink-0"></i>
        <span class="font-bold truncate">${title}</span>
      </div>
    `;
  },

  setRating(stars) {
    this.selectedRating = stars;
    const starEls = document.querySelectorAll('#rating-stars i');
    starEls.forEach(el => {
      const s = parseInt(el.getAttribute('data-star'), 10);
      if (s <= stars) {
        el.className = 'fa-solid fa-star text-amber-400 hover:scale-110 transition-transform';
      } else {
        el.className = 'fa-solid fa-star text-slate-300 hover:scale-110 transition-transform';
      }
    });

    const labels = {
      1: 'Rất không hài lòng (1 sao)',
      2: 'Chưa hài lòng (2 sao)',
      3: 'Bình thường (3 sao)',
      4: 'Hài lòng (4 sao)',
      5: 'Rất hài lòng (5 sao)'
    };
    document.getElementById('rating-label').innerText = labels[stars];
  },

  async handleFeedbackSubmit(e, code) {
    e.preventDefault();
    const feedback = document.getElementById('feedback-comment').value;

    try {
      await ApiService.submitFeedback(code, this.selectedRating, feedback);
      Utils.showToast('Cảm ơn bạn đã gửi đánh giá chất lượng dịch vụ!', 'success');
      SoundService.playSuccess();
      await this.searchReport(code);
    } catch (err) {
      Utils.showToast('Lỗi gửi đánh giá: ' + err.message, 'error');
    }
  }
};

window.TrackingPage = TrackingPage;
