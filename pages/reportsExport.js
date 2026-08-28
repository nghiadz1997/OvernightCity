/**
 * NSG SUPPORT - ANALYTICS & REPORTS EXPORT PAGE
 * Báo cáo và xuất file Excel, CSV, In ấn theo yêu cầu mục 29
 */

const ReportsExportPage = {
  render() {
    return `
      <div class="space-y-6">
        <!-- Top Bar -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-file-excel text-emerald-600"></i>
              <span>BÁO CÁO & XUẤT DỮ LIỆU THỐNG KÊ</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Xuất danh sách sự cố và thống kê chỉ số SLA phục vụ báo cáo ban giám hiệu.</p>
          </div>

          <!-- Nút xuất file -->
          <div class="flex items-center gap-2 flex-wrap">
            <button class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2" onclick="ReportsExportPage.exportExcel()">
              <i class="fa-solid fa-file-excel"></i>
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2" onclick="ReportsExportPage.exportCSV()">
              <i class="fa-solid fa-file-csv"></i>
              <span>Xuất CSV</span>
            </button>
            <button class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2" onclick="window.print()">
              <i class="fa-solid fa-print"></i>
              <span>In báo cáo</span>
            </button>
          </div>
        </div>

        <!-- Bảng tổng hợp số liệu -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Bảng dữ liệu chi tiết phản ánh & công việc
            </h3>
            <span class="text-xs font-bold text-slate-500" id="export-count-text">0 bản ghi</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs" id="export-table">
              <thead class="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th class="p-3.5">Mã phiếu</th>
                  <th class="p-3.5">Tiêu đề sự cố</th>
                  <th class="p-3.5">Danh mục</th>
                  <th class="p-3.5">Vị trí</th>
                  <th class="p-3.5">Mức độ</th>
                  <th class="p-3.5">Người gửi</th>
                  <th class="p-3.5">KTV Phụ trách</th>
                  <th class="p-3.5">Trạng thái</th>
                  <th class="p-3.5">Ngày tạo</th>
                  <th class="p-3.5">Đánh giá</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700" id="export-table-body">
                <!-- Sẽ được fill bằng JavaScript -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('export-table-body');
    const countText = document.getElementById('export-count-text');
    if (!tbody) return;

    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    const items = [...allReports, ...allTasks];

    if (countText) countText.innerText = `${items.length} bản ghi`;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-400">Không có dữ liệu.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3.5 font-mono font-bold text-blue-700">${item.code}</td>
        <td class="p-3.5 font-bold text-slate-900 max-w-xs truncate">${item.title}</td>
        <td class="p-3.5 text-slate-600">${item.categoryName || 'Kỹ thuật'}</td>
        <td class="p-3.5 text-slate-600">${item.location || ''} ${item.room ? `(${item.room})` : ''}</td>
        <td class="p-3.5">${Utils.renderPriorityBadge(item.priority)}</td>
        <td class="p-3.5 font-medium">${item.senderName || item.assignedByName || 'Hệ thống'}</td>
        <td class="p-3.5 font-semibold text-indigo-700">${item.assignedToName || 'Chưa phân công'}</td>
        <td class="p-3.5">${Utils.renderStatusBadge(item.status, item.isOverdue)}</td>
        <td class="p-3.5 text-slate-500">${Utils.formatDate(item.createdAt)}</td>
        <td class="p-3.5 font-bold text-amber-600">${item.rating ? `${item.rating} ⭐` : '-'}</td>
      </tr>
    `).join('');
  },

  exportExcel() {
    try {
      const allReports = RealtimeService.reports || [];
      const allTasks = RealtimeService.tasks || [];
      const items = [...allReports, ...allTasks];

      const rows = items.map(d => ({
        'Mã yêu cầu': d.code,
        'Tiêu đề': d.title,
        'Danh mục': d.categoryName || 'Khác',
        'Địa điểm': `${d.location || ''} ${d.room ? `(${d.room})` : ''}`.trim(),
        'Mức độ': d.priority,
        'Trạng thái': d.status,
        'Quá hạn': d.isOverdue ? 'Có' : 'Không',
        'Người gửi': d.senderName || '',
        'Số điện thoại': d.senderPhone || '',
        'Khoa/Phòng': d.senderDept || '',
        'Kỹ thuật viên phụ trách': d.assignedToName || 'Chưa phân công',
        'Ngày tạo': d.createdAt ? Utils.formatDateTime(d.createdAt) : '',
        'Hạn chót': d.deadline ? Utils.formatDateTime(d.deadline) : '',
        'Đánh giá': d.rating ? `${d.rating} sao` : 'Chưa đánh giá'
      }));

      if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo Cáo NSG SUPPORT');
        XLSX.writeFile(workbook, `Bao_Cao_NSG_${Date.now()}.xlsx`);
        Utils.showToast('Đã tải xuống file Excel thành công!', 'success');
      } else {
        // Fallback CSV nếu thư viện XLSX chưa nạp xong
        this.exportCSV();
      }
    } catch (e) {
      Utils.showToast('Lỗi xuất Excel: ' + e.message, 'error');
    }
  },

  exportCSV() {
    const allReports = RealtimeService.reports || [];
    const allTasks = RealtimeService.tasks || [];
    const items = [...allReports, ...allTasks];

    const headers = ['Mã phiếu', 'Tiêu đề', 'Danh mục', 'Địa điểm', 'Mức độ', 'Trạng thái', 'Quá hạn', 'Người gửi', 'KTV phụ trách', 'Ngày tạo', 'Đánh giá'];
    const rows = items.map(d => [
      d.code,
      d.title,
      d.categoryName || 'Khác',
      `${d.location || ''} ${d.room ? `(${d.room})` : ''}`.trim(),
      d.priority,
      d.status,
      d.isOverdue ? 'Có' : 'Không',
      d.senderName || '',
      d.assignedToName || 'Chưa phân công',
      d.createdAt ? Utils.formatDateTime(d.createdAt) : '',
      d.rating ? `${d.rating} sao` : 'Chưa'
    ]);

    Utils.exportToCsv(`Bao_Cao_NSG_${Date.now()}.csv`, headers, rows);
    Utils.showToast('Đã tải xuống file CSV thành công!', 'success');
  }
};

window.ReportsExportPage = ReportsExportPage;
