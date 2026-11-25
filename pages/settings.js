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
    notifyOnRating: true,
    notifyOnComplete: true
  },
  emailConfig: {
    isEnabled: true,
    webhookUrl: '',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    notifyOnComplete: true
  },
  zaloConfig: {
    isEnabled: true,
    botToken: '',
    recipientId: '',
    webhookUrl: '',
    secretToken: '',
    notifyOnNewReport: true,
    notifyOnReview: true,
    notifyOnRating: true
  },

  async init() {
    console.log('[SettingsPage] Initializing settings...');
    try {
      this.config = await ApiService.loadTelegramConfig();
    } catch (e) {
      this.config = ApiService.getTelegramConfig();
    }

    try {
      this.emailConfig = await ApiService.loadEmailConfig();
    } catch (e) {
      this.emailConfig = ApiService.getEmailConfig();
    }

    try {
      this.zaloConfig = await ApiService.loadZaloConfig();
    } catch (e) {
      this.zaloConfig = ApiService.getZaloConfig();
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
    const optRating = document.getElementById('tele-opt-rating');

    if (tokenInput) tokenInput.value = this.config.botToken || '';
    if (chatIdInput) chatIdInput.value = this.config.chatId || '';
    if (reviewTokenInput) reviewTokenInput.value = this.config.reviewBotToken || '';
    if (reviewChatIdInput) reviewChatIdInput.value = this.config.reviewChatId || '';
    if (isEnabledToggle) isEnabledToggle.checked = this.config.isEnabled !== false;
    if (optNewReport) optNewReport.checked = this.config.notifyOnNewReport !== false;
    if (optUrgent) optUrgent.checked = this.config.notifyOnUrgent !== false;
    if (optAssign) optAssign.checked = this.config.notifyOnAssign !== false;
    if (optReview) optReview.checked = this.config.notifyOnReview !== false;
    if (optRating) optRating.checked = this.config.notifyOnRating !== false;

    // Zalo Bot Config (Nhận thông báo như Telegram)
    const zaloToggle = document.getElementById('zalo-enable-toggle');
    const zaloBotToken = document.getElementById('zalo-bot-token');
    const zaloRecipientId = document.getElementById('zalo-recipient-id');
    const zaloWebhook = document.getElementById('zalo-webhook-url');
    const zaloSecretToken = document.getElementById('zalo-secret-token');
    const zaloOptNewReport = document.getElementById('zalo-opt-new-report');
    const zaloOptReview = document.getElementById('zalo-opt-review');
    const zaloOptRating = document.getElementById('zalo-opt-rating');

    const defaultWebhook = `${window.location.origin}/api/zalo/webhook`;
    const defaultBotToken = '3863228952293192329:EyTeNorFotUgHoxJcVdKganYZzHENQKlmrGbzJrFuPUgbqJtNVDTkQxsQHAcKhcD';
    if (zaloToggle) zaloToggle.checked = this.zaloConfig.isEnabled !== false;
    if (zaloBotToken) zaloBotToken.value = this.zaloConfig.botToken || this.zaloConfig.accessToken || defaultBotToken;
    if (zaloRecipientId) zaloRecipientId.value = this.zaloConfig.recipientId || this.zaloConfig.lastChatId || '';
    if (zaloWebhook) zaloWebhook.value = this.zaloConfig.webhookUrl || defaultWebhook;
    if (zaloSecretToken) zaloSecretToken.value = this.zaloConfig.secretToken || '';
    if (zaloOptNewReport) zaloOptNewReport.checked = this.zaloConfig.notifyOnNewReport !== false;
    if (zaloOptReview) zaloOptReview.checked = this.zaloConfig.notifyOnReview !== false;
    if (zaloOptRating) zaloOptRating.checked = this.zaloConfig.notifyOnRating !== false;

    // Email Config
    const emailToggle = document.getElementById('email-enable-toggle');
    const emailWebhook = document.getElementById('email-webhook-url');
    const emailJsService = document.getElementById('email-js-service-id');
    const emailJsTemplate = document.getElementById('email-js-template-id');
    const emailJsKey = document.getElementById('email-js-public-key');

    if (emailToggle) emailToggle.checked = this.emailConfig.isEnabled !== false;
    if (emailWebhook) emailWebhook.value = this.emailConfig.webhookUrl || '';
    if (emailJsService) emailJsService.value = this.emailConfig.emailjsServiceId || '';
    if (emailJsTemplate) emailJsTemplate.value = this.emailConfig.emailjsTemplateId || '';
    if (emailJsKey) emailJsKey.value = this.emailConfig.emailjsPublicKey || '';
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
              <span>CÀI ĐẶT HỆ THỐNG & BOTS (TELEGRAM & ZALO OA)</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Cấu hình Bot Telegram (Báo sự cố & Nghiệm thu), Bot Zalo OA (Tiếp nhận phản ánh & Tra cứu) và Email Tự động.</p>
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
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Cấu hình nhận thông báo tự động:</h4>
            <button type="button" id="btn-test-tele-rating" class="px-3.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs rounded-xl border border-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs" onclick="SettingsPage.testRatingTelegram()">
              <i class="fa-solid fa-star text-amber-500"></i>
              <span>Test Bot Đánh giá</span>
            </button>
          </div>
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
            <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer sm:col-span-2">
              <input type="checkbox" id="tele-opt-rating" checked class="w-4 h-4 text-amber-500 rounded">
              <span>Bắn tin khi Người dùng gửi Đánh giá chất lượng dịch vụ (1 - 5 sao & nhận xét)</span>
            </label>
          </div>
        </div>

        <!-- Section 3: BOT 3: ZALO BOT – Nhận thông báo phản ánh (Giống Telegram) -->
        <div class="bg-white rounded-3xl border border-blue-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100 pb-5 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-600/20 shrink-0">
                <i class="fa-solid fa-comment-dots"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>BOT 3: ZALO BOT – NHẬN THÔNG BÁO PHẢN ÁNH (GIỐNG TELEGRAM)</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">[NSG SUPPORT] BÁO SỰ CỐ QUA ZALO</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Website gửi phản ánh &rarr; Bot Zalo tự động gửi thông báo đến Zalo của bạn để mở xem tức thì (như Telegram, không cần chat với người gửi).</p>
              </div>
            </div>

            <button type="button" id="btn-test-zalo" class="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl border border-blue-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0" onclick="SettingsPage.testZalo()">
              <i class="fa-solid fa-paper-plane text-blue-600"></i>
              <span>Test Bot Zalo</span>
            </button>
          </div>

          <!-- Card Hướng dẫn kết nối Bot Zalo & Bắt Chat ID tự động -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                <i class="fa-solid fa-robot"></i>
              </div>
              <div>
                <p class="font-extrabold text-blue-900 flex items-center gap-2">
                  <span>Tên Bot: Bot Phản Ánh NSG</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-200/70 text-blue-800 border border-blue-300">bot.ZHOTlNLQ</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">ID: 3863228952293192329</span>
                </p>
                <p class="text-[11px] text-slate-600 mt-1">
                  👉 <b>Cách kích hoạt nhận tin:</b> Mở ứng dụng Zalo, tìm bot <b>Bot Phản Ánh NSG</b> (hoặc tìm <code>bot.ZHOTlNLQ</code>) và nhắn bất kỳ tin gì (hoặc gõ <code>/start</code>). Hệ thống sẽ tự động bắt Chat ID của bạn!
                </p>
              </div>
            </div>
            <button type="button" class="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-300 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all" onclick="SettingsPage.fetchCapturedZaloChatId()">
              <i class="fa-solid fa-arrows-rotate text-blue-600"></i>
              <span>Lấy Chat ID tự động</span>
            </button>
          </div>

          <!-- Form inputs Zalo Bot Token & Zalo ID nhận tin -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Zalo Bot Token / OA Access Token <span class="text-red-500">*</span></span>
                <button type="button" class="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer" onclick="SettingsPage.toggleTokenVisibility('zalo-bot-token', 'icon-toggle-zalo-token')">
                  <i class="fa-solid fa-eye mr-1" id="icon-toggle-zalo-token"></i><span>Ẩn/Hiện</span>
                </button>
              </label>
              <div class="relative">
                <input type="password" id="zalo-bot-token" class="w-full p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-blue-50/20 focus:bg-white transition-colors" placeholder="Token Zalo Bot hoặc OA Access Token...">
              </div>
              <p class="text-[11px] text-slate-400 mt-1.5">Mã API Token dùng để Bot gửi thông báo vào tài khoản Zalo của bạn.</p>
            </div>

            <div>
              <label class="block font-extrabold text-slate-800 mb-1.5">
                Zalo User ID / Số điện thoại nhận tin <span class="text-red-500">*</span>
              </label>
              <input type="text" id="zalo-recipient-id" class="w-full p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-blue-50/20 focus:bg-white transition-colors" placeholder="Ví dụ: 0912345678 hoặc Zalo User ID của bạn...">
              <p class="text-[11px] text-slate-400 mt-1.5">Nhập số điện thoại đăng ký Zalo hoặc Zalo User ID của bạn để nhận tin nhắn sự cố mới.</p>
            </div>
          </div>

          <!-- Tùy chọn sự kiện Zalo Bot -->
          <div class="bg-blue-50/40 rounded-2xl p-4 border border-blue-100 space-y-3">
            <h5 class="font-extrabold text-blue-900 text-xs uppercase tracking-wider">Cấu hình nhận thông báo tự động qua Zalo:</h5>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label class="flex items-center gap-2.5 font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" id="zalo-enable-toggle" checked class="w-4 h-4 text-blue-600 rounded">
                <span>Bật hệ thống thông báo Zalo Realtime</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="zalo-opt-new-report" checked class="w-4 h-4 text-blue-600 rounded">
                <span>Bắn tin khi có phản ánh sự cố mới (Website &rarr; Zalo)</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="zalo-opt-review" checked class="w-4 h-4 text-blue-600 rounded">
                <span>Bắn tin kèm ảnh khi KTV báo cáo nghiệm thu</span>
              </label>
              <label class="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" id="zalo-opt-rating" checked class="w-4 h-4 text-blue-600 rounded">
                <span>Bắn tin khi Người dùng gửi Đánh giá dịch vụ</span>
              </label>
            </div>
          </div>

          <!-- Webhook mở rộng nếu dùng server trung gian -->
          <details class="text-xs text-slate-500 border-t border-slate-100 pt-3">
            <summary class="cursor-pointer font-bold text-slate-600 hover:text-blue-600 select-none">
              <i class="fa-solid fa-gear mr-1"></i> Thiết lập nâng cao (Zalo OA Webhook URL & Secret Token)
            </summary>
            <div class="mt-3 space-y-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Zalo OA Webhook URL</label>
                <div class="flex gap-2">
                  <input type="text" id="zalo-webhook-url" readonly class="flex-1 p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-50 text-slate-700 select-all" placeholder="https://domain/api/zalo/webhook">
                  <button type="button" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="SettingsPage.copyZaloWebhookUrl()">
                    <i class="fa-solid fa-copy mr-1"></i>Copy
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Secret Token</label>
                  <input type="password" id="zalo-secret-token" class="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-50">
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- Section 4: Cấu hình Gửi Email Tự Động (Hoàn tất & Đánh giá dịch vụ) -->
        <div class="bg-white rounded-3xl border border-emerald-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-5 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-600/20 shrink-0">
                <i class="fa-solid fa-envelope-circle-check"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Gửi Email thông báo hoàn thành & Đánh giá (1-5★)</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Email Tự Động</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Tự động gửi email thông báo kèm liên kết đánh giá chất lượng phục vụ khi sự cố được duyệt hoàn thành.</p>
              </div>
            </div>

            <button type="button" id="btn-test-email" class="px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs" onclick="SettingsPage.testEmail()">
              <i class="fa-solid fa-paper-plane text-emerald-600"></i>
              <span>Test Gửi Email</span>
            </button>
          </div>

          <div class="space-y-4">
            <label class="flex items-center gap-2.5 font-extrabold text-slate-800 text-xs cursor-pointer">
              <input type="checkbox" id="email-enable-toggle" checked class="w-4 h-4 text-emerald-600 rounded">
              <span>Bật chức năng tự động gửi Email khi Kỹ thuật hoàn thành & nghiệm thu phiếu</span>
            </label>

            <!-- Option 1: Google Apps Script Web App / Webhook URL (Khuyên dùng) -->
            <div class="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div class="flex items-center justify-between">
                <label class="block font-black text-emerald-950 text-xs">
                  🌐 Webhook URL / Google Apps Script Web App (Khuyên dùng - Miễn phí 100% qua Gmail):
                </label>
                <button type="button" class="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1" onclick="SettingsPage.toggleGoogleScriptGuide()">
                  <i class="fa-solid fa-code"></i>
                  <span id="label-toggle-script-guide">Xem code mẫu Google Script (1 phút)</span>
                </button>
              </div>
              <input type="url" id="email-webhook-url" class="w-full p-3 rounded-xl border border-emerald-300 focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-white" placeholder="https://script.google.com/macros/s/AKfycbx.../exec">
              <p class="text-[11px] text-slate-500">Dán link Web App từ Google Apps Script (sử dụng tài khoản Gmail/Google Workspace của trường để gửi thư hoàn toàn miễn phí).</p>
            </div>

            <!-- Hướng dẫn tạo Google Script Popup / Collapse -->
            <div id="google-script-guide-box" class="hidden p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs space-y-3 font-mono">
              <div class="flex items-center justify-between text-white font-bold border-b border-slate-700 pb-2">
                <span>📋 Mã nguồn Google Apps Script (Tạo tại script.google.com):</span>
                <button type="button" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-sans font-bold cursor-pointer" onclick="SettingsPage.copyGoogleScript()">
                  <i class="fa-regular fa-copy mr-1"></i> Copy Code
                </button>
              </div>
              <pre id="google-script-code-text" class="text-[11px] leading-relaxed text-emerald-400 bg-slate-950 p-3 rounded-xl overflow-x-auto">function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to || data.recipient;
    var subject = data.subject || "[NSG SUPPORT] Thông báo hoàn thành";
    var htmlBody = data.html || "&lt;p&gt;Công việc đã hoàn thành.&lt;/p&gt;";
    var textBody = data.text || "Công việc đã hoàn thành.";
    
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      name: "NSG SUPPORT - CSVC"
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", to: to }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}</pre>
              <div class="text-slate-400 text-[11px] font-sans space-y-1">
                <p>👉 <strong>Cách triển khai:</strong> Vào <a href="https://script.google.com" target="_blank" class="text-sky-400 underline">script.google.com</a> ➔ Tạo dự án mới ➔ Dán mã trên ➔ Nhấn <strong>Deploy (Triển khai) ➔ New deployment ➔ Web App (Ai cũng có thể truy cập / Anyone)</strong> ➔ Copy URL dán vào ô Webhook URL ở trên.</p>
              </div>
            </div>

            <!-- Option 2: EmailJS API -->
            <details class="border border-slate-200 rounded-2xl p-4 text-xs space-y-3 bg-slate-50/70">
              <summary class="font-bold text-slate-700 cursor-pointer hover:text-blue-600">
                ⚙️ Hoặc sử dụng dịch vụ EmailJS (Tùy chọn nâng cao)
              </summary>
              <div class="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">EmailJS Service ID:</label>
                  <input type="text" id="email-js-service-id" class="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white" placeholder="service_xxxxxx">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">EmailJS Template ID:</label>
                  <input type="text" id="email-js-template-id" class="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white" placeholder="template_xxxxxx">
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">EmailJS Public Key:</label>
                  <input type="text" id="email-js-public-key" class="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white" placeholder="public_key_xxxxxx">
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- Section 4: SLA Response Time Standards -->
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

  toggleGoogleScriptGuide() {
    const box = document.getElementById('google-script-guide-box');
    const label = document.getElementById('label-toggle-script-guide');
    if (!box) return;
    if (box.classList.contains('hidden')) {
      box.classList.remove('hidden');
      if (label) label.innerText = 'Thu gọn hướng dẫn Google Script';
    } else {
      box.classList.add('hidden');
      if (label) label.innerText = 'Xem code mẫu Google Script (1 phút)';
    }
  },

  copyGoogleScript() {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to || data.recipient;
    var subject = data.subject || "[NSG SUPPORT] Thông báo hoàn thành";
    var htmlBody = data.html || "<p>Công việc đã hoàn thành.</p>";
    var textBody = data.text || "Công việc đã hoàn thành.";
    
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      name: "NSG SUPPORT - CSVC"
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", to: to }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    Utils.showToast('Đã copy mã nguồn Google Apps Script vào bộ nhớ tạm!', 'success', 3000);
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

  async testRatingTelegram() {
    const fallbackToken = document.getElementById('tele-bot-token')?.value.trim() || '';
    const fallbackChatId = document.getElementById('tele-chat-id')?.value.trim() || '';
    const btn = document.getElementById('btn-test-tele-rating');

    if (!fallbackToken || !fallbackChatId) {
      Utils.showToast('Vui lòng nhập Bot 1 Token và Chat ID trước khi kiểm tra!', 'warning', 4000);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang test...';
    }

    Utils.showToast('Đang gửi tin nhắn thử nghiệm Đánh giá chất lượng dịch vụ tới Telegram...', 'info', 3000);

    try {
      const res = await ApiService.testRatingTelegram(fallbackToken, fallbackChatId);
      if (res.success) {
        SoundService.playSuccess();
        Utils.showToast('✅ GỬI THÀNH CÔNG THÔNG BÁO ĐÁNH GIÁ TỚI TELEGRAM! Hãy kiểm tra nhóm chat.', 'success', 5000);
        this.saveSettings(false);
      } else {
        throw new Error(res.error || 'Kiểm tra lại Token hoặc Chat ID.');
      }
    } catch (e) {
      Utils.showToast('❌ Lỗi kết nối: ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-star text-amber-500"></i><span>Test Bot Đánh giá</span>';
      }
    }
  },

  async testEmail() {
    const currentUser = AuthService.getCurrentUser();
    const defaultEmail = currentUser?.email || 'admin@nsg.edu.vn';
    const testEmailInput = prompt('Nhập địa chỉ email của bạn để nhận email thử nghiệm:', defaultEmail);
    if (!testEmailInput || !testEmailInput.includes('@')) {
      if (testEmailInput !== null) Utils.showToast('Email không hợp lệ!', 'warning');
      return;
    }

    const webhookUrl = document.getElementById('email-webhook-url')?.value.trim() || '';
    const btn = document.getElementById('btn-test-email');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang gửi...';
    }

    Utils.showToast(`Đang gửi thử email nghiệm thu & đánh giá tới ${testEmailInput}...`, 'info', 3000);

    try {
      await this.saveSettings(false);
      const res = await ApiService.testEmail(testEmailInput, webhookUrl);
      if (res && res.success) {
        SoundService.playSuccess();
        Utils.showToast(`✅ Đã gửi email thử nghiệm thành công tới ${testEmailInput}! Vui lòng kiểm tra hộp thư đến (hoặc Spam).`, 'success', 6000);
      } else {
        throw new Error(res?.reason === 'NO_CONFIG' ? 'Chưa cấu hình Webhook URL hoặc EmailJS. Hãy dán Webhook URL từ Google Apps Script!' : (res?.error || 'Lỗi gửi email'));
      }
    } catch (e) {
      Utils.showToast('❌ ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-emerald-600"></i><span>Test Gửi Email</span>';
      }
    }
  },

  // Các hàm tiện ích cho BOT 3: ZALO OA
  copyZaloWebhookUrl() {
    const input = document.getElementById('zalo-webhook-url');
    const url = input ? input.value : `${window.location.origin}/api/zalo/webhook`;
    navigator.clipboard.writeText(url).then(() => {
      Utils.showToast('✅ Đã sao chép Zalo OA Webhook URL vào bộ nhớ tạm!', 'success', 3500);
    }).catch(() => {
      if (input) {
        input.select();
        document.execCommand('copy');
        Utils.showToast('✅ Đã sao chép Zalo OA Webhook URL!', 'success', 3500);
      }
    });
  },

  generateZaloSecretToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'nsg_sec_';
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const input = document.getElementById('zalo-secret-token');
    if (input) {
      input.value = token;
      input.type = 'text';
      setTimeout(() => { input.type = 'password'; }, 3000);
      Utils.showToast('Đã tạo Secret Token ngẫu nhiên mới!', 'info', 3000);
    }
  },

  async testZalo() {
    const tokenInput = document.getElementById('zalo-bot-token');
    const recipientInput = document.getElementById('zalo-recipient-id');
    const btn = document.getElementById('btn-test-zalo');

    const botToken = tokenInput ? tokenInput.value.trim() : '';
    const recipientId = recipientInput ? recipientInput.value.trim() : '';

    if (!botToken) {
      Utils.showToast('Vui lòng nhập Zalo Bot Token trước khi test!', 'warning', 4000);
      return;
    }

    if (!recipientId) {
      Utils.showToast('Vui lòng nhập Chat ID người nhận hoặc bấm "Lấy Chat ID tự động"!', 'warning', 4000);
      return;
    }

    // Cảnh báo thân thiện nếu người dùng nhập số điện thoại thay vì Chat ID
    if (/^(0|84)?[0-9]{9,10}$/.test(recipientId.replace(/\s+/g, '')) && recipientId.length <= 11) {
      Utils.showToast(`⚠️ "${recipientId}" là số điện thoại. Chat ID Zalo Bot là dãy số ID do Bot cấp. Hãy mở Zalo nhắn cho bot "Bot Phản Ánh NSG" (bot.ZHOTlNLQ) rồi bấm "Lấy Chat ID tự động"!`, 'warning', 7000);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Đang test...';
    }

    Utils.showToast('Đang gửi tin nhắn thử nghiệm tới Zalo của bạn...', 'info', 3000);

    try {
      await this.saveSettings(false);
      const res = await ApiService.testZalo(botToken, recipientId);
      if (res && res.success) {
        SoundService.playSuccess();
        Utils.showToast('✅ GỬI THÀNH CÔNG TỚI ZALO! Hãy mở ứng dụng Zalo trên điện thoại/máy tính để xem thông báo.', 'success', 6000);
      } else {
        throw new Error(res?.error || res?.message || 'Kiểm tra lại Bot Token hoặc ID người nhận.');
      }
    } catch (e) {
      Utils.showToast('❌ Lỗi gửi Zalo: ' + e.message, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-blue-600"></i><span>Test Bot Zalo</span>';
      }
    }
  },

  async testZaloOA() {
    return this.testZalo();
  },

  async fetchCapturedZaloChatId() {
    Utils.showToast('Đang kiểm tra tin nhắn mới từ Bot Zalo...', 'info', 2000);
    try {
      // 1. Ưu tiên đọc trực tiếp từ Cloud Firestore
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const doc = await db.collection('system_settings').doc('zalo').get();
          if (doc.exists && doc.data()?.lastChatId) {
            const data = doc.data();
            const input = document.getElementById('zalo-recipient-id');
            if (input) input.value = data.lastChatId;
            this.zaloConfig.recipientId = data.lastChatId;
            this.zaloConfig.lastChatId = data.lastChatId;
            await this.saveSettings(false);
            SoundService.playSuccess();
            Utils.showToast(`✅ Đã bắt được Chat ID Zalo: ${data.lastChatId} (${data.lastSenderName || 'Quản lý'})`, 'success', 6000);
            return;
          }
        } catch (fsErr) {
          console.warn('[SettingsPage] Error reading Firestore for lastChatId:', fsErr);
        }
      }

      // 2. Thử gọi backend /api/zalo/config
      try {
        const res = await fetch(`${window.APP_CONFIG.apiBaseUrl}/zalo/config`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          const cfg = json.config || {};
          if (cfg.lastChatId) {
            const input = document.getElementById('zalo-recipient-id');
            if (input) input.value = cfg.lastChatId;
            this.zaloConfig.recipientId = cfg.lastChatId;
            this.zaloConfig.lastChatId = cfg.lastChatId;
            await this.saveSettings(false);
            SoundService.playSuccess();
            Utils.showToast(`✅ Đã bắt được Chat ID Zalo: ${cfg.lastChatId} (${cfg.lastSenderName || 'Quản lý'})`, 'success', 6000);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('[SettingsPage] Error checking /api/zalo/config:', apiErr);
      }

      Utils.showToast('Chưa có tin nhắn nào đến Bot. Hãy mở Zalo, tìm bot "Bot Phản Ánh NSG" (bot.ZHOTlNLQ) và nhắn tin "/start", sau đó bấm lại nút này!', 'warning', 7000);
    } catch (e) {
      Utils.showToast('Lỗi kiểm tra Chat ID: ' + e.message, 'error', 4000);
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
    const optRating = document.getElementById('tele-opt-rating');

    // Zalo inputs
    const zaloToggle = document.getElementById('zalo-enable-toggle');
    const zaloBotToken = document.getElementById('zalo-bot-token');
    const zaloRecipientId = document.getElementById('zalo-recipient-id');
    const zaloWebhook = document.getElementById('zalo-webhook-url');
    const zaloSecretToken = document.getElementById('zalo-secret-token');
    const zaloOptNewReport = document.getElementById('zalo-opt-new-report');
    const zaloOptReview = document.getElementById('zalo-opt-review');
    const zaloOptRating = document.getElementById('zalo-opt-rating');

    // Email inputs
    const emailToggle = document.getElementById('email-enable-toggle');
    const emailWebhook = document.getElementById('email-webhook-url');
    const emailJsService = document.getElementById('email-js-service-id');
    const emailJsTemplate = document.getElementById('email-js-template-id');
    const emailJsKey = document.getElementById('email-js-public-key');

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
      notifyOnRating: optRating ? optRating.checked : true,
      updatedAt: new Date().toISOString()
    };

    const newZaloConfig = {
      isEnabled: zaloToggle ? zaloToggle.checked : true,
      botToken: zaloBotToken ? zaloBotToken.value.trim() : '',
      accessToken: zaloBotToken ? zaloBotToken.value.trim() : '',
      recipientId: zaloRecipientId ? zaloRecipientId.value.trim() : '',
      webhookUrl: zaloWebhook ? zaloWebhook.value.trim() : `${window.location.origin}/api/zalo/webhook`,
      secretToken: zaloSecretToken ? zaloSecretToken.value.trim() : '',
      notifyOnNewReport: zaloOptNewReport ? zaloOptNewReport.checked : true,
      notifyOnReview: zaloOptReview ? zaloOptReview.checked : true,
      notifyOnRating: zaloOptRating ? zaloOptRating.checked : true,
      updatedAt: new Date().toISOString()
    };

    const newEmailConfig = {
      isEnabled: emailToggle ? emailToggle.checked : true,
      webhookUrl: emailWebhook ? emailWebhook.value.trim() : '',
      emailjsServiceId: emailJsService ? emailJsService.value.trim() : '',
      emailjsTemplateId: emailJsTemplate ? emailJsTemplate.value.trim() : '',
      emailjsPublicKey: emailJsKey ? emailJsKey.value.trim() : '',
      notifyOnComplete: true,
      updatedAt: new Date().toISOString()
    };

    this.config = newConfig;
    this.zaloConfig = newZaloConfig;
    this.emailConfig = newEmailConfig;

    await Promise.all([
      ApiService.saveTelegramConfig(newConfig),
      ApiService.saveZaloConfig(newZaloConfig),
      ApiService.saveEmailConfig(newEmailConfig)
    ]);

    if (showSuccessToast) {
      SoundService.playSuccess();
      Utils.showToast('Đã lưu cấu hình hệ thống, Telegram Bots, Zalo Bot & Email thành công!', 'success', 3000);
    }
  }
};

window.SettingsPage = SettingsPage;
