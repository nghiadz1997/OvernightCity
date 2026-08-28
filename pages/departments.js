/**
 * NSG SUPPORT - DEPARTMENTS MANAGEMENT PAGE
 * Quản lý danh sách Phòng / Khoa / Trung tâm / Bộ phận trực tiếp (Dành riêng cho Super Admin)
 */

const DepartmentsPage = {
  departments: [],
  isLoading: false,
  searchTerm: '',

  async init() {
    this.isLoading = true;
    const body = document.getElementById('departments-list-container');
    if (body) body.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mr-2 text-blue-600"></i> Đang tải danh sách phòng ban từ Firestore...</div>`;
    
    try {
      this.departments = await ApiService.loadDepartments();
    } catch (e) {
      this.departments = window.APP_CONFIG.DEPARTMENTS;
    }
    this.isLoading = false;
    this.renderList();
  },

  render() {
    setTimeout(() => this.init(), 50);

    const isSuperAdmin = AuthService.isSuperAdmin();

    return `
      <div class="space-y-6 max-w-5xl mx-auto animate-fade-in p-2 sm:p-4">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                🏢 Cơ cấu Tổ chức & Đơn vị
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-building-columns text-blue-600"></i>
              <span>QUẢN LÝ PHÒNG / KHOA / TRUNG TÂM / BỘ PHẬN</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Quản lý danh sách các đơn vị tiếp nhận và gửi phản ánh sự cố trên toàn trường.</p>
          </div>

          ${isSuperAdmin ? `
            <button type="button" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="DepartmentsPage.openAddModal()">
              <i class="fa-solid fa-plus"></i>
              <span>+ THÊM ĐƠN VỊ MỚI</span>
            </button>
          ` : ''}
        </div>

        <!-- Search & Stats Bar -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="relative w-full sm:w-80">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            <input type="text" id="dept-search-input" class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Tìm kiếm phòng / khoa..." oninput="DepartmentsPage.handleSearch(this.value)">
          </div>

          <div class="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span>Tổng cộng: <span id="dept-total-count" class="text-blue-600 font-black text-sm">0</span> đơn vị</span>
            <button type="button" class="text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer ml-2" onclick="DepartmentsPage.init()">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <!-- Grid Cards List -->
        <div id="departments-list-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Render dynamically -->
        </div>

        <!-- Dynamic Modal Container -->
        <div id="dept-modal-container"></div>
      </div>
    `;
  },

  renderList() {
    const container = document.getElementById('departments-list-container');
    const totalCountEl = document.getElementById('dept-total-count');
    if (!container) return;

    let list = this.departments;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(d => d.toLowerCase().includes(term));
    }

    if (totalCountEl) totalCountEl.innerText = this.departments.length;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <i class="fa-solid fa-building-circle-xmark text-4xl mb-3 text-slate-300"></i>
          <p class="font-bold text-sm text-slate-600">Không tìm thấy phòng / khoa nào phù hợp.</p>
        </div>
      `;
      return;
    }

    const isSuperAdmin = AuthService.isSuperAdmin();

    container.innerHTML = list.map((d, index) => {
      const isBGH = d === 'Ban Giám Hiệu';
      return `
        <div class="bg-white p-5 rounded-2xl border ${isBGH ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200'} shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl ${isBGH ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-black text-sm shrink-0">
              ${index + 1}
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                <span>${d}</span>
                ${isBGH ? '<span class="text-purple-600" title="Cấp Lãnh đạo"><i class="fa-solid fa-crown text-[10px]"></i></span>' : ''}
              </h4>
              <p class="text-[11px] text-slate-400 font-medium mt-0.5">Đơn vị trực thuộc NSG</p>
            </div>
          </div>

          ${isSuperAdmin ? `
            <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              <button type="button" class="p-2 rounded-xl text-blue-600 hover:bg-blue-50 cursor-pointer font-bold" title="Đổi tên đơn vị" onclick="DepartmentsPage.openEditModal('${d.replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              ${!isBGH ? `
                <button type="button" class="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer font-bold" title="Xóa đơn vị" onclick="DepartmentsPage.handleDelete('${d.replace(/'/g, "\\'")}')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  handleSearch(term) {
    this.searchTerm = term ? term.trim() : '';
    this.renderList();
  },

  openAddModal() {
    const container = document.getElementById('dept-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="dept-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="DepartmentsPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-plus"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">THÊM PHÒNG / KHOA MỚI</h3>
              <p class="text-xs text-slate-500">Tạo mới đơn vị nhận và gửi phản ánh</p>
            </div>
          </div>

          <form onsubmit="DepartmentsPage.handleAddSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên Phòng / Khoa / Trung tâm <span class="text-red-500">*</span></label>
              <input type="text" id="add-dept-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Ví dụ: Khoa Ngoại ngữ, Trung tâm Tin học..." required>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="DepartmentsPage.closeModal()">
                Hủy bỏ
              </button>
              <button type="submit" id="btn-add-dept-submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer">
                Thêm đơn vị
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    setTimeout(() => {
      const input = document.getElementById('add-dept-name');
      if (input) input.focus();
    }, 100);
  },

  async handleAddSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('add-dept-name');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    const btn = document.getElementById('btn-add-dept-submit');
    if (btn) { btn.disabled = true; btn.innerText = 'Đang thêm...'; }

    try {
      this.departments = await ApiService.addDepartment(name);
      Utils.showToast(`Đã thêm thành công đơn vị: "${name}"!`, 'success');
      SoundService.playSuccess();
      this.closeModal();
      this.renderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerText = 'Thêm đơn vị'; }
    }
  },

  openEditModal(oldName) {
    const container = document.getElementById('dept-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="dept-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="DepartmentsPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">CHỈNH SỬA TÊN ĐƠN VỊ</h3>
              <p class="text-xs text-slate-500 font-medium">${oldName}</p>
            </div>
          </div>

          <form onsubmit="DepartmentsPage.handleEditSubmit(event, '${oldName.replace(/'/g, "\\'")}')" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên mới cho Phòng / Khoa <span class="text-red-500">*</span></label>
              <input type="text" id="edit-dept-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" value="${oldName}" required>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="DepartmentsPage.closeModal()">
                Hủy bỏ
              </button>
              <button type="submit" id="btn-edit-dept-submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleEditSubmit(e, oldName) {
    e.preventDefault();
    const input = document.getElementById('edit-dept-name');
    const newName = input ? input.value.trim() : '';
    if (!newName || newName === oldName) {
      this.closeModal();
      return;
    }

    const btn = document.getElementById('btn-edit-dept-submit');
    if (btn) { btn.disabled = true; btn.innerText = 'Đang lưu...'; }

    try {
      this.departments = await ApiService.updateDepartment(oldName, newName);
      Utils.showToast(`Đã đổi tên thành: "${newName}" thành công!`, 'success');
      SoundService.playSuccess();
      this.closeModal();
      this.renderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerText = 'Lưu thay đổi'; }
    }
  },

  async handleDelete(deptName) {
    if (!confirm(`XÁC NHẬN XÓA:\nBạn có chắc chắn muốn xóa đơn vị "${deptName}" khỏi danh sách phòng ban hệ thống?`)) {
      return;
    }

    try {
      this.departments = await ApiService.deleteDepartment(deptName);
      Utils.showToast(`Đã xóa đơn vị "${deptName}" thành công!`, 'info');
      this.renderList();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  closeModal() {
    const backdrop = document.getElementById('dept-modal-backdrop');
    if (backdrop) backdrop.remove();
  }
};

window.DepartmentsPage = DepartmentsPage;
