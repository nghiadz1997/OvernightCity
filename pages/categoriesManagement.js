/**
 * NSG SUPPORT - CATEGORIES & EQUIPMENT MANAGEMENT PAGE
 * Quản lý Danh mục phản ánh & Loại thiết bị (Tên, Icon, SLA cam kết xử lý)
 * Dành riêng cho Super Admin
 */

const CategoriesManagementPage = {
  categories: [],
  isLoading: false,
  searchTerm: '',

  async init() {
    this.isLoading = true;
    try {
      this.categories = await ApiService.loadCategories();
    } catch (e) {
      this.categories = window.APP_CONFIG.CATEGORIES || [];
    }
    this.isLoading = false;
    this.renderList();
  },

  render() {
    setTimeout(() => this.init(), 50);

    return `
      <div class="space-y-6 max-w-5xl mx-auto animate-fade-in p-2 sm:p-4">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                🖥️ Danh mục Kỹ thuật & Thiết bị
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-layer-group text-blue-600"></i>
              <span>QUẢN LÝ LOẠI THIẾT BỊ & DANH MỤC PHẢN ÁNH</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Cấu hình loại thiết bị, biểu tượng hiển thị và cam kết thời gian hoàn thành (SLA).</p>
          </div>

          <button type="button" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="CategoriesManagementPage.openAddModal()">
            <i class="fa-solid fa-plus"></i>
            <span>+ THÊM LOẠI THIẾT BỊ MỚI</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="relative w-full sm:w-80">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            <input type="text" class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Tìm kiếm loại thiết bị..." oninput="CategoriesManagementPage.handleSearch(this.value)">
          </div>

          <div class="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span>Tổng số: <span id="cat-total-count" class="text-blue-600 font-black text-sm">0</span> loại thiết bị</span>
            <button type="button" class="text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer ml-2" onclick="CategoriesManagementPage.init()">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <!-- Grid Cards -->
        <div id="categories-list-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Render dynamically in renderList -->
        </div>

        <!-- Dynamic Modal Container -->
        <div id="cat-modal-container"></div>
      </div>
    `;
  },

  renderList() {
    const container = document.getElementById('categories-list-container');
    const countEl = document.getElementById('cat-total-count');
    if (!container) return;

    let list = this.categories;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(term));
    }

    if (countEl) countEl.innerText = this.categories.length;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <i class="fa-solid fa-box-open text-4xl mb-3 text-slate-300"></i>
          <p class="font-bold text-sm text-slate-600">Không tìm thấy loại thiết bị nào.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(c => {
      const iconClass = c.icon || 'fa-tools';
      const sla = c.slaHours || 24;
      return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl shrink-0 shadow-inner">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">${c.name}</h4>
              <p class="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                <i class="fa-solid fa-clock text-amber-500 text-[10px]"></i>
                <span>SLA: <b>${sla} giờ</b></span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <button type="button" class="p-2 rounded-xl text-blue-600 hover:bg-blue-50 cursor-pointer font-bold" title="Chỉnh sửa" onclick="CategoriesManagementPage.openEditModal('${c.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer font-bold" title="Xóa" onclick="CategoriesManagementPage.deleteCategory('${c.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  handleSearch(term) {
    this.searchTerm = term ? term.trim() : '';
    this.renderList();
  },

  openAddModal() {
    const container = document.getElementById('cat-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="cat-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="CategoriesManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-plus"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">THÊM LOẠI THIẾT BỊ</h3>
              <p class="text-xs text-slate-500">Tạo danh mục sự cố mới cho người dùng chọn</p>
            </div>
          </div>

          <form onsubmit="CategoriesManagementPage.handleAddSubmit(event)" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Tên loại thiết bị / Danh mục <span class="text-red-500">*</span></label>
              <input type="text" id="add-cat-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Ví dụ: Máy lạnh / Điều hòa..." required>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Icon FontAwesome <span class="text-red-500">*</span></label>
              <div class="flex items-center gap-2">
                <input type="text" id="add-cat-icon" class="w-full text-sm p-3 rounded-xl border border-slate-300 font-mono" value="fa-snowflake" placeholder="fa-desktop, fa-print, fa-snowflake..." oninput="document.getElementById('add-cat-icon-preview').className = 'fa-solid ' + this.value">
                <div class="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-lg text-blue-600 shrink-0">
                  <i id="add-cat-icon-preview" class="fa-solid fa-snowflake"></i>
                </div>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Cam kết thời gian xử lý (SLA tính bằng Giờ) <span class="text-red-500">*</span></label>
              <input type="number" id="add-cat-sla" class="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold" value="8" min="1" max="168" required>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer" onclick="CategoriesManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md cursor-pointer">Lưu thiết bị</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-cat-name')?.value.trim();
    const icon = document.getElementById('add-cat-icon')?.value.trim() || 'fa-tools';
    const sla = parseInt(document.getElementById('add-cat-sla')?.value) || 24;

    if (!name) return;

    const newId = 'CAT_' + Date.now().toString(36).toUpperCase();
    this.categories.push({
      id: newId,
      name: name,
      icon: icon,
      slaHours: sla
    });

    await ApiService.saveCategories(this.categories);
    Utils.showToast(`Đã thêm loại thiết bị "${name}"!`, 'success');
    SoundService.playSuccess();
    this.closeModal();
    this.renderList();
  },

  openEditModal(catId) {
    const cat = this.categories.find(c => c.id === catId);
    if (!cat) return;

    const container = document.getElementById('cat-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="cat-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="CategoriesManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">CHỈNH SỬA LOẠI THIẾT BỊ</h3>
              <p class="text-xs text-slate-500 font-medium">${cat.name}</p>
            </div>
          </div>

          <form onsubmit="CategoriesManagementPage.handleEditSubmit(event, '${catId}')" class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Tên loại thiết bị / Danh mục <span class="text-red-500">*</span></label>
              <input type="text" id="edit-cat-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" value="${cat.name}" required>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Icon FontAwesome <span class="text-red-500">*</span></label>
              <div class="flex items-center gap-2">
                <input type="text" id="edit-cat-icon" class="w-full text-sm p-3 rounded-xl border border-slate-300 font-mono" value="${cat.icon || 'fa-tools'}" oninput="document.getElementById('edit-cat-icon-preview').className = 'fa-solid ' + this.value">
                <div class="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-lg text-indigo-600 shrink-0">
                  <i id="edit-cat-icon-preview" class="fa-solid ${cat.icon || 'fa-tools'}"></i>
                </div>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Cam kết thời gian xử lý (SLA tính bằng Giờ) <span class="text-red-500">*</span></label>
              <input type="number" id="edit-cat-sla" class="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold" value="${cat.slaHours || 24}" min="1" max="168" required>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer" onclick="CategoriesManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md cursor-pointer">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleEditSubmit(e, catId) {
    e.preventDefault();
    const name = document.getElementById('edit-cat-name')?.value.trim();
    const icon = document.getElementById('edit-cat-icon')?.value.trim() || 'fa-tools';
    const sla = parseInt(document.getElementById('edit-cat-sla')?.value) || 24;

    if (!name) return;

    const cat = this.categories.find(c => c.id === catId);
    if (cat) {
      cat.name = name;
      cat.icon = icon;
      cat.slaHours = sla;
    }

    await ApiService.saveCategories(this.categories);
    Utils.showToast(`Đã lưu thay đổi loại thiết bị "${name}"!`, 'success');
    this.closeModal();
    this.renderList();
  },

  async deleteCategory(catId) {
    if (this.categories.length <= 1) {
      Utils.showToast('Hệ thống phải có ít nhất 1 loại thiết bị!', 'warning');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa loại thiết bị này?')) return;

    this.categories = this.categories.filter(c => c.id !== catId);
    await ApiService.saveCategories(this.categories);
    Utils.showToast('Đã xóa loại thiết bị thành công!', 'info');
    this.renderList();
  },

  closeModal() {
    const backdrop = document.getElementById('cat-modal-backdrop');
    if (backdrop) backdrop.remove();
  }
};

window.CategoriesManagementPage = CategoriesManagementPage;
