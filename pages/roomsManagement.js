/**
 * NSG SUPPORT - QUẢN LÝ PHÒNG NSG & THIẾT BỊ / MÁY TÍNH PC (v8.1)
 * Cấu trúc: Cơ sở -> Khu vực / Tòa nhà -> Phòng -> Loại phòng -> Thiết bị -> Máy tính PC & Lý lịch phần cứng
 * Chế độ XEM (View Readonly) trực quan, chi tiết, không cho sửa trực tiếp tại trang xem
 */

const RoomsManagementPage = {
  rooms: [],
  campuses: [],
  pcs: [],
  isLoading: true,
  currentFilterCampus: 'ALL',
  currentFilterZone: 'ALL',
  currentFilterType: 'ALL',
  currentFilterStatus: 'ALL',
  searchQuery: '',

  // Cache modal state
  activeRoomId: null,
  activePCId: null,

  async init() {
    await this.loadData();
  },

  async loadData() {
    this.isLoading = true;
    const body = document.getElementById('rooms-table-body');
    if (body) body.innerHTML = this.renderLoading();

    try {
      const [campusesList, roomsList, pcsList] = await Promise.all([
        ApiService.loadCampuses(),
        ApiService.loadRooms(),
        ApiService.loadPCs()
      ]);

      this.campuses = campusesList || [];
      this.rooms = roomsList || [];
      this.pcs = pcsList || [];
    } catch (err) {
      console.error('[RoomsManagementPage] Lỗi tải dữ liệu:', err);
      Utils.showToast('Lỗi tải dữ liệu phòng: ' + err.message, 'error');
    }

    this.isLoading = false;
    this.renderView();
  },

  updateStats() {
    const totalCampusesEl = document.getElementById('stat-r-campuses');
    const totalZonesEl = document.getElementById('stat-r-zones');
    const totalRoomsEl = document.getElementById('stat-r-total');
    const theoryRoomsEl = document.getElementById('stat-r-theory');
    const practiceRoomsEl = document.getElementById('stat-r-practice');
    const facultyRoomsEl = document.getElementById('stat-r-faculty');
    const funcRoomsEl = document.getElementById('stat-r-func');
    const totalPCsEl = document.getElementById('stat-r-pcs');
    const totalDevicesEl = document.getElementById('stat-r-devices');
    const maintDevicesEl = document.getElementById('stat-r-maint-devices');

    let totalZones = 0;
    this.campuses.forEach(c => {
      totalZones += (c.zones || []).length;
    });

    const totalRooms = this.rooms.length;
    const theoryRooms = this.rooms.filter(r => r.roomType === 'Lý thuyết').length;
    const practiceRooms = this.rooms.filter(r => r.roomType === 'Thực hành').length;
    const facultyRooms = this.rooms.filter(r => r.roomType === 'Văn phòng khoa').length;
    const funcRooms = this.rooms.filter(r => r.roomType === 'Phòng chức năng' || r.roomType === 'Phòng họp' || r.roomType === 'Phòng hội thảo').length;

    const totalPCs = this.pcs.length;

    let totalDevices = 0;
    let maintDevices = 0;
    this.rooms.forEach(r => {
      (r.devices || []).forEach(d => {
        const qty = Number(d.quantity) || 0;
        totalDevices += qty;
        if (d.status === 'Cần bảo trì' || d.status === 'Hư hỏng' || d.status === 'Đang sửa chữa') {
          maintDevices += qty;
        }
      });
    });

    if (totalCampusesEl) totalCampusesEl.innerText = this.campuses.length;
    if (totalZonesEl) totalZonesEl.innerText = totalZones;
    if (totalRoomsEl) totalRoomsEl.innerText = totalRooms;
    if (theoryRoomsEl) theoryRoomsEl.innerText = theoryRooms;
    if (practiceRoomsEl) practiceRoomsEl.innerText = practiceRooms;
    if (facultyRoomsEl) facultyRoomsEl.innerText = facultyRooms;
    if (funcRoomsEl) funcRoomsEl.innerText = funcRooms;
    if (totalPCsEl) totalPCsEl.innerText = totalPCs;
    if (totalDevicesEl) totalDevicesEl.innerText = totalDevices;
    if (maintDevicesEl) maintDevicesEl.innerText = maintDevices;
  },

  renderLoading() {
    return `
      <tr>
        <td colspan="9" class="p-12 text-center text-slate-400">
          <div class="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
          <p class="text-xs font-bold text-slate-600">Đang tải danh sách phòng và cơ sở vật chất...</p>
        </td>
      </tr>
    `;
  },

  render() {
    setTimeout(() => this.init(), 50);

    const isSuperAdmin = AuthService.isSuperAdmin();
    const canEdit = AuthService.canManageUsers() || isSuperAdmin;

    return `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <!-- Top Title & Action Bar -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <i class="fa-solid fa-building-shield text-blue-600"></i>
                <span>Cơ sở ➔ Tòa nhà ➔ Phòng ➔ Thiết bị ➔ Máy tính PC</span>
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <i class="fa-solid fa-door-open text-blue-600"></i>
              <span>QUẢN LÝ PHÒNG NSG</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý cơ sở vật chất phòng học, văn phòng khoa, phòng chức năng, thiết bị và lý lịch cấu hình máy tính PC
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button type="button" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="RoomsManagementPage.exportExcel()">
              <i class="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
              <span class="hidden sm:inline">Xuất Excel</span>
            </button>

            <button type="button" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="window.print()">
              <i class="fa-solid fa-print text-slate-600 text-sm"></i>
              <span class="hidden sm:inline">In danh sách</span>
            </button>

            ${canEdit ? `
              <button type="button" class="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs" onclick="RoomsManagementPage.openCampusModal()">
                <i class="fa-solid fa-cubes-stacked text-amber-400"></i>
                <span>Cơ sở & Tòa nhà</span>
              </button>

              <button type="button" class="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5" onclick="RoomsManagementPage.openCreateRoomModal()">
                <i class="fa-solid fa-plus text-sm"></i>
                <span>+ THÊM PHÒNG MỚI</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 10 Metric Stat Cards (Mục 13) -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <!-- 1. Cơ sở -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-school"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng cơ sở</p>
              <h3 id="stat-r-campuses" class="text-xl font-black text-slate-900">0</h3>
            </div>
          </div>

          <!-- 2. Tòa nhà -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-building"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tòa nhà / Khu vực</p>
              <h3 id="stat-r-zones" class="text-xl font-black text-indigo-600">0</h3>
            </div>
          </div>

          <!-- 3. Tổng phòng -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-door-closed"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng số phòng</p>
              <h3 id="stat-r-total" class="text-xl font-black text-slate-900">0</h3>
            </div>
          </div>

          <!-- 4. Lý thuyết -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-chalkboard-user"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phòng lý thuyết</p>
              <h3 id="stat-r-theory" class="text-xl font-black text-cyan-700">0</h3>
            </div>
          </div>

          <!-- 5. Thực hành -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-flask-vial"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phòng thực hành</p>
              <h3 id="stat-r-practice" class="text-xl font-black text-purple-700">0</h3>
            </div>
          </div>

          <!-- 6. Văn phòng khoa -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-briefcase"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Văn phòng khoa</p>
              <h3 id="stat-r-faculty" class="text-xl font-black text-amber-700">0</h3>
            </div>
          </div>

          <!-- 7. Phòng chức năng -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-people-roof"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phòng chức năng</p>
              <h3 id="stat-r-func" class="text-xl font-black text-emerald-700">0</h3>
            </div>
          </div>

          <!-- 8. Tổng số PC -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
              <i class="fa-solid fa-desktop"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng máy PC</p>
              <h3 id="stat-r-pcs" class="text-xl font-black text-blue-700">0</h3>
            </div>
          </div>

          <!-- 9. Tổng thiết bị -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng thiết bị</p>
              <h3 id="stat-r-devices" class="text-xl font-black text-teal-700">0</h3>
            </div>
          </div>

          <!-- 10. Thiết bị cần bảo trì -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cần bảo trì</p>
              <h3 id="stat-r-maint-devices" class="text-xl font-black text-rose-600">0</h3>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Mục 14) -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <!-- Ô tìm kiếm -->
            <div class="relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" id="room-search-input" placeholder="Tìm theo mã phòng, tên phòng, người phụ trách..." class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" oninput="RoomsManagementPage.handleSearch(this.value)">
            </div>

            <!-- 1. Lọc Cơ sở -->
            <div>
              <select id="room-campus-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" onchange="RoomsManagementPage.handleCampusFilter(this.value)">
                <option value="ALL">-- Tất cả cơ sở --</option>
                ${this.campuses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>

            <!-- 2. Lọc Khu vực / Tòa nhà -->
            <div>
              <select id="room-zone-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500" onchange="RoomsManagementPage.handleZoneFilter(this.value)">
                <option value="ALL">-- Tất cả khu vực / tòa --</option>
              </select>
            </div>

            <!-- 3. Lọc Loại phòng -->
            <div>
              <select id="room-type-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500" onchange="RoomsManagementPage.handleTypeFilter(this.value)">
                <option value="ALL">-- Tất cả loại phòng --</option>
                <option value="Lý thuyết">Lý thuyết</option>
                <option value="Thực hành">Thực hành</option>
                <option value="Văn phòng khoa">Văn phòng khoa</option>
                <option value="Phòng chức năng">Phòng chức năng</option>
                <option value="Phòng họp">Phòng họp</option>
                <option value="Phòng hội thảo">Phòng hội thảo</option>
                <option value="Phòng kho">Phòng kho</option>
                <option value="Phòng máy">Phòng máy</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <!-- 4. Lọc Trạng thái -->
            <div>
              <select id="room-status-filter" class="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500" onchange="RoomsManagementPage.handleStatusFilter(this.value)">
                <option value="ALL">-- Tất cả tình trạng --</option>
                <option value="Đang sử dụng">Đang sử dụng</option>
                <option value="Đang bảo trì">Đang bảo trì</option>
                <option value="Tạm ngưng">Tạm ngưng</option>
                <option value="Không sử dụng">Không sử dụng</option>
              </select>
            </div>
          </div>
        </div>

        <!-- BẢNG DANH SÁCH PHÒNG (Mục 14) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th class="py-4 px-3 text-center w-12">STT</th>
                  <th class="py-4 px-3">CƠ SỞ</th>
                  <th class="py-4 px-3">KHU VỰC / TÒA</th>
                  <th class="py-4 px-4">MÃ & TÊN PHÒNG</th>
                  <th class="py-4 px-3">LOẠI PHÒNG</th>
                  <th class="py-4 px-3 text-center">THIẾT BỊ</th>
                  <th class="py-4 px-3 text-center">MÁY PC</th>
                  <th class="py-4 px-3 text-center">TÌNH TRẠNG</th>
                  <th class="py-4 px-4 text-center w-36">THAO TÁC</th>
                </tr>
              </thead>
              <tbody id="rooms-table-body" class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                ${this.renderLoading()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Container Modal Chi tiết, Phòng & PC -->
      <div id="rooms-modal-container"></div>
    `;
  },

  renderView() {
    const body = document.getElementById('rooms-table-body');
    if (body) body.innerHTML = this.renderRows();
    this.updateStats();
    this.updateZoneFilterOptions();
  },

  updateZoneFilterOptions() {
    const zoneSelect = document.getElementById('room-zone-filter');
    if (!zoneSelect) return;

    let zones = [];
    if (this.currentFilterCampus === 'ALL') {
      this.campuses.forEach(c => {
        zones = zones.concat(c.zones || []);
      });
    } else {
      const selectedC = this.campuses.find(c => c.id === this.currentFilterCampus);
      if (selectedC) zones = selectedC.zones || [];
    }

    zoneSelect.innerHTML = `
      <option value="ALL">-- Tất cả khu vực / tòa --</option>
      ${zones.map(z => `<option value="${z.id}" ${this.currentFilterZone === z.id ? 'selected' : ''}>${z.name}</option>`).join('')}
    `;
  },

  getFilteredRooms() {
    return this.rooms.filter(r => {
      if (this.currentFilterCampus !== 'ALL' && r.campusId !== this.currentFilterCampus) return false;
      if (this.currentFilterZone !== 'ALL' && r.zoneId !== this.currentFilterZone) return false;
      if (this.currentFilterType !== 'ALL' && r.roomType !== this.currentFilterType) return false;
      if (this.currentFilterStatus !== 'ALL' && r.status !== this.currentFilterStatus) return false;

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchCode = (r.roomCode || '').toLowerCase().includes(q);
        const matchName = (r.roomName || '').toLowerCase().includes(q);
        const matchManager = (r.managerName || '').toLowerCase().includes(q);
        const matchLocation = (r.locationDetail || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchManager && !matchLocation) return false;
      }

      return true;
    });
  },

  renderRows() {
    const filtered = this.getFilteredRooms();

    if (filtered.length === 0) {
      return `
        <tr>
          <td colspan="9" class="p-12 text-center text-slate-400">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl mx-auto mb-2">
              <i class="fa-solid fa-door-open"></i>
            </div>
            <p class="text-xs font-bold text-slate-700">Chưa có phòng nào phù hợp.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Bấm nút "+ THÊM PHÒNG MỚI" ở góc trên để tạo phòng đầu tiên.</p>
          </td>
        </tr>
      `;
    }

    const canEdit = AuthService.canManageUsers() || AuthService.isSuperAdmin();

    return filtered.map((room, index) => {
      const isFacultyOrFunction = room.roomType === 'Văn phòng khoa' || room.roomType === 'Phòng chức năng' || room.roomType === 'Phòng máy';
      const devCount = (room.devices || []).reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      const roomPcs = this.pcs.filter(p => p.roomId === room.id);
      const pcCount = roomPcs.length;

      // Badge loại phòng
      let typeBadge = '';
      if (room.roomType === 'Lý thuyết') typeBadge = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      else if (room.roomType === 'Thực hành') typeBadge = 'bg-purple-50 text-purple-800 border-purple-200';
      else if (room.roomType === 'Văn phòng khoa') typeBadge = 'bg-amber-50 text-amber-800 border-amber-200 font-black';
      else if (room.roomType === 'Phòng chức năng') typeBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      else typeBadge = 'bg-slate-100 text-slate-700 border-slate-200';

      // Badge tình trạng
      let statusBadge = '';
      if (room.status === 'Đang sử dụng') statusBadge = 'bg-emerald-100 text-emerald-800';
      else if (room.status === 'Đang bảo trì') statusBadge = 'bg-amber-100 text-amber-800';
      else statusBadge = 'bg-slate-200 text-slate-700';

      return `
        <tr class="hover:bg-blue-50/20 transition-colors">
          <!-- 1. STT -->
          <td class="py-3.5 px-3 text-center text-slate-400 font-bold text-xs">${String(index + 1).padStart(2, '0')}</td>

          <!-- 2. CƠ SỞ -->
          <td class="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-school text-slate-400 text-xs"></i>
              <span>${room.campusName || 'Cơ sở chính'}</span>
            </div>
          </td>

          <!-- 3. KHU VỰC / TÒA NHÀ -->
          <td class="py-3.5 px-3 text-slate-700 font-medium whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold">
              ${room.zoneName || 'Tòa A'}
            </span>
          </td>

          <!-- 4. MÃ & TÊN PHÒNG -->
          <td class="py-3.5 px-4">
            <div class="min-w-0">
              <div class="font-black text-slate-900 truncate flex items-center gap-1.5 cursor-pointer hover:text-blue-600" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}')">
                <span class="font-mono text-blue-600 font-bold">[${room.roomCode || 'P-000'}]</span>
                <span>${room.roomName || 'Phòng'}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">${room.floor || 'Tầng 1'} ${room.locationDetail ? '• ' + room.locationDetail : ''} ${room.managerName ? '• QL: ' + room.managerName : ''}</p>
            </div>
          </td>

          <!-- 5. LOẠI PHÒNG -->
          <td class="py-3.5 px-3 whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-xl text-[11px] font-bold border ${typeBadge}">
              ${room.roomType || 'Lý thuyết'}
            </span>
          </td>

          <!-- 6. THIẾT BỊ -->
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <button type="button" class="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-black text-xs border border-teal-200 cursor-pointer shadow-2xs" title="Xem danh mục thiết bị" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}', 'devices')">
              <i class="fa-solid fa-boxes-stacked mr-1 text-teal-600"></i>
              <span>${devCount} món</span>
            </button>
          </td>

          <!-- 7. MÁY PC -->
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            ${isFacultyOrFunction || pcCount > 0 ? `
              <button type="button" class="px-2.5 py-1 rounded-xl ${pcCount > 0 ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'} font-black text-xs border cursor-pointer shadow-2xs" title="Xem & Quản lý máy PC" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}', 'pcs')">
                <i class="fa-solid fa-desktop mr-1 ${pcCount > 0 ? 'text-blue-600' : 'text-slate-400'}"></i>
                <span>${pcCount > 0 ? `${pcCount} PC` : '+ Thêm PC'}</span>
              </button>
            ` : `
              <button type="button" class="px-2 py-0.5 rounded-lg text-slate-400 hover:text-blue-600 text-xs font-semibold hover:bg-blue-50 cursor-pointer" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}', 'pcs')">
                + Thêm
              </button>
            `}
          </td>

          <!-- 8. TÌNH TRẠNG -->
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black ${statusBadge}">
              ${room.status || 'Đang sử dụng'}
            </span>
          </td>

          <!-- 9. THAO TÁC -->
          <td class="py-3.5 px-4 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1">
              <!-- Xem chi tiết (Read-only hồ sơ) -->
              <button type="button" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Xem chi tiết hồ sơ phòng" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}')">
                <i class="fa-solid fa-eye text-xs"></i>
              </button>

              <!-- Quản lý thiết bị / PC -->
              <button type="button" class="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Quản lý thiết bị & máy tính" onclick="RoomsManagementPage.openRoomDetailsModal('${room.id}', 'devices')">
                <i class="fa-solid fa-boxes-stacked text-xs"></i>
              </button>

              ${canEdit ? `
                <!-- Chỉnh sửa -->
                <button type="button" class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Chỉnh sửa thông tin phòng" onclick="RoomsManagementPage.openEditRoomModal('${room.id}')">
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>

                <!-- Xóa phòng -->
                <button type="button" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs" title="Xóa phòng" onclick="RoomsManagementPage.handleDeleteRoom('${room.id}', '${room.roomName || room.roomCode}')">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleSearch(val) {
    this.searchQuery = val;
    this.renderView();
  },

  handleCampusFilter(val) {
    this.currentFilterCampus = val;
    this.currentFilterZone = 'ALL';
    this.renderView();
  },

  handleZoneFilter(val) {
    this.currentFilterZone = val;
    this.renderView();
  },

  handleTypeFilter(val) {
    this.currentFilterType = val;
    this.renderView();
  },

  handleStatusFilter(val) {
    this.currentFilterStatus = val;
    this.renderView();
  },

  // ========================================================
  // MODAL 1: XEM CHI TIẾT PHÒNG (READ-ONLY VIEW MODE)
  // ========================================================
  openRoomDetailsModal(roomId, activeTab = 'overview') {
    this.activeRoomId = roomId;
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const devices = room.devices || ApiService.getDefaultRoomDevices();
    const roomPcs = this.pcs.filter(p => p.roomId === room.id);

    // Thống kê PC
    const activePcs = roomPcs.filter(p => p.status === 'Đang sử dụng').length;
    const maintPcs = roomPcs.filter(p => p.status === 'Đang bảo trì').length;
    const brokenPcs = roomPcs.filter(p => p.status === 'Hỏng' || p.status === 'Hư hỏng').length;

    const canEdit = AuthService.canManageUsers() || AuthService.isSuperAdmin();

    container.innerHTML = `
      <div id="room-details-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="p-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-door-open"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl sm:text-2xl font-black">${room.roomName}</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    ${room.roomCode}
                  </span>
                </div>
                <p class="text-xs text-blue-200 mt-1 font-medium">
                  ${room.campusName} • ${room.zoneName} • ${room.roomType} • ${room.floor}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${canEdit ? `
                <button class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs" onclick="RoomsManagementPage.openEditRoomModal('${room.id}')">
                  <i class="fa-solid fa-pen"></i>
                  <span>Sửa phòng</span>
                </button>
              ` : ''}
              <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('room-details-modal').remove()">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Tab Bar -->
          <div class="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2 text-xs font-bold">
            <button id="rd-tab-btn-overview" class="py-2 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}" onclick="RoomsManagementPage.switchDetailsTab('overview')">
              <i class="fa-solid fa-location-dot mr-1"></i>
              <span>1. Thông tin địa điểm</span>
            </button>

            <button id="rd-tab-btn-devices" class="py-2 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'devices' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}" onclick="RoomsManagementPage.switchDetailsTab('devices')">
              <i class="fa-solid fa-boxes-stacked mr-1"></i>
              <span>2. Danh mục thiết bị (${devices.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)})</span>
            </button>

            <button id="rd-tab-btn-pcs" class="py-2 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'pcs' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}" onclick="RoomsManagementPage.switchDetailsTab('pcs')">
              <i class="fa-solid fa-desktop mr-1"></i>
              <span>3. Quản lý Máy PC (${roomPcs.length})</span>
            </button>
          </div>

          <!-- Body Tabs -->
          <div class="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
            <!-- TAB 1: THÔNG TIN ĐỊA ĐIỂM (READ-ONLY) -->
            <div id="rd-tab-overview" class="${activeTab === 'overview' ? 'block' : 'hidden'} space-y-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Cơ sở:</span>
                  <span class="font-extrabold text-slate-800 text-sm">${room.campusName || 'Cơ sở chính'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Khu vực / Tòa nhà:</span>
                  <span class="font-extrabold text-indigo-700 text-sm">${room.zoneName || 'Tòa A'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Loại phòng:</span>
                  <span class="font-extrabold text-blue-700 text-sm">${room.roomType || 'Lý thuyết'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Tầng:</span>
                  <span class="font-extrabold text-slate-800">${room.floor || 'Tầng 1'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Sức chứa:</span>
                  <span class="font-extrabold text-slate-800">${room.capacity || 0} người</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Diện tích:</span>
                  <span class="font-extrabold text-slate-800">${room.area || 0} m²</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Người phụ trách:</span>
                  <span class="font-extrabold text-slate-800">${room.managerName || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Số điện thoại:</span>
                  <span class="font-extrabold text-slate-800">${room.managerPhone || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[11px]">Trạng thái:</span>
                  <span class="font-extrabold text-emerald-600">${room.status || 'Đang sử dụng'}</span>
                </div>
              </div>

              ${room.locationDetail ? `
                <div class="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
                  <span class="font-bold text-blue-900 block text-[11px]">Vị trí chi tiết:</span>
                  <p class="text-slate-700 mt-0.5 font-medium">${room.locationDetail}</p>
                </div>
              ` : ''}

              ${room.notes ? `
                <div class="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                  <span class="font-bold text-slate-600 block text-[11px]">Ghi chú phòng:</span>
                  <p class="text-slate-700 mt-0.5">${room.notes}</p>
                </div>
              ` : ''}
            </div>

            <!-- TAB 2: DANH MỤC THIẾT BỊ (READ-ONLY VIEW + NÚT SỬA) -->
            <div id="rd-tab-devices" class="${activeTab === 'devices' ? 'block' : 'hidden'} space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-boxes-stacked text-teal-600"></i>
                    <span>DANH MỤC THIẾT BỊ TRONG PHÒNG</span>
                  </h4>
                  <p class="text-[11px] text-slate-400">Danh mục thiết bị và cơ sở vật chất đã trang bị trong phòng</p>
                </div>

                ${canEdit ? `
                  <button type="button" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5" onclick="RoomsManagementPage.openEditDevicesModal('${room.id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Chỉnh sửa thiết bị</span>
                  </button>
                ` : ''}
              </div>

              <!-- Bảng thiết bị dạng Readonly -->
              <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3 text-center w-10">STT</th>
                      <th class="py-3 px-4">TÊN THIẾT BỊ</th>
                      <th class="py-3 px-3 text-center w-24">SỐ LƯỢNG</th>
                      <th class="py-3 px-3 text-center w-20">ĐVT</th>
                      <th class="py-3 px-3">MÃ TÀI SẢN</th>
                      <th class="py-3 px-3">SỐ SERIAL</th>
                      <th class="py-3 px-3 text-center">TÌNH TRẠNG</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    ${devices.map((dev, i) => {
                      const qty = Number(dev.quantity) || 0;
                      let statusBadge = 'bg-emerald-100 text-emerald-800';
                      if (dev.status === 'Cần bảo trì' || dev.status === 'Hư hỏng') statusBadge = 'bg-rose-100 text-rose-700 font-black';
                      else if (dev.status === 'Đang sửa chữa') statusBadge = 'bg-amber-100 text-amber-800 font-bold';

                      return `
                        <tr class="hover:bg-slate-50">
                          <td class="py-2.5 px-3 text-center text-slate-400 font-bold">${i + 1}</td>
                          <td class="py-2.5 px-4 font-black text-slate-900">${dev.name}</td>
                          <td class="py-2.5 px-3 text-center font-black ${qty > 0 ? 'text-blue-700 text-sm' : 'text-slate-300'}">${qty}</td>
                          <td class="py-2.5 px-3 text-center text-slate-600 font-semibold">${dev.unit || 'Bộ'}</td>
                          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-700">${dev.assetCode || '---'}</td>
                          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-700">${dev.serialNumber || '---'}</td>
                          <td class="py-2.5 px-3 text-center">
                            <span class="px-2 py-0.5 rounded-full text-[10px] ${statusBadge}">
                              ${dev.status || 'Tốt'}
                            </span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 3: QUẢN LÝ MÁY TÍNH PC (ÁP DỤNG CHO VĂN PHÒNG KHOA & PHÒNG CHỨC NĂNG) -->
            <div id="rd-tab-pcs" class="${activeTab === 'pcs' ? 'block' : 'hidden'} space-y-4">
              <!-- Thống kê máy bộ PC (Mục 5) -->
              <div class="bg-gradient-to-r from-blue-900 to-indigo-950 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    💻 THỐNG KÊ MÁY BỘ PC
                  </span>
                  <div class="flex items-center gap-4 mt-2">
                    <div>
                      <span class="text-[11px] text-blue-200">Tổng số PC:</span>
                      <span class="text-xl font-black ml-1">${String(roomPcs.length).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <span class="text-[11px] text-emerald-300">Đang sử dụng:</span>
                      <span class="text-xl font-black text-emerald-400 ml-1">${String(activePcs).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <span class="text-[11px] text-amber-300">Đang bảo trì:</span>
                      <span class="text-xl font-black text-amber-400 ml-1">${String(maintPcs).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <span class="text-[11px] text-rose-300">Hỏng:</span>
                      <span class="text-xl font-black text-rose-400 ml-1">${String(brokenPcs).padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>

                ${canEdit ? `
                  <button type="button" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2" onclick="RoomsManagementPage.openCreatePCModal('${room.id}')">
                    <i class="fa-solid fa-plus"></i>
                    <span>+ THÊM MÁY PC</span>
                  </button>
                ` : ''}
              </div>

              <!-- Danh sách thẻ máy PC -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                ${roomPcs.length === 0 ? `
                  <div class="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <i class="fa-solid fa-desktop text-2xl text-slate-300 mb-2 block"></i>
                    <p class="font-bold text-slate-600">Chưa có máy PC nào được khai báo trong phòng này.</p>
                    <p class="text-[11px] mt-0.5">Bấm nút "+ THÊM MÁY PC" ở trên để tạo hồ sơ lý lịch máy tính.</p>
                  </div>
                ` : roomPcs.map((pc, idx) => {
                  const schedule = pc.maintenanceSchedule || {};
                  const nextDate = schedule.nextDate || ApiService.calculateNextMaintenanceDate(schedule.lastDate, schedule.intervalMonths || 6);
                  const today = new Date().toISOString().split('T')[0];
                  
                  let maintStatusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">🟢 Còn hạn</span>';
                  if (nextDate) {
                    if (nextDate < today) maintStatusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">🔴 Quá hạn bảo trì</span>';
                    else {
                      const diffDays = Math.ceil((new Date(nextDate) - new Date(today)) / (1000 * 60 * 60 * 24));
                      if (diffDays <= 15) maintStatusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">🟡 Sắp đến hạn (${diffDays} ngày)</span>`;
                    }
                  }

                  return `
                    <div class="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-3 cursor-pointer group" onclick="RoomsManagementPage.openPCViewModal('${pc.id}')">
                      <div class="flex items-start justify-between">
                        <div class="flex items-center gap-2.5">
                          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <i class="fa-solid fa-desktop"></i>
                          </div>
                          <div>
                            <h5 class="font-black text-slate-900 text-xs group-hover:text-blue-600 transition-colors">${pc.pcName || 'Máy PC'}</h5>
                            <span class="font-mono text-[10px] font-bold text-blue-600">${pc.pcCode}</span>
                          </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.status === 'Đang sử dụng' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                          ${pc.status}
                        </span>
                      </div>

                      <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                        <div class="flex justify-between">
                          <span class="text-slate-400 font-semibold">Người dùng:</span>
                          <span class="font-extrabold text-slate-800">${pc.userName || 'Chưa gán'}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-400 font-semibold">CPU / RAM:</span>
                          <span class="font-bold text-slate-700">${pc.hardware?.cpu || '---'} / ${pc.hardware?.ram || '---'}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-slate-400 font-semibold">Windows:</span>
                          <span class="font-bold text-slate-700">${pc.os?.name || 'Win 11'} ${pc.os?.isLicensed ? '☑ Có bản quyền' : '☐ Không bản quyền'}</span>
                        </div>
                      </div>

                      <div class="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                        <span class="text-slate-400 font-medium">Bảo trì: ${nextDate || '---'}</span>
                        ${maintStatusBadge}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer" onclick="document.getElementById('room-details-modal').remove()">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;
  },

  switchDetailsTab(tabName) {
    const tabs = ['overview', 'devices', 'pcs'];
    tabs.forEach(t => {
      const btn = document.getElementById(`rd-tab-btn-${t}`);
      const content = document.getElementById(`rd-tab-${t}`);
      if (btn) {
        if (t === tabName) btn.className = 'py-2 px-4 rounded-xl transition-all cursor-pointer bg-blue-600 text-white shadow-xs';
        else btn.className = 'py-2 px-4 rounded-xl transition-all cursor-pointer text-slate-600 hover:bg-slate-200';
      }
      if (content) {
        content.className = t === tabName ? 'block space-y-4' : 'hidden space-y-4';
      }
    });
  },

  // ========================================================
  // MODAL 2: XEM LÝ LỊCH MÁY TÍNH PC (READ-ONLY PROFILE VIEW)
  // ========================================================
  openPCViewModal(pcId) {
    this.activePCId = pcId;
    const pc = this.pcs.find(p => p.id === pcId);
    if (!pc) return;

    const room = this.rooms.find(r => r.id === pc.roomId);
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const hw = pc.hardware || {};
    const os = pc.os || {};
    const office = pc.office || {};
    const softwares = pc.softwares || [];
    const schedule = pc.maintenanceSchedule || {};
    const history = pc.maintenanceHistory || [];

    const nextDate = schedule.nextDate || ApiService.calculateNextMaintenanceDate(schedule.lastDate, schedule.intervalMonths || 6);
    const today = new Date().toISOString().split('T')[0];

    let maintStatusBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">🟢 Còn hạn bảo trì</span>';
    if (nextDate) {
      if (nextDate < today) maintStatusBadge = '<span class="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 animate-pulse">🔴 Đã quá hạn bảo trì</span>';
      else {
        const diffDays = Math.ceil((new Date(nextDate) - new Date(today)) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15) maintStatusBadge = `<span class="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">🟡 Sắp đến hạn (${diffDays} ngày nữa)</span>`;
      }
    }

    const canEdit = AuthService.canManageUsers() || AuthService.isSuperAdmin();

    container.innerHTML = `
      <div id="pc-view-modal" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="p-6 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-desktop"></i>
              </div>
              <div>
                <div class="flex items-center gap-2.5">
                  <h2 class="text-xl sm:text-2xl font-black">${pc.pcName}</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    ${pc.pcCode}
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${pc.status === 'Đang sử dụng' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                    ${pc.status}
                  </span>
                </div>
                <p class="text-xs text-blue-200 mt-1 font-medium">
                  Phòng: <span class="font-bold text-white">${room?.roomName || '---'}</span> (${room?.roomCode || ''}) • Người sử dụng: <span class="font-bold text-white">${pc.userName || '---'}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${canEdit ? `
                <button type="button" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer" onclick="RoomsManagementPage.openPCEditModal('${pc.id}')">
                  <i class="fa-solid fa-pen-to-square"></i>
                  <span>Chỉnh sửa cấu hình PC</span>
                </button>
              ` : ''}
              <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('pc-view-modal').remove()">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Body Hồ Sơ Lý Lịch (Chế độ Xem Trực Quan, Sang Trọng, Readonly) -->
          <div class="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            <!-- 1. THÔNG TIN CƠ BẢN -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-circle-info text-blue-600"></i>
                <span>1. THÔNG TIN CƠ BẢN</span>
              </h4>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Mã máy:</span>
                  <span class="font-mono font-black text-blue-600 text-sm">${pc.pcCode}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Tên máy:</span>
                  <span class="font-extrabold text-slate-900">${pc.pcName}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Người sử dụng:</span>
                  <span class="font-extrabold text-slate-900">${pc.userName || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Tình trạng:</span>
                  <span class="font-extrabold text-emerald-700">${pc.status}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Phòng / Vị trí:</span>
                  <span class="font-extrabold text-slate-800">${room?.roomName || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Vị trí bàn:</span>
                  <span class="font-semibold text-slate-700">${pc.positionDetail || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Ngày bàn giao:</span>
                  <span class="font-semibold text-slate-700">${pc.handoverDate || '---'}</span>
                </div>
              </div>
            </div>

            <!-- 2. CẤU HÌNH PHẦN CỨNG CHI TIẾT (Mục 7) -->
            <div class="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200 space-y-3">
              <h4 class="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-microchip text-indigo-600"></i>
                <span>2. CẤU HÌNH PHẦN CỨNG (HARDWARE)</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Số Serial Mainboard:</span>
                  <span class="font-mono font-bold text-slate-900">${hw.mainboardSerial || '---'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Hãng sản xuất Mainboard:</span>
                  <span class="font-extrabold text-slate-900">${hw.mainboardBrand || 'ASUS'}</span>
                </div>
                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Mã Model Mainboard:</span>
                  <span class="font-bold text-indigo-700">${hw.mainboardModel || 'H510M-K'}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">CPU:</span>
                    <span class="font-black text-slate-900">${hw.cpu || '---'}</span>
                  </div>
                  ${hw.cpuSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.cpuSerial}</span>` : ''}
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">RAM:</span>
                    <span class="font-black text-slate-900">${hw.ram || '---'}</span>
                  </div>
                  ${hw.ramSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.ramSerial}</span>` : ''}
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">Ổ Cứng:</span>
                    <span class="font-black text-slate-900">${hw.storage || '---'}</span>
                  </div>
                  ${hw.storageSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.storageSerial}</span>` : ''}
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">Card Màn hình (VGA):</span>
                    <span class="font-black text-slate-900">${hw.vga || 'Onboard'}</span>
                  </div>
                  ${hw.vgaSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.vgaSerial}</span>` : ''}
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">Màn hình:</span>
                    <span class="font-black text-slate-900">${hw.screen || '---'}</span>
                  </div>
                  ${hw.screenSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.screenSerial}</span>` : ''}
                </div>

                <div class="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span class="text-slate-400 font-bold block text-[10px] uppercase">Bộ nguồn (PSU):</span>
                    <span class="font-black text-slate-900">${hw.psu || '---'}</span>
                  </div>
                  ${hw.psuSerial ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">SN: ${hw.psuSerial}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- 3. WINDOWS & MICROSOFT OFFICE (Mục 8, 9) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Windows -->
              <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5">
                <h4 class="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-brands fa-windows text-blue-600"></i>
                  <span>3. HỆ ĐIỀU HÀNH WINDOWS</span>
                </h4>

                <div class="bg-white p-3 rounded-xl border border-blue-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-900 text-sm">${os.name || 'Windows 11'}</span>
                    ${os.isLicensed ? `
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <i class="fa-solid fa-check"></i> Có bản quyền
                      </span>
                    ` : `
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                        Không có bản quyền
                      </span>
                    `}
                  </div>

                  <div class="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100">
                    <span>Thời hạn: <b>${os.duration || (os.isLicensed ? 'Vĩnh viễn' : '---')}</b></span>
                    ${os.licenseKey ? `<span class="font-mono text-slate-500">Key: ${os.licenseKey}</span>` : ''}
                  </div>
                </div>
              </div>

              <!-- Microsoft Office -->
              <div class="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2.5">
                <h4 class="font-extrabold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-file-word text-amber-600"></i>
                  <span>4. MICROSOFT OFFICE</span>
                </h4>

                <div class="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-900 text-sm">${office.version || 'Office 2021'}</span>
                    ${office.isLicensed ? `
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <i class="fa-solid fa-check"></i> Có bản quyền
                      </span>
                    ` : `
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                        Không có bản quyền
                      </span>
                    `}
                  </div>

                  <div class="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>Thời hạn: <b>${office.duration || (office.isLicensed ? 'Vĩnh viễn' : '---')}</b></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. CÁC PHẦN MỀM KHÁC (Mục 10) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-cubes text-blue-600"></i>
                <span>5. CÁC PHẦN MỀM ĐÃ CÀI ĐẶT (${softwares.length})</span>
              </h4>

              <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th class="p-2.5">Tên phần mềm</th>
                      <th class="p-2.5 w-24">Phiên bản</th>
                      <th class="p-2.5 w-32">Bản quyền</th>
                      <th class="p-2.5 w-28">Ngày cài đặt</th>
                      <th class="p-2.5 w-28">Hạn sử dụng</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    ${softwares.length === 0 ? `
                      <tr><td colspan="5" class="p-3 text-center text-slate-400">Không có phần mềm bổ sung nào được ghi nhận.</td></tr>
                    ` : softwares.map(sw => `
                      <tr class="hover:bg-slate-50">
                        <td class="p-2.5 font-bold text-slate-900">${sw.name}</td>
                        <td class="p-2.5 text-slate-600">${sw.version || '---'}</td>
                        <td class="p-2.5">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${sw.license === 'Bản quyền' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                            ${sw.license || 'Bản quyền'}
                          </span>
                        </td>
                        <td class="p-2.5 text-slate-600">${sw.installDate || '---'}</td>
                        <td class="p-2.5 text-slate-600">${sw.expireDate || 'Vĩnh viễn'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 5. LỊCH BẢO TRÌ VỆ SINH ĐỊNH KỲ (Mục 11) -->
            <div class="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-extrabold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-calendar-check text-emerald-600"></i>
                  <span>6. LỊCH BẢO TRÌ VỆ SINH ĐỊNH KỲ</span>
                </h4>
                ${maintStatusBadge}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Chu kỳ vệ sinh:</span>
                  <span class="font-black text-slate-900 text-sm">${schedule.intervalMonths || 6} tháng / lần</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Ngày vệ sinh gần nhất:</span>
                  <span class="font-bold text-slate-800">${schedule.lastDate || '---'}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-bold block text-[10px] uppercase">Ngày bảo trì tiếp theo:</span>
                  <span class="font-black text-emerald-700 text-sm">${nextDate || '---'}</span>
                </div>
              </div>
            </div>

            <!-- 6. LỊCH SỬ BẢO TRÌ MÁY (Mục 12) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-clock-rotate-left text-blue-600"></i>
                  <span>7. LỊCH SỬ BẢO TRÌ (${history.length} lần)</span>
                </h4>

                <button type="button" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow-2xs" onclick="RoomsManagementPage.openAddMaintenanceModal('${pc.id}')">
                  <i class="fa-solid fa-plus text-[10px]"></i>
                  <span>Ghi nhận bảo trì mới</span>
                </button>
              </div>

              <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th class="p-2.5 text-center w-10">STT</th>
                      <th class="p-2.5">Ngày</th>
                      <th class="p-2.5">Loại bảo trì</th>
                      <th class="p-2.5">Nội dung thực hiện</th>
                      <th class="p-2.5">Kỹ thuật viên</th>
                      <th class="p-2.5">Tình trạng sau</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    ${history.length === 0 ? `
                      <tr><td colspan="6" class="p-4 text-center text-slate-400">Chưa có lịch sử bảo trì nào được ghi nhận. Bấm nút <b>Ghi nhận bảo trì mới</b> để thêm.</td></tr>
                    ` : history.map((h, i) => `
                      <tr class="hover:bg-slate-50">
                        <td class="p-2.5 text-center text-slate-400 font-bold">${i + 1}</td>
                        <td class="p-2.5 font-bold text-slate-800">${h.date}</td>
                        <td class="p-2.5"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">${h.type}</span></td>
                        <td class="p-2.5 text-slate-700">${h.content || '---'}</td>
                        <td class="p-2.5 text-slate-900 font-bold">${h.performer || 'KTV'}</td>
                        <td class="p-2.5"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">${h.statusAfter || 'Tốt'}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer" onclick="document.getElementById('pc-view-modal').remove()">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ========================================================
  // MODAL 3: CHỈNH SỬA THIẾT BỊ TRONG PHÒNG
  // ========================================================
  openEditDevicesModal(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const devices = room.devices || ApiService.getDefaultRoomDevices();
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const modal = document.createElement('div');
    modal.id = 'room-devices-edit-modal';
    modal.className = 'fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg font-black">
              <i class="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <h3 class="text-base font-black">CHỈNH SỬA THIẾT BỊ TRONG PHÒNG</h3>
              <p class="text-xs text-teal-100 font-medium">Phòng: ${room.roomName} (${room.roomCode})</p>
            </div>
          </div>
          <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('room-devices-edit-modal').remove()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500">Cập nhật số lượng, mã tài sản và tình trạng từng thiết bị:</span>
            <button type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="RoomsManagementPage.addCustomDeviceRow('${room.id}')">
              + Thêm thiết bị khác
            </button>
          </div>

          <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-2 text-center w-10">STT</th>
                  <th class="py-2.5 px-3">TÊN THIẾT BỊ</th>
                  <th class="py-2.5 px-2 text-center w-20">SỐ LƯỢNG</th>
                  <th class="py-2.5 px-2 text-center w-16">ĐVT</th>
                  <th class="py-2.5 px-3">MÃ TÀI SẢN</th>
                  <th class="py-2.5 px-3">SỐ SERIAL</th>
                  <th class="py-2.5 px-3">TÌNH TRẠNG</th>
                  <th class="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody id="rd-devices-tbody" class="divide-y divide-slate-100 font-medium">
                ${devices.map((dev, i) => `
                  <tr class="hover:bg-slate-50" data-dev-id="${dev.id}">
                    <td class="py-2.5 px-2 text-center text-slate-400 font-bold">${i + 1}</td>
                    <td class="py-2.5 px-3">
                      <input type="text" class="dev-input-name w-full p-1 bg-transparent font-extrabold text-slate-900 border-b border-transparent focus:border-blue-500 focus:bg-white rounded" value="${dev.name}">
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <input type="number" min="0" class="dev-input-qty w-16 text-center font-black text-blue-700 p-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white" value="${dev.quantity || 0}">
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <input type="text" class="dev-input-unit w-14 text-center font-semibold text-slate-600 p-1 bg-transparent border-b border-transparent focus:border-blue-500" value="${dev.unit || 'Bộ'}">
                    </td>
                    <td class="py-2.5 px-3">
                      <input type="text" class="dev-input-asset w-full p-1 bg-transparent font-mono text-[11px] text-slate-700 border-b border-transparent focus:border-blue-500 placeholder-slate-300" placeholder="Mã TS..." value="${dev.assetCode || ''}">
                    </td>
                    <td class="py-2.5 px-3">
                      <input type="text" class="dev-input-serial w-full p-1 bg-transparent font-mono text-[11px] text-slate-700 border-b border-transparent focus:border-blue-500 placeholder-slate-300" placeholder="Serial..." value="${dev.serialNumber || ''}">
                    </td>
                    <td class="py-2.5 px-3">
                      <select class="dev-input-status p-1 bg-white border border-slate-200 rounded-lg font-bold text-[11px] ${dev.status === 'Cần bảo trì' || dev.status === 'Hư hỏng' ? 'text-rose-600' : 'text-slate-800'}">
                        <option value="Tốt" ${dev.status === 'Tốt' ? 'selected' : ''}>Tốt</option>
                        <option value="Đang sử dụng" ${dev.status === 'Đang sử dụng' ? 'selected' : ''}>Đang sử dụng</option>
                        <option value="Cần bảo trì" ${dev.status === 'Cần bảo trì' ? 'selected' : ''}>Cần bảo trì</option>
                        <option value="Hư hỏng" ${dev.status === 'Hư hỏng' ? 'selected' : ''}>Hư hỏng</option>
                        <option value="Đang sửa chữa" ${dev.status === 'Đang sửa chữa' ? 'selected' : ''}>Đang sửa chữa</option>
                        <option value="Thanh lý" ${dev.status === 'Thanh lý' ? 'selected' : ''}>Thanh lý</option>
                      </select>
                    </td>
                    <td class="py-2.5 px-2 text-center">
                      <button type="button" class="text-slate-300 hover:text-rose-600 p-1 cursor-pointer" onclick="this.closest('tr').remove()">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer" onclick="document.getElementById('room-devices-edit-modal').remove()">
            Hủy
          </button>
          <button type="button" class="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2" onclick="RoomsManagementPage.saveRoomDevices('${room.id}')">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>LƯU DANH MỤC THIẾT BỊ</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  addCustomDeviceRow(roomId) {
    const tbody = document.getElementById('rd-devices-tbody');
    if (!tbody) return;

    const rowCount = tbody.querySelectorAll('tr').length + 1;
    const newId = 'dev_custom_' + Date.now();

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 animate-fade-in';
    tr.setAttribute('data-dev-id', newId);
    tr.innerHTML = `
      <td class="py-2.5 px-2 text-center text-slate-400 font-bold">${rowCount}</td>
      <td class="py-2.5 px-3">
        <input type="text" class="dev-input-name w-full p-1 bg-white font-extrabold text-slate-900 border border-blue-400 rounded" placeholder="Nhập tên thiết bị...">
      </td>
      <td class="py-2.5 px-2 text-center">
        <input type="number" min="1" class="dev-input-qty w-16 text-center font-black text-blue-700 p-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white" value="1">
      </td>
      <td class="py-2.5 px-2 text-center">
        <input type="text" class="dev-input-unit w-14 text-center font-semibold text-slate-600 p-1 bg-transparent border-b border-transparent focus:border-blue-500" value="Cái">
      </td>
      <td class="py-2.5 px-3">
        <input type="text" class="dev-input-asset w-full p-1 bg-transparent font-mono text-[11px] text-slate-700 border-b border-transparent focus:border-blue-500" placeholder="Mã TS...">
      </td>
      <td class="py-2.5 px-3">
        <input type="text" class="dev-input-serial w-full p-1 bg-transparent font-mono text-[11px] text-slate-700 border-b border-transparent focus:border-blue-500" placeholder="Serial...">
      </td>
      <td class="py-2.5 px-3">
        <select class="dev-input-status p-1 bg-white border border-slate-200 rounded-lg font-bold text-[11px] text-slate-800">
          <option value="Tốt" selected>Tốt</option>
          <option value="Đang sử dụng">Đang sử dụng</option>
          <option value="Cần bảo trì">Cần bảo trì</option>
          <option value="Hư hỏng">Hư hỏng</option>
          <option value="Đang sửa chữa">Đang sửa chữa</option>
          <option value="Thanh lý">Thanh lý</option>
        </select>
      </td>
      <td class="py-2.5 px-2 text-center">
        <button type="button" class="text-slate-300 hover:text-rose-600 p-1 cursor-pointer" onclick="this.closest('tr').remove()">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  },

  async saveRoomDevices(roomId) {
    const tbody = document.getElementById('rd-devices-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const devicesList = [];

    rows.forEach(r => {
      const devId = r.getAttribute('data-dev-id') || ('dev_' + Date.now());
      const name = r.querySelector('.dev-input-name')?.value.trim();
      const qty = Number(r.querySelector('.dev-input-qty')?.value) || 0;
      const unit = r.querySelector('.dev-input-unit')?.value.trim() || 'Bộ';
      const assetCode = r.querySelector('.dev-input-asset')?.value.trim() || '';
      const serialNumber = r.querySelector('.dev-input-serial')?.value.trim() || '';
      const status = r.querySelector('.dev-input-status')?.value || 'Tốt';

      if (name) {
        devicesList.push({
          id: devId,
          name: name,
          quantity: qty,
          unit: unit,
          assetCode: assetCode,
          serialNumber: serialNumber,
          status: status
        });
      }
    });

    try {
      await ApiService.updateRoom(roomId, { devices: devicesList });
      Utils.showToast('Đã lưu danh mục thiết bị của phòng thành công!', 'success');
      
      const modal = document.getElementById('room-devices-edit-modal');
      if (modal) modal.remove();

      await this.loadData();
      this.openRoomDetailsModal(roomId, 'devices');
    } catch (err) {
      Utils.showToast('Lỗi lưu thiết bị: ' + err.message, 'error');
    }
  },

  // ========================================================
  // MODAL 4: THÊM / CHỈNH SỬA PHÒNG
  // ========================================================
  openCreateRoomModal() {
    this.renderRoomFormModal(null);
  },

  openEditRoomModal(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;
    this.renderRoomFormModal(room);
  },

  renderRoomFormModal(room = null) {
    const isEdit = Boolean(room);
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const initialCampusId = room?.campusId || (this.campuses[0]?.id || '');
    const initialCampus = this.campuses.find(c => c.id === initialCampusId) || this.campuses[0];
    const zones = initialCampus?.zones || [];

    container.innerHTML = `
      <div id="room-form-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg font-black shadow-md">
                <i class="fa-solid ${isEdit ? 'fa-door-open' : 'fa-plus'}"></i>
              </div>
              <div>
                <h3 class="text-base font-black">${isEdit ? 'CHỈNH SỬA THÔNG TIN PHÒNG' : 'THÊM MỚI PHÒNG NSG'}</h3>
                <p class="text-xs text-blue-200 font-medium">Hồ sơ cơ sở vật chất, loại phòng và phân cấp địa điểm</p>
              </div>
            </div>
            <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('room-form-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Form Body -->
          <form onsubmit="RoomsManagementPage.handleRoomFormSubmit(event, '${room?.id || ''}')" class="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            <!-- 1. Cấu trúc địa điểm phân cấp (Mục 1) -->
            <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
              <h4 class="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-map-location-dot text-blue-600"></i>
                <span>ĐỊA ĐIỂM THỰC HIỆN (PHÂN CẤP)</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">1. Cơ sở <span class="text-rose-500">*</span>:</label>
                  <select id="rf-campus" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" required onchange="RoomsManagementPage.handleFormCampusChange(this.value)">
                    ${this.campuses.map(c => `
                      <option value="${c.id}" ${c.id === initialCampusId ? 'selected' : ''}>${c.name}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">2. Khu vực / Tòa nhà <span class="text-rose-500">*</span>:</label>
                  <select id="rf-zone" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
                    ${zones.map(z => `
                      <option value="${z.id}" ${z.id === room?.zoneId ? 'selected' : ''}>${z.name}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- 2. Thông tin chi tiết phòng (Mục 2 & 3) -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Mã phòng <span class="text-rose-500">*</span>:</label>
                <input type="text" id="rf-code" value="${room?.roomCode || `P-${Math.floor(100 + Math.random() * 900)}`}" placeholder="VD: P-A101" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Tên phòng <span class="text-rose-500">*</span>:</label>
                <input type="text" id="rf-name" value="${room?.roomName || ''}" placeholder="VD: Phòng học Lý thuyết A101" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Loại phòng <span class="text-rose-500">*</span>:</label>
                <select id="rf-type" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
                  <option value="Lý thuyết" ${room?.roomType === 'Lý thuyết' ? 'selected' : ''}>Lý thuyết</option>
                  <option value="Thực hành" ${room?.roomType === 'Thực hành' ? 'selected' : ''}>Thực hành</option>
                  <option value="Văn phòng khoa" ${room?.roomType === 'Văn phòng khoa' ? 'selected' : ''}>Văn phòng khoa</option>
                  <option value="Phòng chức năng" ${room?.roomType === 'Phòng chức năng' ? 'selected' : ''}>Phòng chức năng</option>
                  <option value="Phòng họp" ${room?.roomType === 'Phòng họp' ? 'selected' : ''}>Phòng họp</option>
                  <option value="Phòng hội thảo" ${room?.roomType === 'Phòng hội thảo' ? 'selected' : ''}>Phòng hội thảo</option>
                  <option value="Phòng kho" ${room?.roomType === 'Phòng kho' ? 'selected' : ''}>Phòng kho</option>
                  <option value="Phòng máy" ${room?.roomType === 'Phòng máy' ? 'selected' : ''}>Phòng máy</option>
                  <option value="Khác" ${room?.roomType === 'Khác' ? 'selected' : ''}>Khác</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Tầng:</label>
                <input type="text" id="rf-floor" value="${room?.floor || 'Tầng 1'}" placeholder="Tầng 1, Tầng 2..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Tình trạng:</label>
                <select id="rf-status" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
                  <option value="Đang sử dụng" ${room?.status === 'Đang sử dụng' ? 'selected' : ''}>Đang sử dụng</option>
                  <option value="Đang bảo trì" ${room?.status === 'Đang bảo trì' ? 'selected' : ''}>Đang bảo trì</option>
                  <option value="Tạm ngưng" ${room?.status === 'Tạm ngưng' ? 'selected' : ''}>Tạm ngưng</option>
                  <option value="Không sử dụng" ${room?.status === 'Không sử dụng' ? 'selected' : ''}>Không sử dụng</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Sức chứa (người):</label>
                <input type="number" id="rf-capacity" value="${room?.capacity || 40}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Diện tích (m²):</label>
                <input type="number" id="rf-area" value="${room?.area || 60}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Người phụ trách:</label>
                <input type="text" id="rf-manager-name" value="${room?.managerName || ''}" placeholder="Họ tên QL" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500">
              </div>

              <div class="space-y-1">
                <label class="block font-bold text-slate-700">Số điện thoại:</label>
                <input type="tel" id="rf-manager-phone" value="${room?.managerPhone || ''}" placeholder="090..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Vị trí cụ thể / Ghi chú vị trí:</label>
              <input type="text" id="rf-location-detail" value="${room?.locationDetail || ''}" placeholder="VD: Dãy hành lang phía Đông, cạnh cầu thang..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500">
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Ghi chú thêm:</label>
              <textarea id="rf-notes" rows="2" placeholder="Ghi chú về cơ sở vật chất, khóa phòng..." class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500">${room?.notes || ''}</textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('room-form-modal').remove()">
                Hủy bỏ
              </button>
              <button type="submit" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-check"></i>
                <span>${isEdit ? 'LƯU THAY ĐỔI' : 'TẠO PHÒNG MỚI'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  handleFormCampusChange(campusId) {
    const zoneSelect = document.getElementById('rf-zone');
    if (!zoneSelect) return;

    const campus = this.campuses.find(c => c.id === campusId);
    const zones = campus?.zones || [];

    zoneSelect.innerHTML = zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
  },

  async handleRoomFormSubmit(e, roomId) {
    e.preventDefault();

    const campusId = document.getElementById('rf-campus').value;
    const campus = this.campuses.find(c => c.id === campusId);
    const zoneId = document.getElementById('rf-zone').value;
    const zone = (campus?.zones || []).find(z => z.id === zoneId);

    const roomData = {
      roomCode: document.getElementById('rf-code').value.trim(),
      roomName: document.getElementById('rf-name').value.trim(),
      campusId: campusId,
      campusName: campus?.name || 'Cơ sở chính',
      zoneId: zoneId,
      zoneName: zone?.name || 'Tòa A',
      roomType: document.getElementById('rf-type').value,
      floor: document.getElementById('rf-floor').value.trim(),
      status: document.getElementById('rf-status').value,
      capacity: Number(document.getElementById('rf-capacity').value) || 0,
      area: Number(document.getElementById('rf-area').value) || 0,
      managerName: document.getElementById('rf-manager-name').value.trim(),
      managerPhone: document.getElementById('rf-manager-phone').value.trim(),
      locationDetail: document.getElementById('rf-location-detail').value.trim(),
      notes: document.getElementById('rf-notes').value.trim()
    };

    if (!roomData.roomCode || !roomData.roomName) {
      Utils.showToast('Vui lòng nhập đầy đủ Mã phòng và Tên phòng.', 'warning');
      return;
    }

    try {
      if (roomId) {
        await ApiService.updateRoom(roomId, roomData);
        Utils.showToast(`Đã cập nhật thông tin phòng ${roomData.roomName}!`, 'success');
      } else {
        await ApiService.createRoom(roomData);
        Utils.showToast(`Đã tạo mới phòng ${roomData.roomName}!`, 'success');
      }

      const modal = document.getElementById('room-form-modal');
      if (modal) modal.remove();
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async handleDeleteRoom(roomId, roomName) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA PHÒNG "${roomName}"?\nToàn bộ danh mục thiết bị và máy tính PC thuộc phòng này sẽ bị xóa khỏi hệ thống.`)) {
      return;
    }

    try {
      await ApiService.deleteRoom(roomId, true);
      Utils.showToast(`Đã xóa phòng ${roomName} thành công.`, 'success');
      await this.loadData();
    } catch (err) {
      Utils.showToast('Lỗi xóa phòng: ' + err.message, 'error');
    }
  },

  // ========================================================
  // MODAL 5: THÊM / CHỈNH SỬA CẤU HÌNH MÁY PC (EDIT FORM)
  // ========================================================
  openCreatePCModal(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    this.renderPCEditModal(null, room);
  },

  openPCEditModal(pcId) {
    this.activePCId = pcId;
    const pc = this.pcs.find(p => p.id === pcId);
    if (!pc) return;
    const room = this.rooms.find(r => r.id === pc.roomId);
    this.renderPCEditModal(pc, room);
  },

  renderPCEditModal(pc = null, room = null) {
    const isEdit = Boolean(pc);
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const targetRoomId = pc?.roomId || room?.id || '';
    const targetRoom = room || this.rooms.find(r => r.id === targetRoomId);

    const hw = pc?.hardware || {};
    const os = pc?.os || {};
    const office = pc?.office || {};
    const softwares = pc?.softwares || [];
    const schedule = pc?.maintenanceSchedule || { intervalMonths: 6, lastDate: new Date().toISOString().split('T')[0] };

    const nextDate = schedule.nextDate || ApiService.calculateNextMaintenanceDate(schedule.lastDate, schedule.intervalMonths || 6);

    container.innerHTML = `
      <div id="pc-edit-modal" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="p-6 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-desktop"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl sm:text-2xl font-black">${isEdit ? 'CHỈNH SỬA CẤU HÌNH MÁY PC' : 'THÊM MỚI MÁY BỘ PC'}</h2>
                  ${isEdit ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">${pc.pcCode}</span>` : ''}
                </div>
                <p class="text-xs text-blue-200 mt-1 font-medium">
                  Cung cấp thông tin cấu hình phần cứng, bản quyền Windows & Office cho Văn phòng khoa & Phòng chức năng
                </p>
              </div>
            </div>
            <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('pc-edit-modal').remove()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Form Body -->
          <form onsubmit="RoomsManagementPage.handlePCFormSubmit(event, '${pc?.id || ''}')" class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            <!-- 1. THÔNG TIN CƠ BẢN -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-circle-info text-blue-600"></i>
                <span>1. THÔNG TIN CƠ BẢN</span>
              </h4>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Mã máy <span class="text-rose-500">*</span>:</label>
                  <input type="text" id="pcf-code" value="${pc?.pcCode || `PC-${Math.floor(100 + Math.random() * 900)}`}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Tên máy <span class="text-rose-500">*</span>:</label>
                  <input type="text" id="pcf-name" value="${pc?.pcName || 'Máy PC 01'}" placeholder="VD: PC Kế toán 01" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500" required>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Người sử dụng:</label>
                  <input type="text" id="pcf-username" value="${pc?.userName || ''}" placeholder="Họ tên CB/GV" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500">
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Tình trạng:</label>
                  <select id="pcf-status" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
                    <option value="Đang sử dụng" ${pc?.status === 'Đang sử dụng' ? 'selected' : ''}>Đang sử dụng</option>
                    <option value="Đang bảo trì" ${pc?.status === 'Đang bảo trì' ? 'selected' : ''}>Đang bảo trì</option>
                    <option value="Hỏng" ${pc?.status === 'Hỏng' ? 'selected' : ''}>Hỏng</option>
                    <option value="Dự phòng" ${pc?.status === 'Dự phòng' ? 'selected' : ''}>Dự phòng</option>
                    <option value="Thanh lý" ${pc?.status === 'Thanh lý' ? 'selected' : ''}>Thanh lý</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Phòng:</label>
                  <select id="pcf-room" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
                    ${this.rooms.map(r => `
                      <option value="${r.id}" ${r.id === targetRoomId ? 'selected' : ''}>${r.roomName} (${r.roomCode})</option>
                    `).join('')}
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Vị trí bàn / Góc làm việc:</label>
                  <input type="text" id="pcf-position" value="${pc?.positionDetail || ''}" placeholder="VD: Bàn 03, Dãy 2" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500">
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Ngày bàn giao:</label>
                  <input type="date" id="pcf-handover" value="${pc?.handoverDate || new Date().toISOString().split('T')[0]}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
            </div>

            <!-- 2. CẤU HÌNH PHẦN CỨNG (Mục 7) -->
            <div class="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200 space-y-3">
              <h4 class="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-microchip text-indigo-600"></i>
                <span>2. CẤU HÌNH PHẦN CỨNG (HARDWARE)</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Số Serial Mainboard:</label>
                  <input type="text" id="pcf-hw-mb-serial" value="${hw.mainboardSerial || ''}" placeholder="SN Mainboard..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-slate-900">
                </div>
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Hãng sản xuất Mainboard:</label>
                  <input type="text" id="pcf-hw-mb-brand" value="${hw.mainboardBrand || 'ASUS'}" placeholder="ASUS, Gigabyte, MSI..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900">
                </div>
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Mã Model Mainboard:</label>
                  <input type="text" id="pcf-hw-mb-model" value="${hw.mainboardModel || 'H510M-K'}" placeholder="B560, H610, H510..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">CPU:</label>
                    <input type="text" id="pcf-hw-cpu" value="${hw.cpu || 'Intel Core i5-10400'}" placeholder="Intel Core i5..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial CPU:</label>
                    <input type="text" id="pcf-hw-cpu-serial" value="${hw.cpuSerial || ''}" placeholder="Serial CPU..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">RAM:</label>
                    <input type="text" id="pcf-hw-ram" value="${hw.ram || '16GB DDR4 3200MHz'}" placeholder="16GB DDR4..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial RAM:</label>
                    <input type="text" id="pcf-hw-ram-serial" value="${hw.ramSerial || ''}" placeholder="Serial RAM..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Ổ Cứng:</label>
                    <input type="text" id="pcf-hw-storage" value="${hw.storage || 'SSD NVMe 512GB Kingston'}" placeholder="SSD 512GB..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial Ổ cứng:</label>
                    <input type="text" id="pcf-hw-storage-serial" value="${hw.storageSerial || ''}" placeholder="Serial SSD..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Card Màn hình (VGA):</label>
                    <input type="text" id="pcf-hw-vga" value="${hw.vga || 'Intel UHD Graphics 630'}" placeholder="GTX 1650, Onboard..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial VGA:</label>
                    <input type="text" id="pcf-hw-vga-serial" value="${hw.vgaSerial || ''}" placeholder="Serial VGA..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Màn hình:</label>
                    <input type="text" id="pcf-hw-screen" value="${hw.screen || 'Dell 24 inch P2419H'}" placeholder="Dell 24 inch..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial Màn hình:</label>
                    <input type="text" id="pcf-hw-screen-serial" value="${hw.screenSerial || ''}" placeholder="Serial màn hình..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Bộ nguồn (PSU):</label>
                    <input type="text" id="pcf-hw-psu" value="${hw.psu || 'Corsair CV550 550W'}" placeholder="550W..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                  </div>
                  <div class="space-y-1">
                    <label class="block font-bold text-slate-700">Serial PSU:</label>
                    <input type="text" id="pcf-hw-psu-serial" value="${hw.psuSerial || ''}" placeholder="Serial nguồn..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. HỆ ĐIỀU HÀNH WINDOWS & MICROSOFT OFFICE (Mục 8, 9) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Windows -->
              <div class="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-2.5">
                <h4 class="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-brands fa-windows text-blue-600"></i>
                  <span>3. HỆ ĐIỀU HÀNH WINDOWS</span>
                </h4>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block font-bold text-slate-700">Hệ điều hành:</label>
                    <select id="pcf-os-name" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                      <option value="Windows 11" ${os.name === 'Windows 11' ? 'selected' : ''}>Windows 11</option>
                      <option value="Windows 10" ${os.name === 'Windows 10' ? 'selected' : ''}>Windows 10</option>
                      <option value="Windows 7" ${os.name === 'Windows 7' ? 'selected' : ''}>Windows 7</option>
                      <option value="Linux" ${os.name === 'Linux' ? 'selected' : ''}>Linux</option>
                      <option value="Khác" ${os.name === 'Khác' ? 'selected' : ''}>Khác</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-700">Thời hạn bản quyền:</label>
                    <input type="text" id="pcf-os-duration" value="${os.duration || 'Vĩnh viễn'}" placeholder="Vĩnh viễn, 1 năm, 3 năm..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold">
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input type="checkbox" id="pcf-os-licensed" class="w-4 h-4 text-blue-600 rounded" ${os.isLicensed ? 'checked' : ''}>
                    <span>☑ Có bản quyền</span>
                  </label>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Mã bản quyền (License Key):</label>
                  <input type="text" id="pcf-os-key" value="${os.licenseKey || ''}" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px]">
                </div>
              </div>

              <!-- Microsoft Office -->
              <div class="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-2.5">
                <h4 class="font-extrabold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-file-word text-amber-600"></i>
                  <span>4. MICROSOFT OFFICE</span>
                </h4>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block font-bold text-slate-700">Phiên bản Office:</label>
                    <select id="pcf-office-ver" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                      <option value="Office 365 (O365)" ${office.version === 'Office 365 (O365)' ? 'selected' : ''}>Office 365 (O365)</option>
                      <option value="Office 2021" ${office.version === 'Office 2021' ? 'selected' : ''}>Office 2021</option>
                      <option value="Office 2019" ${office.version === 'Office 2019' ? 'selected' : ''}>Office 2019</option>
                      <option value="Office 2016" ${office.version === 'Office 2016' ? 'selected' : ''}>Office 2016</option>
                      <option value="Khác" ${office.version === 'Khác' ? 'selected' : ''}>Khác</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-bold text-slate-700">Thời hạn bản quyền:</label>
                    <input type="text" id="pcf-office-duration" value="${office.duration || 'Vĩnh viễn'}" placeholder="Vĩnh viễn, Theo năm..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold">
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input type="checkbox" id="pcf-office-licensed" class="w-4 h-4 text-amber-600 rounded" ${office.isLicensed ? 'checked' : ''}>
                    <span>☑ Có bản quyền</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 4. CÁC PHẦN MỀM KHÁC (Mục 10) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fa-solid fa-cubes text-blue-600"></i>
                  <span>5. CÁC PHẦN MỀM ĐÃ CÀI ĐẶT</span>
                </h4>
                <button type="button" class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-lg cursor-pointer" onclick="RoomsManagementPage.addSoftwareRow()">
                  ⊕ Thêm phần mềm
                </button>
              </div>

              <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th class="p-2">Tên phần mềm</th>
                      <th class="p-2 w-28">Phiên bản</th>
                      <th class="p-2 w-32">Bản quyền & Thời hạn</th>
                      <th class="p-2 w-28">Ngày cài đặt</th>
                      <th class="p-2 w-28">Hạn sử dụng</th>
                      <th class="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody id="pcf-softwares-tbody" class="divide-y divide-slate-100 font-medium">
                    ${softwares.length === 0 ? `
                      <tr class="sw-empty-row"><td colspan="6" class="p-3 text-center text-slate-400">Chưa có phần mềm nào được ghi nhận. Bấm <b>⊕ Thêm phần mềm</b> để bổ sung.</td></tr>
                    ` : softwares.map(sw => `
                      <tr>
                        <td class="p-1.5"><input type="text" class="sw-name w-full p-1 bg-slate-50 border border-slate-200 rounded font-bold" value="${sw.name || ''}" placeholder="VD: Adobe Photoshop"></td>
                        <td class="p-1.5"><input type="text" class="sw-ver w-full p-1 bg-slate-50 border border-slate-200 rounded" value="${sw.version || ''}" placeholder="2024"></td>
                        <td class="p-1.5">
                          <select class="sw-lic w-full p-1 bg-slate-50 border border-slate-200 rounded font-bold">
                            <option value="Bản quyền" ${sw.license === 'Bản quyền' ? 'selected' : ''}>Bản quyền (Vĩnh viễn)</option>
                            <option value="Bản quyền 1 năm" ${sw.license === 'Bản quyền 1 năm' ? 'selected' : ''}>Bản quyền (1 năm)</option>
                            <option value="Miễn phí" ${sw.license === 'Miễn phí' ? 'selected' : ''}>Miễn phí (Free)</option>
                            <option value="Không bản quyền" ${sw.license === 'Không bản quyền' ? 'selected' : ''}>Không có bản quyền</option>
                            <option value="Dùng thử" ${sw.license === 'Dùng thử' ? 'selected' : ''}>Dùng thử (Trial)</option>
                          </select>
                        </td>
                        <td class="p-1.5"><input type="date" class="sw-install w-full p-1 bg-slate-50 border border-slate-200 rounded" value="${sw.installDate || ''}"></td>
                        <td class="p-1.5"><input type="date" class="sw-expire w-full p-1 bg-slate-50 border border-slate-200 rounded" value="${sw.expireDate || ''}"></td>
                        <td class="p-1.5 text-center"><button type="button" class="text-slate-300 hover:text-rose-600" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash-can"></i></button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 5. LỊCH BẢO TRÌ VỆ SINH ĐỊNH KỲ (Mục 11) -->
            <div class="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
              <h4 class="font-extrabold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-calendar-check text-emerald-600"></i>
                <span>6. LỊCH BẢO TRÌ VỆ SINH ĐỊNH KỲ</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Chu kỳ vệ sinh:</label>
                  <select id="pcf-sched-interval" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900" onchange="RoomsManagementPage.calcPCNextMaintenance()">
                    <option value="3" ${schedule.intervalMonths === 3 ? 'selected' : ''}>3 tháng / lần</option>
                    <option value="6" ${schedule.intervalMonths === 6 ? 'selected' : ''}>6 tháng / lần (Mặc định)</option>
                    <option value="12" ${schedule.intervalMonths === 12 ? 'selected' : ''}>12 tháng / lần</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Ngày vệ sinh gần nhất:</label>
                  <input type="date" id="pcf-sched-last" value="${schedule.lastDate || new Date().toISOString().split('T')[0]}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900" onchange="RoomsManagementPage.calcPCNextMaintenance()">
                </div>

                <div class="space-y-1">
                  <label class="block font-bold text-slate-700">Ngày bảo trì tiếp theo (Tự tính):</label>
                  <input type="date" id="pcf-sched-next" value="${nextDate}" class="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-emerald-800" readonly>
                </div>
              </div>
            </div>

            <!-- Submit Buttons -->
            <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                ${isEdit ? `
                  <button type="button" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl cursor-pointer" onclick="RoomsManagementPage.handleDeletePC('${pc.id}', '${pc.pcName || pc.pcCode}')">
                    <i class="fa-solid fa-trash-can mr-1"></i> Xóa máy PC này
                  </button>
                ` : ''}
              </div>

              <div class="flex items-center gap-2">
                <button type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('pc-edit-modal').remove()">
                  Hủy bỏ
                </button>
                <button type="submit" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                  <i class="fa-solid fa-floppy-disk"></i>
                  <span>${isEdit ? 'LƯU CẤU HÌNH MÁY PC' : 'TẠO MÁY PC MỚI'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  calcPCNextMaintenance() {
    const lastDate = document.getElementById('pcf-sched-last')?.value;
    const interval = document.getElementById('pcf-sched-interval')?.value || 6;
    const nextInput = document.getElementById('pcf-sched-next');
    if (nextInput && lastDate) {
      nextInput.value = ApiService.calculateNextMaintenanceDate(lastDate, interval);
    }
  },

  addSoftwareRow() {
    const tbody = document.getElementById('pcf-softwares-tbody');
    if (!tbody) return;

    const emptyRow = tbody.querySelector('.sw-empty-row');
    if (emptyRow) emptyRow.remove();

    const today = new Date().toISOString().split('T')[0];
    const tr = document.createElement('tr');
    tr.className = 'animate-fade-in';
    tr.innerHTML = `
      <td class="p-1.5"><input type="text" class="sw-name w-full p-1 bg-white border border-blue-400 rounded font-bold" placeholder="Tên phần mềm..."></td>
      <td class="p-1.5"><input type="text" class="sw-ver w-full p-1 bg-slate-50 border border-slate-200 rounded" placeholder="Phiên bản"></td>
      <td class="p-1.5">
        <select class="sw-lic w-full p-1 bg-slate-50 border border-slate-200 rounded font-bold">
          <option value="Bản quyền" selected>Bản quyền (Vĩnh viễn)</option>
          <option value="Bản quyền 1 năm">Bản quyền (1 năm)</option>
          <option value="Miễn phí">Miễn phí (Free)</option>
          <option value="Không bản quyền">Không có bản quyền</option>
          <option value="Dùng thử">Dùng thử (Trial)</option>
        </select>
      </td>
      <td class="p-1.5"><input type="date" class="sw-install w-full p-1 bg-slate-50 border border-slate-200 rounded" value="${today}"></td>
      <td class="p-1.5"><input type="date" class="sw-expire w-full p-1 bg-slate-50 border border-slate-200 rounded"></td>
      <td class="p-1.5 text-center"><button type="button" class="text-slate-300 hover:text-rose-600" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash-can"></i></button></td>
    `;
    tbody.appendChild(tr);
  },

  async handlePCFormSubmit(e, pcId) {
    e.preventDefault();

    const roomId = document.getElementById('pcf-room')?.value;
    const room = this.rooms.find(r => r.id === roomId);

    // Thu thập danh sách phần mềm
    const swRows = document.querySelectorAll('#pcf-softwares-tbody tr:not(.sw-empty-row)');
    const softwares = [];
    swRows.forEach(r => {
      const name = r.querySelector('.sw-name')?.value.trim();
      if (name) {
        softwares.push({
          name: name,
          version: r.querySelector('.sw-ver')?.value.trim() || '',
          license: r.querySelector('.sw-lic')?.value || 'Bản quyền',
          installDate: r.querySelector('.sw-install')?.value || '',
          expireDate: r.querySelector('.sw-expire')?.value || ''
        });
      }
    });

    const pcData = {
      pcCode: document.getElementById('pcf-code').value.trim(),
      pcName: document.getElementById('pcf-name').value.trim(),
      userName: document.getElementById('pcf-username').value.trim(),
      status: document.getElementById('pcf-status').value,
      roomId: roomId,
      roomName: room?.roomName || '',
      campusId: room?.campusId || '',
      zoneId: room?.zoneId || '',
      positionDetail: document.getElementById('pcf-position').value.trim(),
      handoverDate: document.getElementById('pcf-handover').value,

      hardware: {
        mainboardSerial: document.getElementById('pcf-hw-mb-serial').value.trim(),
        mainboardBrand: document.getElementById('pcf-hw-mb-brand').value.trim(),
        mainboardModel: document.getElementById('pcf-hw-mb-model').value.trim(),
        cpu: document.getElementById('pcf-hw-cpu').value.trim(),
        cpuSerial: document.getElementById('pcf-hw-cpu-serial').value.trim(),
        ram: document.getElementById('pcf-hw-ram').value.trim(),
        ramSerial: document.getElementById('pcf-hw-ram-serial').value.trim(),
        storage: document.getElementById('pcf-hw-storage').value.trim(),
        storageSerial: document.getElementById('pcf-hw-storage-serial').value.trim(),
        vga: document.getElementById('pcf-hw-vga').value.trim(),
        vgaSerial: document.getElementById('pcf-hw-vga-serial').value.trim(),
        screen: document.getElementById('pcf-hw-screen').value.trim(),
        screenSerial: document.getElementById('pcf-hw-screen-serial').value.trim(),
        psu: document.getElementById('pcf-hw-psu').value.trim(),
        psuSerial: document.getElementById('pcf-hw-psu-serial').value.trim()
      },

      os: {
        name: document.getElementById('pcf-os-name').value,
        duration: document.getElementById('pcf-os-duration').value.trim(),
        isLicensed: document.getElementById('pcf-os-licensed').checked,
        licenseKey: document.getElementById('pcf-os-key').value.trim()
      },

      office: {
        version: document.getElementById('pcf-office-ver').value,
        duration: document.getElementById('pcf-office-duration').value.trim(),
        isLicensed: document.getElementById('pcf-office-licensed').checked
      },

      softwares: softwares,

      maintenanceSchedule: {
        intervalMonths: Number(document.getElementById('pcf-sched-interval').value) || 6,
        lastDate: document.getElementById('pcf-sched-last').value,
        nextDate: document.getElementById('pcf-sched-next').value
      }
    };

    if (!pcData.pcCode || !pcData.pcName) {
      Utils.showToast('Vui lòng nhập đầy đủ Mã máy và Tên máy PC.', 'warning');
      return;
    }

    try {
      if (pcId) {
        await ApiService.updatePC(pcId, pcData);
        Utils.showToast(`Đã cập nhật cấu hình máy PC ${pcData.pcName}!`, 'success');
      } else {
        await ApiService.createPC(pcData);
        Utils.showToast(`Đã tạo mới máy PC ${pcData.pcName}!`, 'success');
      }

      const modal = document.getElementById('pc-edit-modal');
      if (modal) modal.remove();
      await this.loadData();

      // Nếu đang mở từ View PC thì mở lại View PC mới
      if (pcId) {
        this.openPCViewModal(pcId);
      } else if (this.activeRoomId) {
        this.openRoomDetailsModal(this.activeRoomId, 'pcs');
      }
    } catch (err) {
      Utils.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async handleDeletePC(pcId, pcName) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA MÁY PC "${pcName}"?\nLý lịch phần cứng và lịch sử bảo trì sẽ bị xóa vĩnh viễn.`)) {
      return;
    }

    try {
      await ApiService.deletePC(pcId);
      Utils.showToast(`Đã xóa máy PC ${pcName}.`, 'success');
      
      const modalEdit = document.getElementById('pc-edit-modal');
      if (modalEdit) modalEdit.remove();
      const modalView = document.getElementById('pc-view-modal');
      if (modalView) modalView.remove();

      await this.loadData();
      if (this.activeRoomId) {
        this.openRoomDetailsModal(this.activeRoomId, 'pcs');
      }
    } catch (err) {
      Utils.showToast('Lỗi xóa máy PC: ' + err.message, 'error');
    }
  },

  // Modal ghi nhận bảo trì mới
  openAddMaintenanceModal(pcId) {
    const pc = this.pcs.find(p => p.id === pcId);
    if (!pc) return;

    const today = new Date().toISOString().split('T')[0];
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    const maintModal = document.createElement('div');
    maintModal.id = 'pc-maint-form-modal';
    maintModal.className = 'fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in';
    maintModal.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center text-base font-black">
              <i class="fa-solid fa-screwdriver-wrench"></i>
            </div>
            <div>
              <h3 class="text-sm font-black">GHI NHẬN BẢO TRÌ / VỆ SINH</h3>
              <p class="text-[11px] text-emerald-100 font-medium">Máy PC: ${pc.pcName} (${pc.pcCode})</p>
            </div>
          </div>
          <button class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('pc-maint-form-modal').remove()">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>

        <form onsubmit="RoomsManagementPage.handleMaintenanceSubmit(event, '${pc.id}')" class="p-5 space-y-3.5 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Ngày bảo trì <span class="text-rose-500">*</span>:</label>
              <input type="date" id="mf-date" value="${today}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900" required>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Loại bảo trì:</label>
              <select id="mf-type" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
                <option value="Vệ sinh máy định kỳ">Vệ sinh máy định kỳ</option>
                <option value="Cài lại hệ điều hành / Software">Cài lại hệ điều hành / Software</option>
                <option value="Nâng cấp phần cứng (RAM, SSD...)">Nâng cấp phần cứng (RAM, SSD...)</option>
                <option value="Sửa chữa thay thế linh kiện hỏng">Sửa chữa thay thế linh kiện hỏng</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-slate-700">Nội dung thực hiện chi tiết <span class="text-rose-500">*</span>:</label>
            <textarea id="mf-content" rows="2" placeholder="VD: Thổi bụi case, tra keo tản nhiệt CPU, kiểm tra sức khỏe SSD..." class="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900" required></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Người thực hiện (KTV):</label>
              <input type="text" id="mf-performer" value="${AuthService.getCurrentUser()?.displayName || 'Kỹ thuật viên'}" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900">
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-slate-700">Tình trạng sau bảo trì:</label>
              <select id="mf-status-after" class="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-emerald-700">
                <option value="Tốt" selected>Tốt - Hoạt động bình thường</option>
                <option value="Khá">Khá</option>
                <option value="Cần theo dõi">Cần theo dõi thêm</option>
                <option value="Chờ thay linh kiện">Chờ thay linh kiện</option>
              </select>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer" onclick="document.getElementById('pc-maint-form-modal').remove()">
              Hủy
            </button>
            <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2">
              <i class="fa-solid fa-check"></i>
              <span>LƯU LỊCH SỬ BẢO TRÌ</span>
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(maintModal);
  },

  async handleMaintenanceSubmit(e, pcId) {
    e.preventDefault();

    const logData = {
      date: document.getElementById('mf-date').value,
      type: document.getElementById('mf-type').value,
      content: document.getElementById('mf-content').value.trim(),
      performer: document.getElementById('mf-performer').value.trim(),
      statusAfter: document.getElementById('mf-status-after').value
    };

    try {
      await ApiService.addPCMaintenanceLog(pcId, logData);
      Utils.showToast('Đã ghi nhận bảo trì máy PC thành công!', 'success');
      const modal = document.getElementById('pc-maint-form-modal');
      if (modal) modal.remove();

      await this.loadData();
      this.openPCViewModal(pcId);
    } catch (err) {
      Utils.showToast('Lỗi ghi nhận bảo trì: ' + err.message, 'error');
    }
  },

  // ========================================================
  // MODAL 6: QUẢN LÝ CƠ SỞ & KHU VỰC / TÒA NHÀ (Mục 1)
  // ========================================================
  openCampusModal() {
    const container = document.getElementById('rooms-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div id="campus-mgmt-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base font-black">
                <i class="fa-solid fa-cubes-stacked"></i>
              </div>
              <div>
                <h3 class="text-sm font-black">QUẢN LÝ CƠ SỞ & KHU VỰC / TÒA NHÀ</h3>
                <p class="text-[11px] text-slate-400 font-medium">Cấu hình danh mục phân cấp địa điểm toàn trường</p>
              </div>
            </div>
            <button class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer" onclick="document.getElementById('campus-mgmt-modal').remove()">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-slate-800 uppercase tracking-wider">Danh sách các cơ sở (${this.campuses.length})</span>
              <button type="button" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer" onclick="RoomsManagementPage.promptAddCampus()">
                + Thêm cơ sở mới
              </button>
            </div>

            <div class="space-y-3">
              ${this.campuses.map(c => `
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i class="fa-solid fa-school text-blue-600 text-base"></i>
                      <h4 class="font-black text-slate-900 text-sm">${c.name}</h4>
                    </div>
                    <div class="flex items-center gap-1">
                      <button type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold" onclick="RoomsManagementPage.promptAddZone('${c.id}')">
                        + Thêm tòa nhà
                      </button>
                      <button type="button" class="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" onclick="RoomsManagementPage.handleDeleteCampus('${c.id}', '${c.name}')">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Danh sách tòa nhà thuộc cơ sở này -->
                  <div class="pl-4 border-l-2 border-indigo-200 space-y-1.5">
                    <span class="text-[10px] font-bold text-slate-400 uppercase">Khu vực / Tòa nhà:</span>
                    <div class="flex flex-wrap gap-1.5">
                      ${(c.zones || []).length === 0 ? `
                        <span class="text-slate-400 italic text-[11px]">Chưa có tòa nhà nào.</span>
                      ` : (c.zones || []).map(z => `
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs">
                          <span>${z.name}</span>
                          <button type="button" class="text-slate-300 hover:text-rose-600 ml-1" onclick="RoomsManagementPage.handleDeleteZone('${c.id}', '${z.id}', '${z.name}')">
                            <i class="fa-solid fa-xmark text-[10px]"></i>
                          </button>
                        </span>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button type="button" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer" onclick="document.getElementById('campus-mgmt-modal').remove()">
              Xong
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async promptAddCampus() {
    const name = prompt('Nhập tên cơ sở mới (VD: Cơ sở 2, Cơ sở 3...):');
    if (!name || !name.trim()) return;

    const newCampus = {
      id: 'campus_' + Date.now(),
      name: name.trim(),
      zones: [
        { id: 'zone_' + Date.now() + '_1', name: 'Tòa A', rooms: [] }
      ]
    };

    const updated = [...this.campuses, newCampus];
    try {
      await ApiService.saveCampuses(updated);
      this.campuses = updated;
      Utils.showToast(`Đã thêm cơ sở "${name.trim()}"!`, 'success');
      this.openCampusModal();
      this.renderView();
    } catch (err) {
      Utils.showToast('Lỗi thêm cơ sở: ' + err.message, 'error');
    }
  },

  async promptAddZone(campusId) {
    const name = prompt('Nhập tên khu vực / tòa nhà mới (VD: Tòa B, Khu thực hành...):');
    if (!name || !name.trim()) return;

    const campus = this.campuses.find(c => c.id === campusId);
    if (!campus) return;

    const newZone = {
      id: 'zone_' + Date.now(),
      name: name.trim(),
      rooms: []
    };

    campus.zones = campus.zones || [];
    campus.zones.push(newZone);

    try {
      await ApiService.saveCampuses(this.campuses);
      Utils.showToast(`Đã thêm tòa nhà "${name.trim()}" vào ${campus.name}!`, 'success');
      this.openCampusModal();
      this.renderView();
    } catch (err) {
      Utils.showToast('Lỗi thêm tòa nhà: ' + err.message, 'error');
    }
  },

  async handleDeleteCampus(campusId, campusName) {
    if (this.campuses.length <= 1) {
      Utils.showToast('Không thể xóa cơ sở duy nhất còn lại.', 'warning');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn XÓA CƠ SỞ "${campusName}"?\nTất cả tòa nhà thuộc cơ sở này sẽ bị xóa khỏi danh mục.`)) return;

    this.campuses = this.campuses.filter(c => c.id !== campusId);
    try {
      await ApiService.saveCampuses(this.campuses);
      Utils.showToast(`Đã xóa cơ sở ${campusName}.`, 'success');
      this.openCampusModal();
      this.renderView();
    } catch (err) {
      Utils.showToast('Lỗi xóa cơ sở: ' + err.message, 'error');
    }
  },

  async handleDeleteZone(campusId, zoneId, zoneName) {
    if (!confirm(`Xóa tòa nhà "${zoneName}"?`)) return;

    const campus = this.campuses.find(c => c.id === campusId);
    if (!campus) return;

    campus.zones = (campus.zones || []).filter(z => z.id !== zoneId);
    try {
      await ApiService.saveCampuses(this.campuses);
      Utils.showToast(`Đã xóa tòa nhà ${zoneName}.`, 'success');
      this.openCampusModal();
      this.renderView();
    } catch (err) {
      Utils.showToast('Lỗi xóa tòa nhà: ' + err.message, 'error');
    }
  },

  // ========================================================
  // XUẤT BÁO CÁO EXCEL
  // ========================================================
  exportExcel() {
    const filtered = this.getFilteredRooms();
    if (filtered.length === 0) {
      Utils.showToast('Không có dữ liệu để xuất.', 'warning');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'STT,CƠ SỞ,KHU VỰC,MÃ PHÒNG,TÊN PHÒNG,LOẠI PHÒNG,TẦNG,SỨC CHỨA,DIỆN TÍCH,NGƯỜI PHỤ TRÁCH,SĐT,TỔNG THIẾT BỊ,MÁY PC,TÌNH TRẠNG\n';

    filtered.forEach((r, i) => {
      const devCount = (r.devices || []).reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      const roomPcs = this.pcs.filter(p => p.roomId === r.id);
      csv += `"${i + 1}","${r.campusName || ''}","${r.zoneName || ''}","${r.roomCode || ''}","${r.roomName || ''}","${r.roomType || ''}","${r.floor || ''}","${r.capacity || 0}","${r.area || 0}","${r.managerName || ''}","${r.managerPhone || ''}","${devCount}","${roomPcs.length}","${r.status || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_phong_va_thiet_bi_NSG_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast('Đã xuất file dữ liệu phòng thành công!', 'success');
  }
};

window.RoomsManagementPage = RoomsManagementPage;
