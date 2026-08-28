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
          <div class="flex items-center gap-3 flex-wrap">
            <button type="button" onclick="document.getElementById('tracking-chat-section')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('tracking-chat-input')?.focus();" class="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 border border-white/20">
              <i class="fa-solid fa-comments text-amber-300 text-sm"></i>
              <span>💬 NHẮN TIN VỚI KỸ THUẬT</span>
            </button>
            <div class="text-right">
              <span class="text-xs text-slate-400 block mb-1">Trạng thái hiện tại:</span>
              ${Utils.renderStatusBadge(report.status, report.isOverdue)}
            </div>
          </div>
        </div>

        <!-- Banner mời gọi nhắn tin trực tiếp -->
        <div class="mx-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-2xs">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
              <i class="fa-solid fa-headset"></i>
            </div>
            <div>
              <h4 class="font-black text-xs text-blue-950 uppercase tracking-wide">Bạn cần hỗ trợ thêm hoặc có việc GẤP?</h4>
              <p class="text-xs text-blue-800">Nhắn tin trực tiếp với Kỹ thuật viên & Quản trị viên ở khung chat bên dưới.</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('tracking-chat-section')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('tracking-chat-input')?.focus();" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>Cuộn xuống Khung Chat</span>
            <i class="fa-solid fa-arrow-down"></i>
          </button>
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
            <div><span class="text-slate-500">Số điện thoại:</span> <strong class="text-slate-800">${report.senderPhone || 'Không có'}</strong></div>
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
            <div><span class="text-slate-500">Người giao việc:</span> <strong class="text-slate-800">${report.assignedByName || 'Trưởng phòng'}</strong></div>
            <div><span class="text-slate-500">Hạn chót (Deadline):</span> <strong class="text-slate-800">${report.deadline ? Utils.formatDateTime(report.deadline) : 'Theo quy định'} (${deadlineInfo.label})</strong></div>
            <div><span class="text-slate-500">Tiến độ cập nhật mới nhất:</span>
              <p class="mt-1 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-indigo-950 font-medium">
                ${report.latestNote || report.completionNote || 'Hệ thống đã ghi nhận phiếu và chuyển tới bộ phận kỹ thuật để xử lý.'}
              </p>
            </div>
          </div>
        </div>

        <!-- Live Chat Section: Trao đổi & Nhắn tin trực tiếp với Kỹ thuật / Quản trị -->
        <div id="tracking-chat-section" class="mx-6 mb-6 bg-slate-50 border-2 border-indigo-200 rounded-3xl overflow-hidden shadow-md">
          <!-- Chat Header -->
          <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-4 sm:p-5 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl text-white">
                <i class="fa-solid fa-comments"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-sm sm:text-base tracking-tight">
                  KHUNG TRAO ĐỔI VỚI BỘ PHẬN KỸ THUẬT & QUẢN TRỊ
                </h3>
                <p class="text-[11px] text-blue-100">Kênh nhắn tin trực tuyến. Có thể gửi yêu cầu gấp để kỹ thuật phản hồi xử lý ngay.</p>
              </div>
            </div>
          </div>

          <!-- Messages Container -->
          <div id="tracking-chat-messages" class="p-4 sm:p-5 space-y-3.5 max-h-[380px] overflow-y-auto bg-white/70">
            <div class="text-center py-6 text-slate-400 text-xs">
              <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang tải tin nhắn trao đổi...
            </div>
          </div>

          <!-- Chat Form -->
          <form id="tracking-chat-form" class="p-4 bg-slate-100/90 border-t border-slate-200 space-y-2.5" onsubmit="TrackingPage.handleSendMessage(event)">
            <div class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <textarea id="tracking-chat-input" rows="2" class="w-full text-xs p-3 pr-10 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-medium placeholder:text-slate-400" placeholder="Nhập câu hỏi hoặc thông tin nhắn cho bên kỹ thuật..." required onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();TrackingPage.handleSendMessage(event);}"></textarea>
              </div>
              <button type="submit" id="btn-tracking-send" class="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                <i class="fa-solid fa-paper-plane"></i>
                <span>GỬI TIN</span>
              </button>
            </div>

            <!-- Urgent Checkbox Toggle -->
            <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
              <label class="flex items-center gap-2 cursor-pointer select-none text-red-600 font-bold bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-xl border border-red-200 transition-colors">
                <input type="checkbox" id="tracking-chat-urgent" class="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer">
                <span>🚨 Đánh dấu yêu cầu gấp</span>
              </label>
              <span class="text-[11px] text-slate-400">Nhấn <kbd class="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Enter</kbd> để gửi</span>
            </div>
          </form>
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

    // Kích hoạt Realtime Chat Listener cho phiếu này
    setTimeout(() => this.initChatListener(report), 100);
  },

  renderTimelineStep(title, isDone, icon) {
    return `
      <div class="flex items-center gap-2 p-2.5 rounded-xl border ${isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}">
        <i class="fa-solid ${isDone ? 'fa-circle-check text-emerald-600' : icon} text-base shrink-0"></i>
        <span class="font-bold truncate">${title}</span>
      </div>
    `;
  },

  // ==========================================
  // REALTIME LIVE CHAT GIỮA USER VÀ KỸ THUẬT
  // ==========================================
  chatUnsubscribe: null,
  chatPollInterval: null,
  currentComments: [],
  lastCommentsCount: 0,

  initChatListener(report) {
    // 1. Dọn dẹp listener và timer cũ
    if (this.chatUnsubscribe) {
      this.chatUnsubscribe();
      this.chatUnsubscribe = null;
    }
    if (this.chatPollInterval) {
      clearInterval(this.chatPollInterval);
      this.chatPollInterval = null;
    }

    const code = report.code;
    const targetId = report.id || code;
    this.currentComments = [];
    this.lastCommentsCount = 0;

    // 2. Tải tin nhắn ngay lập tức
    this.pollLatestComments(code, report);

    // 3. Thiết lập realtime onSnapshot từ Firestore
    if (window.firebase && window.firebase.firestore) {
      const db = window.firebase.firestore();
      try {
        this.chatUnsubscribe = db.collection('comments')
          .where('targetCode', '==', code)
          .onSnapshot(snap => {
            let comments = [];
            snap.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
            comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            this.handleIncomingComments(comments, report);
          }, err => {
            console.warn('onSnapshot comments fallback to poll:', err);
          });
      } catch (e) {
        console.warn('Firestore onSnapshot error:', e);
      }
    }

    // 4. Thiết lập polling định kỳ mỗi 2.5 giây đảm bảo tin nhắn luôn nhảy tự động 100% không cần reload
    this.chatPollInterval = setInterval(() => {
      this.pollLatestComments(code, report);
    }, 2500);
  },

  async pollLatestComments(code, report) {
    try {
      const comments = await ApiService.getComments(code);
      if (comments) {
        this.handleIncomingComments(comments, report);
      }
    } catch (e) {
      console.warn('pollLatestComments error:', e);
    }
  },

  handleIncomingComments(comments, report) {
    if (!comments) return;

    // Phát âm thanh khi có tin nhắn mới từ kỹ thuật viên / quản lý
    if (comments.length > this.lastCommentsCount && this.lastCommentsCount > 0) {
      const latest = comments[comments.length - 1];
      if (latest && latest.isStaff) {
        SoundService.playNotification();
        Utils.showToast(`💬 Phản hồi mới từ ${latest.authorName}: "${latest.content}"`, 'info');
      }
    }
    this.lastCommentsCount = comments.length;
    this.currentComments = comments;

    this.renderChatMessages(comments, report);
  },

  renderChatMessages(comments, report) {
    const box = document.getElementById('tracking-chat-messages');
    if (!box) return;

    if (!comments || comments.length === 0) {
      box.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs space-y-2">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mx-auto">
            <i class="fa-regular fa-comment-dots"></i>
          </div>
          <p class="font-bold text-slate-700">Chưa có tin nhắn nào</p>
          <p class="text-slate-400 max-w-xs mx-auto">Hãy gửi tin nhắn bên dưới nếu bạn có câu hỏi hoặc cần yêu cầu hỗ trợ gấp với Kỹ thuật viên.</p>
        </div>
      `;
      return;
    }

    box.innerHTML = comments.map(c => {
      const isStaff = !!c.isStaff;
      const isUrgent = !!c.isUrgent;
      const roleBadgeHtml = Utils.renderRoleBadge(c.authorRole || (isStaff ? 'STAFF' : 'USER'));

      return `
        <div class="flex gap-2.5 ${!isStaff ? 'flex-row-reverse' : ''} animate-fade-in">
          <div class="w-8 h-8 rounded-full ${!isStaff ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'} flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            ${isStaff ? '<i class="fa-solid fa-screwdriver-wrench text-[11px]"></i>' : '<i class="fa-solid fa-user text-[11px]"></i>'}
          </div>
          <div class="max-w-[82%] space-y-1">
            <div class="flex items-center gap-1.5 ${!isStaff ? 'justify-end' : ''} text-[11px]">
              <span class="font-extrabold text-slate-900">${c.authorName || (isStaff ? 'Kỹ thuật viên' : 'Bạn')}</span>
              ${roleBadgeHtml}
              <span class="text-slate-400 text-[10px]">${Utils.timeAgo(c.createdAt)}</span>
            </div>
            
            <div class="p-3 rounded-2xl text-xs leading-relaxed ${
              isUrgent 
                ? 'bg-red-50 text-red-950 border-2 border-red-400 shadow-sm' 
                : (!isStaff 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-xs' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-2xs')
            }">
              ${isUrgent ? `
                <div class="flex items-center gap-1 text-[11px] font-black text-red-700 mb-1">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span>YÊU CẦU HỖ TRỢ GẤP:</span>
                </div>
              ` : ''}
              ${c.content}
            </div>
          </div>
        </div>
      `;
    }).join('');

    box.scrollTop = box.scrollHeight;
  },

  async handleSendMessage(e) {
    e.preventDefault();
    if (!this.currentReport) return;

    const input = document.getElementById('tracking-chat-input');
    const urgentCheck = document.getElementById('tracking-chat-urgent');
    const btn = document.getElementById('btn-tracking-send');

    const content = (input ? input.value : '').trim();
    const isUrgent = urgentCheck ? urgentCheck.checked : false;

    if (!content) return;

    // 1. Optimistic Update: Thêm ngay tin nhắn vào giao diện tức thì (0ms)
    const optimisticMsg = {
      id: 'temp_' + Date.now(),
      targetCode: this.currentReport.code,
      content: content,
      authorName: this.currentReport.senderName || 'Bạn',
      authorRole: 'USER',
      isUrgent: isUrgent,
      isStaff: false,
      createdAt: new Date().toISOString()
    };
    this.currentComments.push(optimisticMsg);
    this.lastCommentsCount = this.currentComments.length;
    this.renderChatMessages(this.currentComments, this.currentReport);

    if (input) input.value = '';
    if (urgentCheck) urgentCheck.checked = false;
    SoundService.playSuccess();

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    }

    try {
      await ApiService.addComment(this.currentReport.id || this.currentReport.code, 'REPORT', {
        targetCode: this.currentReport.code,
        content: content,
        authorName: this.currentReport.senderName || 'Người gửi phản ánh',
        authorPhone: this.currentReport.senderPhone || '',
        authorRole: 'USER',
        isUrgent: isUrgent,
        isStaff: false
      });

      Utils.showToast(isUrgent ? '🚨 Đã gửi tin nhắn GẤP tới bộ phận kỹ thuật!' : 'Đã gửi tin nhắn thành công!', 'success');
      
      // Đồng bộ lại từ server
      setTimeout(() => this.pollLatestComments(this.currentReport.code, this.currentReport), 500);

      // Focus lại ô nhập
      if (input) input.focus();
    } catch (err) {
      Utils.showToast('Lỗi gửi tin nhắn: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>GỬI TIN</span>';
      }
    }
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
