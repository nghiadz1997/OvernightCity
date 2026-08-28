/**
 * NSG SUPPORT - PUBLIC HOME PAGE
 * Giao diện chính theo yêu cầu mục 5: 4 nút lớn, màu sắc giáo dục công nghệ
 */

const HomePage = {
  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
        <!-- Hero Section -->
        <div class="bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
          <!-- Background Glow Elements -->
          <div class="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="max-w-4xl mx-auto relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-6">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Hệ thống Tiếp nhận Trực tuyến 24/7
            </div>

            <h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
              PHẢN ÁNH & HỖ TRỢ KỸ THUẬT
            </h1>
            <p class="text-base sm:text-xl text-blue-100/90 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Cổng tiếp nhận phản ánh sự cố cơ sở vật chất, thiết bị dạy học, mạng máy tính và điều phối công việc kỹ thuật nội bộ NSG.
            </p>

            <!-- 4 NÚT LỚN THEO YÊU CẦU MỤC 5 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <!-- Nút 1: GỬI PHẢN ÁNH -->
              <a href="#/report" class="group bg-white hover:bg-blue-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center text-xl mb-4 shadow-md transition-colors">
                    <i class="fa-solid fa-paper-plane"></i>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                    GỬI PHẢN ÁNH
                  </h3>
                  <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Báo cáo hư hỏng máy tính, máy chiếu, mạng, điện nước tại phòng học và văn phòng.
                  </p>
                </div>
                <div class="mt-4 flex items-center text-xs font-bold text-blue-600">
                  <span>Gửi phiếu ngay</span>
                  <i class="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </a>

              <!-- Nút 2: THEO DÕI PHẢN ÁNH -->
              <a href="#/tracking" class="group bg-white hover:bg-indigo-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center text-xl mb-4 shadow-md transition-colors">
                    <i class="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    THEO DÕI PHẢN ÁNH
                  </h3>
                  <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Tra cứu tiến độ xử lý bằng mã yêu cầu (ví dụ: PYC-2026-000001) và đánh giá 5 sao.
                  </p>
                </div>
                <div class="mt-4 flex items-center text-xs font-bold text-indigo-600">
                  <span>Tra cứu tiến độ</span>
                  <i class="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </a>

              <!-- Nút 3: HỖ TRỢ KỸ THUẬT -->
              <a href="#/staff" class="group bg-white hover:bg-cyan-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-cyan-600 group-hover:bg-cyan-700 text-white flex items-center justify-center text-xl mb-4 shadow-md transition-colors">
                    <i class="fa-solid fa-toolbox"></i>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 group-hover:text-cyan-600 transition-colors uppercase tracking-tight">
                    HỖ TRỢ KỸ THUẬT
                  </h3>
                  <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Dành cho Kỹ thuật viên tiếp nhận công việc hiện trường và cập nhật kết quả xử lý.
                  </p>
                </div>
                <div class="mt-4 flex items-center text-xs font-bold text-cyan-600">
                  <span>Vào cổng KTV</span>
                  <i class="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </a>

              <!-- Nút 4: HƯỚNG DẪN -->
              <a href="#guidelines" onclick="document.getElementById('guidelines-section').scrollIntoView({behavior: 'smooth'})" class="group bg-white hover:bg-emerald-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center text-xl mb-4 shadow-md transition-colors">
                    <i class="fa-solid fa-book-open"></i>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
                    HƯỚNG DẪN
                  </h3>
                  <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Quy trình xử lý sự cố, tiêu chuẩn SLA, cách kết nối thiết bị giảng đường và hotline.
                  </p>
                </div>
                <div class="mt-4 flex items-center text-xs font-bold text-emerald-600">
                  <span>Xem hướng dẫn</span>
                  <i class="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- Emergency Hotline & Information -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div class="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0">
                <i class="fa-solid fa-phone-volume animate-bounce"></i>
              </div>
              <div>
                <div class="inline-block px-2.5 py-0.5 rounded-full bg-white/25 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Đường dây nóng khẩn cấp
                </div>
                <h3 class="text-xl sm:text-2xl font-black">HỖ TRỢ GIỜ GIẢNG & SỰ CỐ GẤP</h3>
                <p class="text-sm text-red-100 mt-1">
                  Sự cố mất điện toàn khu, máy chiếu hỏng trong giờ thi, mất mạng phòng lab:
                </p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row items-center gap-3">
              <a href="tel:0909277944" class="px-6 py-3.5 bg-white text-red-600 hover:bg-red-50 font-black text-lg rounded-xl shadow-lg transition-all flex items-center gap-2">
                <i class="fa-solid fa-phone-volume text-red-600"></i>
                <span>0909.277.944</span>
              </a>
              <a href="#/report?priority=KHẨN+CẤP" class="px-5 py-3.5 bg-red-800/50 hover:bg-red-800 text-white font-bold text-sm rounded-xl border border-white/30 transition-all flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Báo khẩn cấp online</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Guidelines Section (Mục 5) -->
        <div id="guidelines-section" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full border-t border-slate-200">
          <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">QUY TRÌNH TIẾP NHẬN & XỬ LÝ</h2>
            <p class="text-sm text-slate-500 mt-2">Hệ thống vận hành theo 5 bước tiêu chuẩn đảm bảo minh bạch, đúng hẹn và chất lượng</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
              <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black text-base mx-auto flex items-center justify-center mb-3">1</div>
              <h4 class="font-bold text-sm text-slate-800 mb-1">Gửi phản ánh</h4>
              <p class="text-xs text-slate-500">Người dùng gửi yêu cầu qua form online kèm ảnh chụp hiện trường.</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
              <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-black text-base mx-auto flex items-center justify-center mb-3">2</div>
              <h4 class="font-bold text-sm text-slate-800 mb-1">Tiếp nhận & Phân công</h4>
              <p class="text-xs text-slate-500">Trưởng bộ phận nhận thông báo Telegram tức thì và giao kỹ thuật viên.</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
              <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-black text-base mx-auto flex items-center justify-center mb-3">3</div>
              <h4 class="font-bold text-sm text-slate-800 mb-1">Xử lý hiện trường</h4>
              <p class="text-xs text-slate-500">Kỹ thuật viên đến phòng, kiểm tra, chụp ảnh trước/sau và khắc phục sự cố.</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
              <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-black text-base mx-auto flex items-center justify-center mb-3">4</div>
              <h4 class="font-bold text-sm text-slate-800 mb-1">Nghiệm thu</h4>
              <p class="text-xs text-slate-500">Trưởng phòng nghiệm thu đạt chất lượng hoặc yêu cầu xử lý lại.</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
              <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-black text-base mx-auto flex items-center justify-center mb-3">5</div>
              <h4 class="font-bold text-sm text-slate-800 mb-1">Hoàn thành & Đánh giá</h4>
              <p class="text-xs text-slate-500">Người gửi tra cứu bằng mã yêu cầu và đánh giá dịch vụ 1 - 5 sao.</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="bg-slate-950 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-xs">
          <p class="font-semibold text-slate-300">NSG SUPPORT © 2026 - HỆ THỐNG PHẢN ÁNH & HỖ TRỢ KỸ THUẬT</p>
          <p class="mt-1 text-slate-500">Được xây dựng phục vụ công tác quản lý và hỗ trợ đào tạo tại cơ sở giáo dục đại học / cao đẳng.</p>
        </footer>
      </div>
    `;
  }
};

window.HomePage = HomePage;
