/**
 * NSG SUPPORT - SUPER ADMIN AUDIT & IP TRACKING LOGS PAGE
 * Quản lý & Thống kê lưu vết địa chỉ IP, Thiết bị (Device ID) và Lịch sử đăng nhập / gửi phản ánh
 */

const AuditLogsPage = {
  logs: [],
  stats: {
    totalLogs: 0,
    uniqueIps: 0,
    uniqueDevices: 0,
    uniqueUsers: 0,
    topIps: []
  },
  filterType: 'ALL',
  searchQuery: '',
  isLoading: false,

  async init() {
    await this.fetchLogs();
  },

  async fetchLogs() {
    this.isLoading = true;
    this.updateLoadingUI(true);

    // 1. Thử gọi API máy chủ Node.js nếu đang chạy Backend cục bộ
    try {
      const apiBase = window.APP_CONFIG?.apiBaseUrl || '/api';
      const params = new URLSearchParams();
      if (this.filterType !== 'ALL') params.append('type', this.filterType);
      if (this.searchQuery) params.append('search', this.searchQuery);

      const res = await fetch(`${apiBase}/audit/logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.logs = json.data;
          this.stats = json.stats || this.stats;
          this.renderTable();
          this.renderStats();
          this.isLoading = false;
          this.updateLoadingUI(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[AuditLogsPage] Server API unavailable, loading directly from Cloud Firestore...', apiErr);
    }

    // 2. Chế độ Serverless / GitHub Pages: Đọc trực tiếp từ Cloud Firestore
    try {
      const db = (window.ApiService && typeof ApiService.getDb === 'function')
        ? ApiService.getDb()
        : (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);

      if (!db) {
        throw new Error('Chưa kết nối được với Firebase Firestore.');
      }

      let combinedLogs = [];

      // A. Đọc từ collection 'audit_logs'
      try {
        const auditSnap = await db.collection('audit_logs').limit(150).get();
        auditSnap.forEach(doc => {
          const d = doc.data();
          combinedLogs.push({
            id: doc.id,
            action: d.action || 'LOGIN',
            email: d.email || 'Ẩn danh',
            displayName: d.displayName || 'Người dùng',
            phone: d.phone || '',
            deviceId: d.deviceId || '',
            clientIp: d.clientIp || d.ip || '127.0.0.1',
            userAgent: d.userAgent || navigator.userAgent,
            timestamp: d.createdAt || d.timestamp || new Date().toISOString(),
            details: d.details || (d.provider ? `Đăng nhập qua ${d.provider}` : 'Đăng nhập hệ thống')
          });
        });
      } catch (e) {
        console.warn('Lỗi đọc audit_logs:', e);
      }

      // B. Đọc thông tin audit từ collection 'reports'
      try {
        const reportsSnap = await db.collection('reports').limit(150).get();
        reportsSnap.forEach(doc => {
          const r = doc.data();
          const meta = r.auditMeta || {};
          combinedLogs.push({
            id: 'rep_' + doc.id,
            action: 'SUBMIT_REPORT',
            email: meta.verifiedEmail || r.senderEmail || '',
            displayName: meta.verifiedName || r.senderName || 'Người gửi ẩn danh',
            phone: r.senderPhone || '',
            deviceId: meta.deviceId || r.deviceId || '',
            clientIp: meta.clientIp || r.clientIp || '127.0.0.1',
            userAgent: meta.userAgent || r.userAgent || 'Trình duyệt Web',
            timestamp: r.createdAt || meta.submittedAt || new Date().toISOString(),
            reportCode: r.code || '',
            details: `Gửi phản ánh #${r.code || ''}: ${r.title || r.categoryName || ''} tại ${r.location || ''}`
          });
        });
      } catch (e) {
        console.warn('Lỗi đọc reports:', e);
      }

      // Sắp xếp thời gian mới nhất lên đầu
      combinedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Áp dụng bộ lọc loại hành động
      let filtered = combinedLogs;
      if (this.filterType === 'LOGIN') {
        filtered = filtered.filter(l => l.action === 'LOGIN');
      } else if (this.filterType === 'SUBMIT_REPORT') {
        filtered = filtered.filter(l => l.action === 'SUBMIT_REPORT');
      }

      // Áp dụng tìm kiếm
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(l =>
          (l.clientIp && l.clientIp.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.displayName && l.displayName.toLowerCase().includes(q)) ||
          (l.deviceId && l.deviceId.toLowerCase().includes(q)) ||
          (l.reportCode && l.reportCode.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q))
        );
      }

      // Tính toán KPIs thống kê
      const uniqueIps = new Set(combinedLogs.map(l => l.clientIp).filter(Boolean)).size;
      const uniqueDevices = new Set(combinedLogs.map(l => l.deviceId).filter(Boolean)).size;
      const uniqueUsers = new Set(combinedLogs.map(l => l.email).filter(Boolean)).size;

      const ipCounts = {};
      combinedLogs.forEach(l => {
        if (l.clientIp) ipCounts[l.clientIp] = (ipCounts[l.clientIp] || 0) + 1;
      });
      const topIps = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({ ip, count }));

      this.logs = filtered;
      this.stats = {
        totalLogs: combinedLogs.length,
        uniqueIps,
        uniqueDevices,
        uniqueUsers,
        topIps
      };

      this.renderTable();
      this.renderStats();
    } catch (err) {
      console.error('[AuditLogsPage] Fetch fallback error:', err);
      Utils.showToast('Đang kết nối Firestore để tải dữ liệu nhật ký...', 'info');
      this.renderTable();
      this.renderStats();
    } finally {
      this.isLoading = false;
      this.updateLoadingUI(false);
    }
  },

  updateLoadingUI(loading) {
    const tableBody = document.getElementById('audit-table-body');
    const refreshBtn = document.getElementById('btn-refresh-audit');
    if (refreshBtn) {
      refreshBtn.disabled = loading;
      refreshBtn.innerHTML = loading
        ? '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Đang tải...</span>'
        : '<i class="fa-solid fa-rotate-right"></i><span>Làm mới</span>';
    }
  },

  handleSearch(e) {
    this.searchQuery = e.target.value.trim();
    this.fetchLogs();
  },

  handleFilterType(type) {
    this.filterType = type;
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
      const bType = btn.getAttribute('data-type');
      if (bType === type) {
        btn.classList.remove('bg-slate-100', 'text-slate-600');
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-xs');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-xs');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
      }
    });
    this.fetchLogs();
  },

  copyToClipboard(text, label = 'Địa chỉ IP') {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        Utils.showToast(`Đã sao chép ${label}: ${text}`, 'success', 2500);
      });
    }
  },

  parseUserAgent(ua) {
    if (!ua) return 'Không rõ';
    let os = 'Khác';
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('iPhone')) os = 'iPhone (iOS)';
    else if (ua.includes('iPad')) os = 'iPad (iPadOS)';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Browser';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox/')) browser = 'Firefox';

    return `${browser} trên ${os}`;
  },

  renderStats() {
    const totalEl = document.getElementById('audit-stat-total');
    const ipsEl = document.getElementById('audit-stat-ips');
    const devicesEl = document.getElementById('audit-stat-devices');
    const usersEl = document.getElementById('audit-stat-users');
    const topIpsEl = document.getElementById('audit-top-ips-container');

    if (totalEl) totalEl.innerText = this.stats.totalLogs || 0;
    if (ipsEl) ipsEl.innerText = this.stats.uniqueIps || 0;
    if (devicesEl) devicesEl.innerText = this.stats.uniqueDevices || 0;
    if (usersEl) usersEl.innerText = this.stats.uniqueUsers || 0;

    if (topIpsEl && this.stats.topIps) {
      topIpsEl.innerHTML = this.stats.topIps.map(item => `
        <button type="button" onclick="AuditLogsPage.filterByIp('${item.ip}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-mono font-bold border border-slate-200 transition">
          <span>${item.ip}</span>
          <span class="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">${item.count}</span>
        </button>
      `).join('');
    }
  },

  filterByIp(ip) {
    const searchInput = document.getElementById('audit-search-input');
    if (searchInput) {
      searchInput.value = ip;
      this.searchQuery = ip;
      this.fetchLogs();
    }
  },

  renderTable() {
    const tableBody = document.getElementById('audit-table-body');
    if (!tableBody) return;

    if (this.logs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-fingerprint text-4xl mb-3 block opacity-40"></i>
            <p class="text-sm font-semibold">Không tìm thấy dữ liệu nhật ký nào phù hợp.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = this.logs.map((log, index) => {
      const isReport = log.type === 'REPORT_SUBMIT';
      const actionBadge = isReport
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            <i class="fa-solid fa-paper-plane text-[10px]"></i> GỬI PHẢN ÁNH
          </span>`
        : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
            <i class="fa-solid fa-right-to-bracket text-[10px]"></i> ĐĂNG NHẬP
          </span>`;

      const ip = log.clientIp || 'Unknown';
      const isLocalhost = ip === '::1' || ip === '127.0.0.1';
      const ipBadgeClass = isLocalhost ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';

      const timeFormatted = Utils.formatDateTime(log.createdAt);
      const timeAgoStr = Utils.timeAgo(log.createdAt);
      const userAgentInfo = this.parseUserAgent(log.userAgent);

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs">
          <!-- 1. Thời gian -->
          <td class="p-3.5 whitespace-nowrap text-slate-500 font-medium">
            <div class="font-bold text-slate-900">${timeFormatted}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${timeAgoStr}</div>
          </td>

          <!-- 2. Loại hành động -->
          <td class="p-3.5 whitespace-nowrap">
            <div>${actionBadge}</div>
            ${log.reportCode ? `
              <a href="#/tracking?code=${log.reportCode}" target="_blank" class="mt-1 inline-block text-[11px] font-mono font-bold text-blue-600 hover:underline">
                ${log.reportCode}
              </a>
            ` : ''}
          </td>

          <!-- 3. Người dùng -->
          <td class="p-3.5">
            <div class="font-bold text-slate-900">${log.displayName || 'Ẩn danh'}</div>
            <div class="text-[11px] text-slate-500 truncate max-w-[180px]" title="${log.email}">${log.email || 'N/A'}</div>
            ${log.phone ? `<div class="text-[11px] text-slate-400 font-mono"><i class="fa-solid fa-phone text-[10px] mr-1"></i>${log.phone}</div>` : ''}
          </td>

          <!-- 4. Địa chỉ IP -->
          <td class="p-3.5 whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border ${ipBadgeClass}">
              <i class="fa-solid fa-globe text-[11px] opacity-70"></i>
              <span class="font-mono text-xs select-all">${ip}</span>
              <button type="button" title="Sao chép IP" onclick="AuditLogsPage.copyToClipboard('${ip}')" class="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5">
                <i class="fa-regular fa-copy text-[11px]"></i>
              </button>
            </div>
            ${isLocalhost ? `<div class="text-[10px] text-slate-400 mt-0.5 font-sans">(Localhost / Máy nội bộ)</div>` : ''}
          </td>

          <!-- 5. Thiết bị & Trình duyệt -->
          <td class="p-3.5">
            <div class="font-semibold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-laptop-code text-slate-400"></i>
              <span>${userAgentInfo}</span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title="${log.userAgent}">
              ${log.userAgent}
            </div>
          </td>

          <!-- 6. Device ID (Mã máy) -->
          <td class="p-3.5 whitespace-nowrap">
            <div class="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md max-w-[140px] truncate select-all" title="${log.deviceId}">
              ${log.deviceId || 'N/A'}
            </div>
          </td>

          <!-- 7. Chi tiết / Vị trí -->
          <td class="p-3.5 max-w-[200px]">
            ${log.reportTitle ? `<div class="font-bold text-slate-800 line-clamp-1" title="${log.reportTitle}">${log.reportTitle}</div>` : ''}
            ${log.location ? `<div class="text-[11px] text-slate-500 line-clamp-1"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${log.location}</div>` : ''}
            ${!log.reportTitle && !log.location ? `<span class="text-slate-400 italic">${log.action || 'Đăng nhập thành công'}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  exportExcel() {
    const apiBase = window.APP_CONFIG?.apiBaseUrl || '/api';
    window.open(`${apiBase}/audit/export`, '_blank');
  },

  render() {
    return `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <i class="fa-solid fa-shield-halved"></i> Quyền Super Admin tối cao
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">NHẬT KÝ ĐĂNG NHẬP & THEO DÕI IP</h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-1 font-light">
              Lưu vết địa chỉ IP, Mã thiết bị (Device ID) và Hành vi gửi phản ánh để quản lý & chống phá hoại.
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" id="btn-refresh-audit" onclick="AuditLogsPage.fetchLogs()" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-xs">
              <i class="fa-solid fa-rotate-right"></i>
              <span>Làm mới</span>
            </button>
            <button type="button" onclick="AuditLogsPage.exportExcel()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer">
              <i class="fa-solid fa-file-excel"></i>
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Tổng lượt -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 font-bold">
              <i class="fa-solid fa-list-ol"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Tổng lượt ghi nhận</span>
              <div id="audit-stat-total" class="text-2xl font-black text-slate-900 mt-0.5 font-mono">0</div>
            </div>
          </div>

          <!-- IP riêng biệt -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 font-bold">
              <i class="fa-solid fa-network-wired"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Địa chỉ IP duy nhất</span>
              <div id="audit-stat-ips" class="text-2xl font-black text-indigo-600 mt-0.5 font-mono">0</div>
            </div>
          </div>

          <!-- Thiết bị riêng biệt -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0 font-bold">
              <i class="fa-solid fa-mobile-screen-button"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Mã thiết bị (Device ID)</span>
              <div id="audit-stat-devices" class="text-2xl font-black text-purple-600 mt-0.5 font-mono">0</div>
            </div>
          </div>

          <!-- Người dùng định danh -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 font-bold">
              <i class="fa-solid fa-user-check"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Người dùng xác thực</span>
              <div id="audit-stat-users" class="text-2xl font-black text-emerald-600 mt-0.5 font-mono">0</div>
            </div>
          </div>
        </div>

        <!-- Top IP thường xuyên -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-slate-700 font-bold shrink-0">
            <i class="fa-solid fa-fire text-amber-500"></i>
            <span>Top IP truy cập / gửi nhiều nhất:</span>
          </div>
          <div id="audit-top-ips-container" class="flex items-center gap-2 flex-wrap">
            <span class="text-slate-400 italic">Đang tải...</span>
          </div>
        </div>

        <!-- Controls: Search & Filters -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <!-- Search box -->
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input type="text" id="audit-search-input" oninput="AuditLogsPage.handleSearch(event)" placeholder="Tìm kiếm theo IP, Email, Họ tên, Mã phiếu..." class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 focus:bg-white transition-colors">
          </div>

          <!-- Filter buttons -->
          <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start md:self-auto">
            <button type="button" data-type="ALL" onclick="AuditLogsPage.handleFilterType('ALL')" class="audit-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs transition">
              Tất cả
            </button>
            <button type="button" data-type="REPORT_SUBMIT" onclick="AuditLogsPage.handleFilterType('REPORT_SUBMIT')" class="audit-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              Gửi phản ánh
            </button>
            <button type="button" data-type="LOGIN" onclick="AuditLogsPage.handleFilterType('LOGIN')" class="audit-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              Đăng nhập
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th class="p-3.5">Thời gian</th>
                  <th class="p-3.5">Hành động</th>
                  <th class="p-3.5">Người dùng</th>
                  <th class="p-3.5">Địa chỉ IP</th>
                  <th class="p-3.5">Thiết bị & Trình duyệt</th>
                  <th class="p-3.5">Mã thiết bị (Device ID)</th>
                  <th class="p-3.5">Chi tiết / Vị trí</th>
                </tr>
              </thead>
              <tbody id="audit-table-body" class="divide-y divide-slate-100">
                <tr>
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block text-blue-600"></i>
                    <p class="text-xs font-medium">Đang tải danh sách nhật ký IP...</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};

window.AuditLogsPage = AuditLogsPage;
