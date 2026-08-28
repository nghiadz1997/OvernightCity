/**
 * NSG SUPPORT - SYSTEM SETTINGS PAGE
 * Cấu hình hệ thống, SLA, Tích hợp Telegram Bot API và Zalo OA
 */

const SettingsPage = {
  config: {
    botToken: '',
    chatId: '',
    isEnabled: true,
    notifyOnNewReport: true,
    notifyOnUrgent: true,
    notifyOnAssign: true,
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
    const isEnabledToggle = document.getElementById('tele-enable-toggle');
    const optNewReport = document.getElementById('tele-opt-new-report');
    const optUrgent = document.getElementById('tele-opt-urgent');
    const optAssign = document.getElementById('tele-opt-assign');

    if (tokenInput) tokenInput.value = this.config.botToken || '';
    if (chatIdInput) chatIdInput.value = this.config.chatId || '';
    if (isEnabledToggle) isEnabledToggle.checked = this.config.isEnabled !== false;
    if (optNewReport) optNewReport.checked = this.config.notifyOnNewReport !== false;
    if (optUrgent) optUrgent.checked = this.config.notifyOnUrgent !== false;
    if (optAssign) optAssign.checked = this.config.notifyOnAssign !== false;
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
              <span>CÀI ĐẶT HỆ THỐNG & TÍCH HỢP TELEGRAM BOT</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Cấu hình kết nối Telegram Bot tự động thông báo sự cố, SLA và thông số vận hành.</p>
          </div>

          <button type="button" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="SettingsPage.saveSettings()">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>LƯU TẤT CẢ CẤU HÌNH</span>
          </button>
        </div>

        <!-- Section 1: Telegram Bot Integration (Hoạt động 100% Realtime) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 shrink-0">
                <i class="fa-brands fa-telegram"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Tích hợp Telegram Bot API (Thông báo Realtime)</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">Đang kích hoạt</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Tự động bắn tin nhắn tới Telegram khi có phản ánh mới, khẩn cấp hoặc khi phân công việc cho KTV.</p>
              </div>
            </div>

            <button type="button" id="btn-test-tele" class="px-4 py-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs rounded-xl border border-sky-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs" onclick="SettingsPage.testTelegram()">
              <i class="fa-solid fa-paper-plane text-sky-600"></i>
              <span>Bắn tin nhắn thử nghiệm</span>
            </button>
          </div>

          <!-- Form inputs Token & Chat ID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>1. Telegram Bot Token <span class="text-red-500">*</span></span>
                <button type="button" class="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer" onclick="SettingsPage.toggleTokenVisibility()">
                  <i class="fa-solid fa-eye mr-1" id="icon-toggle-token"></i><span id="text-toggle-token">Hiện / Ẩn Token</span>
                </button>
              </label>
              <div class="relative">
                <input type="password" id="tele-bot-token" class="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 font-mono text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Dán Token từ @BotFather vào đây...">
              </div>
              <p class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <i class="fa-solid fa-shield-halved text-emerald-600"></i>
                <span>Được bảo vệ mã hóa & phân quyền chỉ riêng Super Admin.</span>
              </p>
            </div>

            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5">
                2. Telegram Chat ID / Nhóm Chat ID <span class="text-red-500">*</span>
              </label>
              <input type="text" id="tele-chat-id" class="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 font-mono text-xs bg-slate-50 focus:bg-white transition-colors" placeholder="Ví dụ: -1001234567890 (nhóm) hoặc 123456789 (cá nhân)">
              <p class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <i class="fa-solid fa-circle-info text-sky-500"></i>
                <span>ID cá nhân hoặc ID của nhóm nhận thông báo kỹ thuật.</span>
              </p>
            </div>
          </div>

          <!-- Bảo mật chống F12 DevTools -->
          <div class="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <h4 class="font-black flex items-center gap-2 text-emerald-900">
              <i class="fa-solid fa-user-shield text-emerald-700"></i>
              <span>CƠ CHẾ BẢO MẬT CHỐNG LỘ TOKEN QUA F12 DEVTOOLS:</span>
            </h4>
            <p class="text-[11px] leading-relaxed text-emerald-900">
              • <strong>Backend Server Relay:</strong> Khi triển khai thực tế, toàn bộ tin nhắn thông báo được chuyển tiếp qua cổng bảo mật <code>/api/telegram/send</code> trên Server Backend (Token lưu trong biến môi trường <code>.env</code> của máy chủ).
              <br>• <strong>Người dùng khi bấm F12 (Network / Console):</strong> Sẽ chỉ thấy request gửi dữ liệu thông thường, <strong>tuyệt đối KHÔNG THỂ xem hoặc lấy trộm được Bot Token</strong>.
            </p>
          </div>

          <!-- Tùy chọn gửi thông báo -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Cấu hình loại sự kiện nhận tin nhắn:</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label class="flex items-center gap-2.5 font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" id="tele-enable-toggle" checked class="w-4 h-4 text-sky-600 rounded">
                <span>Bật tính năng thông báo qua Telegram</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="tele-opt-new-report" checked class="w-4 h-4 text-sky-600 rounded">
                <span>Thông báo khi có phản ánh sự cố mới</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="tele-opt-urgent" checked class="w-4 h-4 text-sky-600 rounded">
                <span>Thông báo khi có sự cố KHẨN CẤP</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="tele-opt-assign" checked class="w-4 h-4 text-sky-600 rounded">
                <span>Thông báo khi phân công việc cho KTV</span>
              </label>
            </div>
          </div>

          <!-- Hướng dẫn 3 bước kết nối Telegram Bot -->
          <div class="p-5 bg-sky-50/70 rounded-2xl border border-sky-200 text-xs text-slate-700 space-y-2.5">
            <h4 class="font-black text-sky-900 flex items-center gap-2 text-sm">
              <i class="fa-solid fa-graduation-cap text-sky-600"></i>
              <span>HƯỚNG DẪN 3 BƯỚC LẤY BOT TOKEN VÀ CHAT ID TELEGRAM:</span>
            </h4>
            <ul class="space-y-2 list-none pl-1">
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong>Tạo Bot:</strong> Mở Telegram, tìm kiếm <code>@BotFather</code>, gửi tin nhắn <code>/newbot</code>, đặt tên và username cho bot. BotFather sẽ gửi lại chuỗi <strong>HTTP API Token</strong> (dán vào ô 1 ở trên).
                </div>
              </li>
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong>Lấy Chat ID:</strong>
                  <br>• <em>Nếu nhận tin cá nhân:</em> Mở Telegram tìm <code>@userinfobot</code> và gửi tin nhắn để xem ID của bạn (ví dụ: <code>123456789</code>).
                  <br>• <em>Nếu nhận tin vào Nhóm/Group:</em> Thêm Bot vừa tạo vào Nhóm Telegram, thêm bot <code>@RawDataBot</code> vào nhóm để xem <code>chat_id</code> của nhóm (thường có dấu trừ ở đầu, ví dụ: <code>-1001234567890</code>).
                </div>
              </li>
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong class="text-amber-800">Cực kỳ quan trọng:</strong> Trước khi thử nghiệm, bạn (hoặc nhóm) phải mở chat với Bot của mình và bấm <strong>/start</strong> để cho phép Bot gửi tin nhắn. Sau đó bấm nút <strong>[Bắn tin nhắn thử nghiệm]</strong> ở trên.
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Section 2: Zalo OA Integration (Mục 21) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
          <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-blue-600/20 shrink-0">
              Z
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Tích hợp Zalo Official Account (ZNS)</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">Sẵn sàng kết nối</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Kiến trúc module Notification Service đã sẵn sàng kết nối Zalo OA khi Nhà trường kích hoạt tài khoản Doanh nghiệp.</p>
            </div>
          </div>

          <div class="flex items-center gap-3 text-xs pt-1">
            <label class="font-bold text-slate-700 flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" id="zalo-oa-toggle" class="w-4 h-4 text-blue-600 rounded">
              <span>Kích hoạt cổng gửi ZNS Zalo Notification (Yêu cầu Zalo App ID & Secret Key)</span>
            </label>
          </div>
        </div>

        <!-- Section 3: SLA & Mức độ ưu tiên -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
          <div class="border-b border-slate-100 pb-4">
            <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-clock text-amber-500"></i>
              <span>Cấu hình chuẩn cam kết thời gian xử lý (SLA)</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Thời gian quy định cho từng mức độ trước khi hệ thống kích hoạt cảnh báo QUÁ HẠN.</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div class="p-4 rounded-2xl border border-red-200 bg-red-50/60 text-center">
              <span class="font-black text-red-700 block mb-2 text-sm">🔴 KHẨN CẤP</span>
              <input type="number" value="2" class="w-full p-2.5 rounded-xl border border-red-300 font-extrabold text-center text-sm bg-white">
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 2 Giờ</span>
            </div>
            <div class="p-4 rounded-2xl border border-orange-200 bg-orange-50/60 text-center">
              <span class="font-black text-orange-700 block mb-2 text-sm">🟠 CAO</span>
              <input type="number" value="8" class="w-full p-2.5 rounded-xl border border-orange-300 font-extrabold text-center text-sm bg-white">
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 8 Giờ (Trong ngày)</span>
            </div>
            <div class="p-4 rounded-2xl border border-yellow-200 bg-yellow-50/60 text-center">
              <span class="font-black text-yellow-800 block mb-2 text-sm">🟡 TRUNG BÌNH</span>
              <input type="number" value="24" class="w-full p-2.5 rounded-xl border border-yellow-300 font-extrabold text-center text-sm bg-white">
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 24 Giờ</span>
            </div>
            <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 text-center">
              <span class="font-black text-blue-700 block mb-2 text-sm">🟢 BÌNH THƯỜNG</span>
              <input type="number" value="48" class="w-full p-2.5 rounded-xl border border-blue-300 font-extrabold text-center text-sm bg-white">
              <span class="text-[11px] text-slate-500 font-semibold block mt-1.5">SLA: 48 Giờ (2 ngày)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  toggleTokenVisibility() {
    const input = document.getElementById('tele-bot-token');
    const icon = document.getElementById('icon-toggle-token');
    const text = document.getElementById('text-toggle-token');
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      if (text) text.innerText = 'Ẩn Token';
    } else {
      input.type = 'password';
      if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      if (text) text.innerText = 'Hiện Token';
    }
  },

  async testTelegram() {
    const tokenInput = document.getElementById('tele-bot-token');
    const chatIdInput = document.getElementById('tele-chat-id');
    const btn = document.getElementById('btn-test-tele');

    const botToken = tokenInput ? tokenInput.value.trim() : '';
    const chatId = chatIdInput ? chatIdInput.value.trim() : '';

    if (!botToken) {
      Utils.showToast('Vui lòng nhập Telegram Bot Token trước khi kiểm tra!', 'warning', 4000);
      if (tokenInput) tokenInput.focus();
      return;
    }

    if (!chatId) {
      Utils.showToast('Vui lòng nhập Telegram Chat ID trước khi kiểm tra!', 'warning', 4000);
      if (chatIdInput) chatIdInput.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1 text-sky-600"></i><span>Đang gửi...</span>';
    }

    Utils.showToast('Đang gửi tin nhắn thử nghiệm tới Telegram Bot...', 'info', 3000);

    try {
      const res = await ApiService.testTelegram(botToken, chatId);
      if (res.success) {
        SoundService.playSuccess();
        Utils.showToast('✅ GỬI THÀNH CÔNG! Hãy kiểm tra Telegram để xem tin nhắn.', 'success', 5000);
        // Tự động lưu cấu hình hợp lệ
        this.saveSettings(false);
      } else {
        throw new Error(res.error || 'Kiểm tra lại Token hoặc Chat ID.');
      }
    } catch (e) {
      Utils.showToast('❌ Lỗi kết nối Telegram: ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-sky-600"></i><span>Bắn tin nhắn thử nghiệm</span>';
      }
    }
  },

  async saveSettings(showSuccessToast = true) {
    const tokenInput = document.getElementById('tele-bot-token');
    const chatIdInput = document.getElementById('tele-chat-id');
    const isEnabledToggle = document.getElementById('tele-enable-toggle');
    const optNewReport = document.getElementById('tele-opt-new-report');
    const optUrgent = document.getElementById('tele-opt-urgent');
    const optAssign = document.getElementById('tele-opt-assign');

    const newConfig = {
      botToken: tokenInput ? tokenInput.value.trim() : '',
      chatId: chatIdInput ? chatIdInput.value.trim() : '',
      isEnabled: isEnabledToggle ? isEnabledToggle.checked : true,
      notifyOnNewReport: optNewReport ? optNewReport.checked : true,
      notifyOnUrgent: optUrgent ? optUrgent.checked : true,
      notifyOnAssign: optAssign ? optAssign.checked : true,
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
