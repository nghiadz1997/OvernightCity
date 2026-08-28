/**
 * NSG SUPPORT - LOCATIONS MANAGEMENT PAGE
 * Quản lý cấu trúc địa điểm 3 tầng: Cơ sở -> Khu vực / Tòa nhà -> Phòng / Vị trí cụ thể
 * Dành riêng cho Super Admin
 */

const LocationsManagementPage = {
  campuses: [],
  selectedCampusId: null,
  selectedZoneId: null,
  isLoading: false,

  async init() {
    this.isLoading = true;
    try {
      this.campuses = await ApiService.loadCampuses();
    } catch (e) {
      this.campuses = window.APP_CONFIG.CAMPUSES || [];
    }

    if (this.campuses.length > 0 && !this.selectedCampusId) {
      this.selectedCampusId = this.campuses[0].id;
      if (this.campuses[0].zones && this.campuses[0].zones.length > 0) {
        this.selectedZoneId = this.campuses[0].zones[0].id;
      }
    }
    this.isLoading = false;
    this.renderMain();
  },

  render() {
    setTimeout(() => this.init(), 50);

    return `
      <div class="space-y-6 max-w-6xl mx-auto animate-fade-in p-2 sm:p-4">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                🏛️ Hạ tầng Cơ sở vật chất
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-map-location-dot text-blue-600"></i>
              <span>QUẢN LÝ ĐỊA ĐIỂM (CƠ SỞ ➔ KHU VỰC ➔ PHÒNG)</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">Cấu hình danh mục Cơ sở, Khu vực / Tòa nhà và danh sách các phòng học, phòng chức năng.</p>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button type="button" class="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer" onclick="LocationsManagementPage.openAddCampusModal()">
              <i class="fa-solid fa-plus"></i>
              <span>+ THÊM CƠ SỞ MỚI</span>
            </button>
          </div>
        </div>

        <!-- 3-Column Interactive Layout -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5" id="locations-editor-container">
          <!-- Render dynamically in renderMain -->
        </div>

        <!-- Dynamic Modal Container -->
        <div id="loc-modal-container"></div>
      </div>
    `;
  },

  renderMain() {
    const container = document.getElementById('locations-editor-container');
    if (!container) return;

    const currentCampus = this.campuses.find(c => c.id === this.selectedCampusId) || this.campuses[0];
    const currentZone = currentCampus?.zones?.find(z => z.id === this.selectedZoneId) || currentCampus?.zones?.[0];

    container.innerHTML = `
      <!-- CỘT 1: DANH SÁCH CƠ SỞ (4 Cột) -->
      <div class="md:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
            <span>CƠ SỞ (${this.campuses.length})</span>
          </h3>
          <button type="button" class="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer" onclick="LocationsManagementPage.openAddCampusModal()">
            + Thêm
          </button>
        </div>

        <div class="space-y-2">
          ${this.campuses.map(campus => {
            const isSelected = campus.id === this.selectedCampusId;
            return `
              <div class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'border-blue-500 bg-blue-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}" onclick="LocationsManagementPage.selectCampus('${campus.id}')">
                <div class="flex items-center gap-3 min-w-0">
                  <i class="fa-solid fa-school ${isSelected ? 'text-blue-600' : 'text-slate-400'} text-base"></i>
                  <div class="truncate">
                    <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">${campus.name}</h4>
                    <p class="text-[11px] text-slate-500 font-medium">${(campus.zones || []).length} Khu vực / Tòa nhà</p>
                  </div>
                </div>

                <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                  <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer" title="Đổi tên cơ sở" onclick="LocationsManagementPage.openEditCampusModal('${campus.id}', '${campus.name.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                  </button>
                  ${this.campuses.length > 1 ? `
                    <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer" title="Xóa cơ sở" onclick="LocationsManagementPage.deleteCampus('${campus.id}')">
                      <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- CỘT 2: DANH SÁCH KHU VỰC / TÒA NHÀ (4 Cột) -->
      <div class="md:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">2</span>
            <span>KHU VỰC / TÒA NHÀ (${(currentCampus?.zones || []).length})</span>
          </h3>
          ${currentCampus ? `
            <button type="button" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer" onclick="LocationsManagementPage.openAddZoneModal('${currentCampus.id}')">
              + Thêm
            </button>
          ` : ''}
        </div>

        ${!currentCampus ? `
          <div class="p-8 text-center text-xs text-slate-400">Vui lòng chọn cơ sở bên trái.</div>
        ` : (currentCampus.zones || []).length === 0 ? `
          <div class="p-8 text-center text-xs text-slate-400">Chưa có khu vực nào. Hãy bấm <b>+ Thêm</b> ở trên.</div>
        ` : `
          <div class="space-y-2">
            ${(currentCampus.zones || []).map(zone => {
              const isSelected = zone.id === this.selectedZoneId;
              return `
                <div class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'border-indigo-500 bg-indigo-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}" onclick="LocationsManagementPage.selectZone('${zone.id}')">
                  <div class="flex items-center gap-3 min-w-0">
                    <i class="fa-solid fa-cubes-stacked ${isSelected ? 'text-indigo-600' : 'text-slate-400'} text-base"></i>
                    <div class="truncate">
                      <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">${zone.name}</h4>
                      <p class="text-[11px] text-slate-500 font-medium">${(zone.rooms || []).length} Phòng / Vị trí</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                    <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer" title="Đổi tên khu vực" onclick="LocationsManagementPage.openEditZoneModal('${currentCampus.id}', '${zone.id}', '${zone.name.replace(/'/g, "\\'")}')">
                      <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer" title="Xóa khu vực" onclick="LocationsManagementPage.deleteZone('${currentCampus.id}', '${zone.id}')">
                      <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- CỘT 3: DANH SÁCH PHÒNG / VỊ TRÍ (4 Cột) -->
      <div class="md:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">3</span>
            <span>PHÒNG / VỊ TRÍ (${(currentZone?.rooms || []).length})</span>
          </h3>
          ${currentZone ? `
            <button type="button" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer" onclick="LocationsManagementPage.openAddRoomModal('${currentCampus.id}', '${currentZone.id}')">
              + Thêm phòng
            </button>
          ` : ''}
        </div>

        ${!currentZone ? `
          <div class="p-8 text-center text-xs text-slate-400">Vui lòng chọn Khu vực ở giữa.</div>
        ` : (currentZone.rooms || []).length === 0 ? `
          <div class="p-8 text-center text-xs text-slate-400">Chưa có phòng nào. Hãy bấm <b>+ Thêm phòng</b>.</div>
        ` : `
          <div class="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-1">
            ${(currentZone.rooms || []).map(room => `
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all flex items-center justify-between gap-2 group">
                <div class="flex items-center gap-2.5 min-w-0">
                  <i class="fa-solid fa-door-open text-emerald-600 text-xs shrink-0"></i>
                  <span class="text-xs font-bold text-slate-800 truncate">${room}</span>
                </div>
                <button type="button" class="p-1 rounded-md text-slate-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" title="Xóa phòng" onclick="LocationsManagementPage.deleteRoom('${currentCampus.id}', '${currentZone.id}', '${room.replace(/'/g, "\\'")}')">
                  <i class="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  selectCampus(campusId) {
    this.selectedCampusId = campusId;
    const campus = this.campuses.find(c => c.id === campusId);
    this.selectedZoneId = campus?.zones?.[0]?.id || null;
    this.renderMain();
  },

  selectZone(zoneId) {
    this.selectedZoneId = zoneId;
    this.renderMain();
  },

  // MODAL & ACTIONS: CƠ SỞ
  openAddCampusModal() {
    const container = document.getElementById('loc-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="loc-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="LocationsManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 class="text-lg font-black text-slate-900 mb-1">THÊM CƠ SỞ MỚI</h3>
          <p class="text-xs text-slate-500 mb-5">Tạo Cơ sở mới trong hệ thống phân cấp địa điểm</p>
          <form onsubmit="LocationsManagementPage.handleAddCampusSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên Cơ sở <span class="text-red-500">*</span></label>
              <input type="text" id="add-campus-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Ví dụ: Cơ sở 4 (Phân hiệu Mới)" required>
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="LocationsManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer">Lưu Cơ sở</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleAddCampusSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-campus-name')?.value.trim();
    if (!name) return;

    const newId = 'CS_' + Date.now().toString(36);
    this.campuses.push({
      id: newId,
      name: name,
      zones: []
    });

    await ApiService.saveCampuses(this.campuses);
    Utils.showToast(`Đã thêm cơ sở "${name}" thành công!`, 'success');
    SoundService.playSuccess();
    this.selectedCampusId = newId;
    this.closeModal();
    this.renderMain();
  },

  openEditCampusModal(campusId, oldName) {
    const container = document.getElementById('loc-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="loc-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="LocationsManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 class="text-lg font-black text-slate-900 mb-1">ĐỔI TÊN CƠ SỞ</h3>
          <p class="text-xs text-slate-500 mb-5">${oldName}</p>
          <form onsubmit="LocationsManagementPage.handleEditCampusSubmit(event, '${campusId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên mới cho Cơ sở <span class="text-red-500">*</span></label>
              <input type="text" id="edit-campus-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" value="${oldName}" required>
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="LocationsManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleEditCampusSubmit(e, campusId) {
    e.preventDefault();
    const newName = document.getElementById('edit-campus-name')?.value.trim();
    if (!newName) return;

    const c = this.campuses.find(x => x.id === campusId);
    if (c) c.name = newName;

    await ApiService.saveCampuses(this.campuses);
    Utils.showToast(`Đã đổi tên cơ sở thành "${newName}"!`, 'success');
    this.closeModal();
    this.renderMain();
  },

  async deleteCampus(campusId) {
    if (!confirm('Bạn có chắc chắn muốn xóa Cơ sở này cùng toàn bộ Khu vực & Phòng trực thuộc?')) return;
    this.campuses = this.campuses.filter(c => c.id !== campusId);
    this.selectedCampusId = this.campuses[0]?.id || null;
    await ApiService.saveCampuses(this.campuses);
    Utils.showToast('Đã xóa cơ sở thành công!', 'info');
    this.renderMain();
  },

  // MODAL & ACTIONS: KHU VỰC
  openAddZoneModal(campusId) {
    const container = document.getElementById('loc-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="loc-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="LocationsManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 class="text-lg font-black text-slate-900 mb-1">THÊM KHU VỰC / TÒA NHÀ</h3>
          <p class="text-xs text-slate-500 mb-5">Thêm khu vực trực thuộc Cơ sở đã chọn</p>
          <form onsubmit="LocationsManagementPage.handleAddZoneSubmit(event, '${campusId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên Khu vực / Tòa nhà <span class="text-red-500">*</span></label>
              <input type="text" id="add-zone-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold" placeholder="Ví dụ: Khu E (Thực hành), Tòa nhà C..." required>
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="LocationsManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer">Lưu Khu vực</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleAddZoneSubmit(e, campusId) {
    e.preventDefault();
    const name = document.getElementById('add-zone-name')?.value.trim();
    if (!name) return;

    const campus = this.campuses.find(c => c.id === campusId);
    if (!campus) return;

    if (!campus.zones) campus.zones = [];
    const newZoneId = 'ZONE_' + Date.now().toString(36);
    campus.zones.push({
      id: newZoneId,
      name: name,
      rooms: []
    });

    await ApiService.saveCampuses(this.campuses);
    Utils.showToast(`Đã thêm khu vực "${name}"!`, 'success');
    this.selectedZoneId = newZoneId;
    this.closeModal();
    this.renderMain();
  },

  openEditZoneModal(campusId, zoneId, oldName) {
    const container = document.getElementById('loc-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="loc-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="LocationsManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 class="text-lg font-black text-slate-900 mb-1">ĐỔI TÊN KHU VỰC</h3>
          <p class="text-xs text-slate-500 mb-5">${oldName}</p>
          <form onsubmit="LocationsManagementPage.handleEditZoneSubmit(event, '${campusId}', '${zoneId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên mới cho Khu vực <span class="text-red-500">*</span></label>
              <input type="text" id="edit-zone-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold" value="${oldName}" required>
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="LocationsManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleEditZoneSubmit(e, campusId, zoneId) {
    e.preventDefault();
    const newName = document.getElementById('edit-zone-name')?.value.trim();
    if (!newName) return;

    const campus = this.campuses.find(c => c.id === campusId);
    const zone = campus?.zones?.find(z => z.id === zoneId);
    if (zone) zone.name = newName;

    await ApiService.saveCampuses(this.campuses);
    Utils.showToast(`Đã đổi tên khu vực thành "${newName}"!`, 'success');
    this.closeModal();
    this.renderMain();
  },

  async deleteZone(campusId, zoneId) {
    if (!confirm('Bạn có chắc chắn muốn xóa Khu vực này cùng các Phòng trực thuộc?')) return;
    const campus = this.campuses.find(c => c.id === campusId);
    if (campus) {
      campus.zones = (campus.zones || []).filter(z => z.id !== zoneId);
      this.selectedZoneId = campus.zones[0]?.id || null;
      await ApiService.saveCampuses(this.campuses);
      Utils.showToast('Đã xóa khu vực thành công!', 'info');
      this.renderMain();
    }
  },

  // MODAL & ACTIONS: PHÒNG
  openAddRoomModal(campusId, zoneId) {
    const container = document.getElementById('loc-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="loc-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
          <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer" onclick="LocationsManagementPage.closeModal()">
            <i class="fa-solid fa-xmark text-xl"></i>
          </button>
          <h3 class="text-lg font-black text-slate-900 mb-1">THÊM PHÒNG / VỊ TRÍ</h3>
          <p class="text-xs text-slate-500 mb-5">Thêm phòng mới hoặc danh sách phòng (cách nhau dấu phẩy)</p>
          <form onsubmit="LocationsManagementPage.handleAddRoomSubmit(event, '${campusId}', '${zoneId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên phòng / vị trí <span class="text-red-500">*</span></label>
              <input type="text" id="add-room-name" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-semibold" placeholder="Ví dụ: Phòng A105 hoặc nhập nhiều: A106, A107, A108" required>
              <p class="text-[11px] text-slate-400 mt-1">Mẹo: Có thể nhập nhiều phòng cùng lúc cách nhau bằng dấu phẩy <code>,</code></p>
            </div>
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer" onclick="LocationsManagementPage.closeModal()">Hủy</button>
              <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer">Lưu Phòng</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleAddRoomSubmit(e, campusId, zoneId) {
    e.preventDefault();
    const raw = document.getElementById('add-room-name')?.value.trim();
    if (!raw) return;

    const campus = this.campuses.find(c => c.id === campusId);
    const zone = campus?.zones?.find(z => z.id === zoneId);
    if (!zone) return;

    if (!zone.rooms) zone.rooms = [];
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(p => {
      if (!zone.rooms.includes(p)) zone.rooms.push(p);
    });

    await ApiService.saveCampuses(this.campuses);
    Utils.showToast(`Đã thêm ${parts.length} phòng vào ${zone.name}!`, 'success');
    this.closeModal();
    this.renderMain();
  },

  async deleteRoom(campusId, zoneId, roomName) {
    const campus = this.campuses.find(c => c.id === campusId);
    const zone = campus?.zones?.find(z => z.id === zoneId);
    if (zone && zone.rooms) {
      zone.rooms = zone.rooms.filter(r => r !== roomName);
      await ApiService.saveCampuses(this.campuses);
      Utils.showToast(`Đã xóa phòng "${roomName}"!`, 'info');
      this.renderMain();
    }
  },

  closeModal() {
    const backdrop = document.getElementById('loc-modal-backdrop');
    if (backdrop) backdrop.remove();
  }
};

window.LocationsManagementPage = LocationsManagementPage;
