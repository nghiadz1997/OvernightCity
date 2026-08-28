/**
 * NSG SUPPORT - SYSTEM SETTINGS PAGE
 * Cấu hình hệ thống, SLA, Tích hợp 2 Bot Telegram API (Báo sự cố & Nghiệm thu công việc)
 */

const SettingsPage = {
  config: {
    botToken: '', // Bot 1: Báo sự cố mới
    chatId: '',
    reviewBotToken: '', // Bot 2: Nghiệm thu công việc
    reviewChatId: '',
    isEnabled: true,
    notifyOnNewReport: true,
    notifyOnUrgent: true,
    notifyOnAssign: true,
    notifyOnReview: true,
    notifyOnComplete: true
  },

  async init() {
    console.log('[SettingsPage] Initializing settings...');
    try {
      this.config = await ApiService.loadTelegramConfig();
    } catch (e) {
      this.config = ApiService.getTelegramConfig();
    }
    this.populateFields();
  },

  populateFields() {
    const tokenInput = document.getElementById('tele-bot-token');
    const chatIdInput = document.getElementById('tele-chat-id');
    const reviewTokenInput = document.getElementById('tele-review-bot-token');
    const reviewChatIdInput = document.getElementById('tele-review-chat-id');
    const isEnabledToggle = document.getElementById('tele-enable-toggle');
    const optNewReport = document.getElementById('tele-opt-new-report');
    const optUrgent = document.getElementById('tele-opt-urgent');
    const optAssign = document.getElementById('tele-opt-assign');
    const optReview = document.getElementById('tele-opt-review');

    if (tokenInput) tokenInput.value = this.config.botToken || '';
    if (chatIdInput) chatIdInput.value = this.config.chatId || '';
    if (reviewTokenInput) reviewTokenInput.value = this.config.reviewBotToken || '';
    if (reviewChatIdInput) reviewChatIdInput.value = this.config.reviewChatId || '';
    if (isEnabledToggle) isEnabledToggle.checked = this.config.isEnabled !== false;
    if (optNewReport) optNewReport.checked = this.config.notifyOnNewReport !== false;
    if (optUrgent) optUrgent.checked = this.config.notifyOnUrgent !== false;
    if (optAssign) optAssign.checked = this.config.notifyOnAssign !== false;
    if (optReview) optReview.checked = this.config.notifyOnReview !== false;
  },

  render() {
    setTimeout(() => this.init(), 50);

    return `
      <div class="space-y-6 max-w-4xl mx-auto animate-fade-in p-2 sm:p-4">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                ⚙️ Cấu hình Tích hợp Toàn diện
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-sliders text-blue-600"></i>
              <span>CÀI ĐẶT HỆ THỐNG & TELEGRAM BOTS</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Cấu hình 2 Bot Telegram: Tiếp nhận phản ánh sự cố & Báo cáo Nghiệm thu kèm hình ảnh.</p>
          </div>

          <button type="button" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="SettingsPage.saveSettings()">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>LƯU TẤT CẢ CẤU HÌNH</span>
          </button>
        </div>

        <!-- Section 1: Telegram Bot 1 - Tiếp nhận sự cố mới -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 shrink-0">
                <i class="fa-brands fa-telegram"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>BOT 1: Tiếp nhận phản ánh sự cố mới</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-700 border border-sky-200">[NSG SUPPORT] CÓ PHẢN ÁNH SỰ CỐ MỚI!</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Tự động gửi thông báo kèm hình ảnh sự cố ban đầu khi Người dùng / Giảng viên gửi phản ánh.</p>
              </div>
            </div>

            <button type="button" id="btn-test-tele-1" class="px-4 py-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs rounded-xl border border-sky-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs" onclick="SettingsPage.testTelegram()">
              <i class="fa-solid fa-paper-plane text-sky-600"></i>
              <span>Test Bot 1</span>
            </button>
          </div>

          <!-- Form inputs Token & Chat ID Bot 1 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Bot 1 Token (Báo sự cố) <span class="text-red-500">*</span></span>
                <button type="button" class="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer" onclick="SettingsPage.toggleTokenVisibility('tele-bot-token', 'icon-toggle-token-1')">
                  <i class="fa-solid fa-eye mr-1" id="icon-toggle-token-1"></i><span>Ẩn/Hiện</span>
                </button>
              </label>
              <div class="relative">
                <input type="password" id="tele-bot-token" class="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 font-mono text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Token Bot 1 từ @BotFather...">
              </div>
            </div>

            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5">
                Bot 1 Chat ID / Nhóm tiếp nhận <span class="text-red-500">*</span>
              </label>
              <input type="text" id="tele-chat-id" class="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 font-mono text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Ví dụ: -1001234567890 hoặc 123456789">
            </div>
          </div>
        </div>

        <!-- Section 2: Telegram Bot 2 - Nghiệm thu công việc & Ảnh hoàn tất -->
        <div class="bg-white rounded-3xl border border-purple-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-5 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-md shadow-purple-600/20 shrink-0">
                <i class="fa-solid fa-clipboard-check"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>BOT 2: Nghiệm thu công việc (KTV hoàn tất)</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">[NSG SUPPORT] BÁO CÁO HOÀN TẤT & CHỜ NGHIỆM THU!</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Tiếp nhận báo cáo và hình ảnh kết quả thực tế sau khi KTV hoàn thành hiện trường.</p>
              </div>
            </div>

            <button type="button" id="btn-test-tele-2" class="px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs" onclick="SettingsPage.testReviewTelegram()">
              <i class="fa-solid fa-paper-plane text-purple-600"></i>
              <span>Test Bot 2</span>
            </button>
          </div>

          <!-- Form inputs Token & Chat ID Bot 2 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Bot 2 Token (Nghiệm thu)</span>
                <button type="button" class="text-purple-600 hover:underline font-bold text-[11px] cursor-pointer" onclick="SettingsPage.toggleTokenVisibility('tele-review-bot-token', 'icon-toggle-token-2')">
                  <i class="fa-solid fa-eye mr-1" id="icon-toggle-token-2"></i><span>Ẩn/Hiện</span>
                </button>
              </label>
              <div class="relative">
                <input type="password" id="tele-review-bot-token" class="w-full p-3 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 font-mono text-xs bg-purple-50/30 focus:bg-white transition-colors" placeholder="Để trống nếu dùng chung Token Bot 1">
              </div>
              <p class="text-[11px] text-slate-400 mt-1.5">Để trống ô này để tự động dùng chung Token với Bot 1.</p>
            </div>

            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5">
                Bot 2 Chat ID (Nhóm Nghiệm thu / Trưởng phòng)
              </label>
              <input type="text" id="tele-review-chat-id" class="w-full p-3 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 font-mono text-xs bg-purple-50/30 focus:bg-white transition-colors" placeholder="Để trống nếu dùng chung Chat ID Bot 1">
              <p class="text-[11px] text-slate-400 mt-1.5">Để trống ô này để tự động dùng chung Chat ID với Bot 1.</p>
            </div>
          </div>
        </div>

        <!-- Tùy chọn sự kiện -->
        <div class="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Cấu hình nhận thông báo tự động:</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label class="flex items-center gap-2.5 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" id="tele-enable-toggle" checked class="w-4 h-4 text-sky-600 rounded">
              <span>Bật hệ thống thông báo Telegram Realtime</span>
            </label>
            <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" id="tele-opt-new-report" checked class="w-4 h-4 text-sky-600 rounded">
              <span>Bắn tin khi có phản ánh sự cố mới (Bot 1)</span>
            </label>
            <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" id="tele-opt-review" checked class="w-4 h-4 text-purple-600 rounded">
              <span>Bắn tin kèm ảnh khi KTV báo cáo nghiệm thu (Bot 2)</span>
            </label>
            <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" id="tele-opt-assign" checked class="w-4 h-4 text-sky-600 rounded">
              <span>Bắn tin khi Trưởng phòng/Phó phòng phân công KTV</span>
            </label>
          </div>
        </div>

        <!-- Section 3: SLA Response Time Standards -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
            <span>Thời gian cam kết xử lý sự cố (SLA)</span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div class="p-4 rounded-2xl border border-red-200 bg-red-50/60 text-center">
              <span class="font-black text-red-700 block mb-2 text-sm">🔴 KHẨN CẤP</span>
              <input type="number" value="2" class="w-full p-2.5 rounded-xl border border-red-300 font-extrabold text-center text-sm bg-white" readonly>
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 2 Giờ</span>
            </div>
            <div class="p-4 rounded-2xl border border-orange-200 bg-orange-50/60 text-center">
              <span class="font-black text-orange-700 block mb-2 text-sm">🟠 CAO</span>
              <input type="number" value="8" class="w-full p-2.5 rounded-xl border border-orange-300 font-extrabold text-center text-sm bg-white" readonly>
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 8 Giờ (Trong ngày)</span>
            </div>
            <div class="p-4 rounded-2xl border border-yellow-200 bg-yellow-50/60 text-center">
              <span class="font-black text-yellow-800 block mb-2 text-sm">🟡 TRUNG BÌNH</span>
              <input type="number" value="24" class="w-full p-2.5 rounded-xl border border-yellow-300 font-extrabold text-center text-sm bg-white" readonly>
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 24 Giờ</span>
            </div>
            <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 text-center">
              <span class="font-black text-blue-700 block mb-2 text-sm">🟢 BÌNH THƯỜNG</span>
              <input type="number" value="48" class="w-full p-2.5 rounded-xl border border-blue-300 font-extrabold text-center text-sm bg-white" readonly>
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 48 Giờ (2 ngày)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  toggleTokenVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
      input.type = 'password';
      if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
  },

  async testTelegram() {
    const tokenInput = document.getElementById('tele-bot-token');
    const chatIdInput = document.getElementById('tele-chat-id');
    const btn = document.getElementById('btn-test-tele-1');

    const botToken = tokenInput ? tokenInput.value.trim() : '';
    const chatId = chatIdInput ? chatIdInput.value.trim() : '';

    if (!botToken || !chatId) {
      Utils.showToast('Vui lòng nhập Bot 1 Token và Chat ID trước khi kiểm tra!', 'warning', 4000);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang test...';
    }

    Utils.showToast('Đang gửi tin nhắn thử nghiệm tới Bot 1 (Báo sự cố)...', 'info', 3000);

    try {
      const res = await ApiService.testTelegram(botToken, chatId);
      if (res.success) {
        SoundService.playSuccess();
        Utils.showToast('✅ GỬI THÀNH CÔNG TỚI BOT 1! Hãy kiểm tra Telegram.', 'success', 5000);
        this.saveSettings(false);
      } else {
        throw new Error(res.error || 'Kiểm tra lại Token hoặc Chat ID.');
      }
    } catch (e) {
      Utils.showToast('❌ Lỗi kết nối Bot 1: ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-sky-600"></i><span>Test Bot 1</span>';
      }
    }
  },

  async testReviewTelegram() {
    const tokenInput = document.getElementById('tele-review-bot-token');
    const chatIdInput = document.getElementById('tele-review-chat-id');
    const fallbackToken = document.getElementById('tele-bot-token')?.value.trim() || '';
    const fallbackChatId = document.getElementById('tele-chat-id')?.value.trim() || '';
    const btn = document.getElementById('btn-test-tele-2');

    const botToken = (tokenInput && tokenInput.value.trim()) ? tokenInput.value.trim() : fallbackToken;
    const chatId = (chatIdInput && chatIdInput.value.trim()) ? chatIdInput.value.trim() : fallbackChatId;

    if (!botToken || !chatId) {
      Utils.showToast('Vui lòng nhập Bot Token và Chat ID cho Bot Nghiệm thu!', 'warning', 4000);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang test...';
    }

    Utils.showToast('Đang gửi tin nhắn thử nghiệm tới Bot 2 (Nghiệm thu công việc)...', 'info', 3000);

    try {
      const res = await ApiService.testReviewTelegram(botToken, chatId);
      if (res.success) {
        SoundService.playSuccess();
        Utils.showToast('✅ GỬI THÀNH CÔNG TỚI BOT 2! Hãy kiểm tra Telegram.', 'success', 5000);
        this.saveSettings(false);
      } else {
        throw new Error(res.error || 'Kiểm tra lại Token hoặc Chat ID.');
      }
    } catch (e) {
      Utils.showToast('❌ Lỗi kết nối Bot 2: ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-purple-600"></i><span>Test Bot 2</span>';
      }
    }
  },

  async saveSettings(showSuccessToast = true) {
    const tokenInput = document.getElementById('tele-bot-token');
    const chatIdInput = document.getElementById('tele-chat-id');
    const reviewTokenInput = document.getElementById('tele-review-bot-token');
    const reviewChatIdInput = document.getElementById('tele-review-chat-id');
    const isEnabledToggle = document.getElementById('tele-enable-toggle');
    const optNewReport = document.getElementById('tele-opt-new-report');
    const optUrgent = document.getElementById('tele-opt-urgent');
    const optAssign = document.getElementById('tele-opt-assign');
    const optReview = document.getElementById('tele-opt-review');

    const newConfig = {
      botToken: tokenInput ? tokenInput.value.trim() : '',
      chatId: chatIdInput ? chatIdInput.value.trim() : '',
      reviewBotToken: reviewTokenInput ? reviewTokenInput.value.trim() : '',
      reviewChatId: reviewChatIdInput ? reviewChatIdInput.value.trim() : '',
      isEnabled: isEnabledToggle ? isEnabledToggle.checked : true,
      notifyOnNewReport: optNewReport ? optNewReport.checked : true,
      notifyOnUrgent: optUrgent ? optUrgent.checked : true,
      notifyOnAssign: optAssign ? optAssign.checked : true,
      notifyOnReview: optReview ? optReview.checked : true,
      updatedAt: new Date().toISOString()
    };

    this.config = newConfig;
    await ApiService.saveTelegramConfig(newConfig);

    if (showSuccessToast) {
      SoundService.playSuccess();
      Utils.showToast('Đã lưu cấu hình hệ thống & Telegram thành công!', 'success', 3000);
    }
  }
};

window.SettingsPage = SettingsPage;
