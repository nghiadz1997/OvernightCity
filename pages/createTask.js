/**
 * NSG SUPPORT - PROACTIVE TASK CREATION PAGE (+ GIAO VIỆC MỚI)
 * Đáp ứng yêu cầu mục 15: Trưởng phòng chủ động giao việc nội bộ (mã TASK-YYYY-000001)
 * Hỗ trợ bộ chọn phân cấp 3 tầng: Cơ sở -> Khu vực -> Phòng
 */

const CreateTaskPage = {
  async init() {
    // 1. Tải danh sách phòng ban động
    try {
      const depts = await ApiService.loadDepartments();
      const deptSelect = document.getElementById('task-department');
      if (deptSelect && depts && depts.length > 0) {
        deptSelect.innerHTML = depts.map(d => `<option value="${d}">${d}</option>`).join('');
      }
    } catch (e) {
      console.warn('Lỗi nạp departments:', e);
    }

    // 2. Tải danh mục loại thiết bị động
    try {
      const categories = await ApiService.loadCategories();
      const catSelect = document.getElementById('task-category');
      if (catSelect && categories && categories.length > 0) {
        catSelect.innerHTML = categories.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('');
      }
    } catch (e) {
      console.warn('Lỗi nạp categories:', e);
    }

    // 3. Tải địa điểm động
    try {
      await ApiService.loadCampuses();
    } catch (e) {}

    this.loadStaffIntoSelect();
    this.initLocationSelectors();
  },

  initLocationSelectors() {
    const campusSelect = document.getElementById('task-campus');
    const zoneSelect = document.getElementById('task-zone');
    const roomSelect = document.getElementById('task-room-select');
    const customRoomContainer = document.getElementById('task-room-custom-container');

    if (!campusSelect || !zoneSelect || !roomSelect) return;

    const campuses = window.APP_CONFIG.CAMPUSES || [];
    campusSelect.innerHTML = `
      <option value="">-- Chọn Cơ sở --</option>
      ${campuses.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
    `;

    zoneSelect.innerHTML = `<option value="">-- Chọn Cơ sở trước --</option>`;
    zoneSelect.disabled = true;
    roomSelect.innerHTML = `<option value="">-- Chọn Khu vực trước --</option>`;
    roomSelect.disabled = true;
    if (customRoomContainer) customRoomContainer.classList.add('hidden');

    campusSelect.onchange = () => {
      const selectedCampusId = campusSelect.value;
      const campus = campuses.find(c => c.id === selectedCampusId);

      if (campus && campus.zones && campus.zones.length > 0) {
        zoneSelect.disabled = false;
        zoneSelect.innerHTML = `
          <option value="">-- Chọn Khu vực / Tòa nhà --</option>
          ${campus.zones.map(z => `<option value="${z.id}" data-name="${z.name}">${z.name}</option>`).join('')}
        `;
      } else {
        zoneSelect.innerHTML = `<option value="">-- Chọn Cơ sở trước --</option>`;
        zoneSelect.disabled = true;
      }

      roomSelect.innerHTML = `<option value="">-- Chọn Khu vực trước --</option>`;
      roomSelect.disabled = true;
      if (customRoomContainer) customRoomContainer.classList.add('hidden');
    };

    zoneSelect.onchange = () => {
      const selectedCampusId = campusSelect.value;
      const selectedZoneId = zoneSelect.value;
      const campus = campuses.find(c => c.id === selectedCampusId);
      const zone = campus?.zones?.find(z => z.id === selectedZoneId);

      if (zone && zone.rooms && zone.rooms.length > 0) {
        roomSelect.disabled = false;
        roomSelect.innerHTML = `
          <option value="">-- Chọn Phòng / Vị trí cụ thể --</option>
          ${zone.rooms.map(r => `<option value="${r}">${r}</option>`).join('')}
          <option value="CUSTOM">➕ Phòng / Vị trí khác (Nhập tay)...</option>
        `;
      } else {
        roomSelect.innerHTML = `<option value="">-- Chọn Khu vực trước --</option>`;
        roomSelect.disabled = true;
      }

      if (customRoomContainer) customRoomContainer.classList.add('hidden');
    };

    roomSelect.onchange = () => {
      if (roomSelect.value === 'CUSTOM') {
        if (customRoomContainer) {
          customRoomContainer.classList.remove('hidden');
          const customInput = document.getElementById('task-room-custom');
          if (customInput) customInput.focus();
        }
      } else {
        if (customRoomContainer) customRoomContainer.classList.add('hidden');
      }
    };
  },

  render() {
    const categories = window.APP_CONFIG.CATEGORIES;
    const departments = window.APP_CONFIG.DEPARTMENTS;

    setTimeout(() => this.init(), 50);

    return `
      <div class="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <a href="#/admin" class="hover:text-blue-600">Quản trị</a>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span class="text-slate-900 font-semibold">Chủ động giao việc mới</span>
        </nav>

        <!-- Form Card -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-700 to-blue-700 p-6 sm:p-8 text-white">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                <i class="fa-solid fa-plus-circle"></i>
              </div>
              <div>
                <h1 class="text-xl font-black">GIAO VIỆC MỚI CHO BỘ PHẬN KỸ THUẬT</h1>
                <p class="text-xs text-indigo-100 mt-0.5">Nhiệm vụ công việc chủ động từ lãnh đạo (mã sinh tự động: TASK-2026-xxxxxx)</p>
              </div>
            </div>
          </div>

          <form id="create-task-form" class="p-6 sm:p-8 space-y-6" onsubmit="CreateTaskPage.handleSubmit(event)">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tiêu đề nhiệm vụ <span class="text-red-500">*</span></label>
              <input type="text" id="task-title" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="Ví dụ: Kiểm tra bảo dưỡng hệ thống máy chiếu Giảng đường A trước kỳ thi" required>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết & Yêu cầu kỹ thuật <span class="text-red-500">*</span></label>
              <textarea id="task-desc" rows="4" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 leading-relaxed" placeholder="Liệt kê chi tiết các hạng mục cần thực hiện, thiết bị thay thế, biên bản nghiệm thu cần ký..." required></textarea>
            </div>

            <!-- Cụm chọn Địa điểm 3 tầng (Cơ sở -> Khu vực -> Phòng) -->
            <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <span class="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <i class="fa-solid fa-building text-indigo-600"></i> Địa điểm thực hiện (3 Tầng):
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">1. Cơ sở <span class="text-red-500">*</span></label>
                  <select id="task-campus" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required>
                    <option value="">-- Chọn Cơ sở --</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">2. Khu vực / Tòa nhà <span class="text-red-500">*</span></label>
                  <select id="task-zone" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required disabled>
                    <option value="">-- Chọn Cơ sở trước --</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">3. Phòng / Vị trí <span class="text-red-500">*</span></label>
                  <select id="task-room-select" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold bg-white" required disabled>
                    <option value="">-- Chọn Khu vực trước --</option>
                  </select>
                </div>
              </div>

              <div id="task-room-custom-container" class="hidden pt-1">
                <label class="block text-xs font-bold text-indigo-700 mb-1">Nhập tên phòng / vị trí cụ thể khác <span class="text-red-500">*</span></label>
                <input type="text" id="task-room-custom" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 bg-white font-medium" placeholder="Ví dụ: Phòng họp giao ban, Khuôn viên sân...">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Loại công việc / Danh mục</label>
                <select id="task-category" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium">
                  ${categories.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Khoa / Phòng ban tiếp nhận</label>
                <select id="task-department" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium">
                  ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
              </div>

              <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-xs font-bold text-slate-700">
                    Phân công Kỹ thuật viên phụ trách (Có thể chọn 1 hoặc nhóm 2-3 KTV cùng làm)
                  </label>
                  <span id="create-task-staff-count" class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Để trống nếu chờ nhân viên tự nhận
                  </span>
                </div>
                <div id="create-task-staff-container" class="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 space-y-1.5 bg-slate-50/50">
                  <div class="text-xs text-slate-400 p-3 text-center">Đang tải danh sách kỹ thuật viên...</div>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
                <select id="task-priority" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold">
                  <option value="BÌNH THƯỜNG">🟢 Bình thường</option>
                  <option value="TRUNG BÌNH" selected>🟡 Trung bình</option>
                  <option value="CAO">🟠 Cao</option>
                  <option value="KHẨN CẤP">🔴 Khẩn cấp</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Hạn chót hoàn thành (Deadline)</label>
                <input type="datetime-local" id="task-deadline" class="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <div class="pt-4 border-t border-slate-200">
              <button type="submit" id="btn-create-task-submit" class="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                <i class="fa-solid fa-paper-plane"></i>
                <span>TẠO & PHÂN CÔNG CÔNG VIỆC NGAY</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-create-task-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Đang tạo công việc...</span>';

    try {
      const catSelect = document.getElementById('task-category');
      const catName = catSelect.options[catSelect.selectedIndex]?.getAttribute('data-name') || 'Khác';

      // Lấy danh sách kỹ thuật viên được tick chọn (hỗ trợ 1 người hoặc nhóm 2-3 KTV)
      const checkboxes = document.querySelectorAll('input[name="create_task_staff_checkbox"]:checked');
      const assignees = Array.from(checkboxes).map(cb => ({
        uid: cb.value,
        name: cb.getAttribute('data-name'),
        role: cb.getAttribute('data-role')
      }));
      const assignedToIds = assignees.map(a => a.uid);
      const assignedToName = assignees.length > 0 ? assignees.map(a => a.name).join(', ') : null;
      const assignedTo = assignedToIds.length === 1 ? assignedToIds[0] : (assignedToIds.length > 1 ? assignedToIds : null);

      // Lấy địa điểm 3 tầng
      const campusSelect = document.getElementById('task-campus');
      const zoneSelect = document.getElementById('task-zone');
      const roomSelect = document.getElementById('task-room-select');
      const customRoomInput = document.getElementById('task-room-custom');

      const campusName = campusSelect.options[campusSelect.selectedIndex]?.getAttribute('data-name') || campusSelect.value;
      const zoneName = zoneSelect.options[zoneSelect.selectedIndex]?.getAttribute('data-name') || zoneSelect.value;
      
      let roomName = roomSelect.value;
      if (roomName === 'CUSTOM') {
        roomName = customRoomInput ? customRoomInput.value.trim() : '';
        if (!roomName) {
          Utils.showToast('Vui lòng nhập tên phòng / vị trí cụ thể!', 'warning');
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>TẠO & PHÂN CÔNG CÔNG VIỆC NGAY</span>';
          if (customRoomInput) customRoomInput.focus();
          return;
        }
      }

      if (!campusName || !zoneName || !roomName) {
        Utils.showToast('Vui lòng chọn đầy đủ Cơ sở, Khu vực và Phòng!', 'warning');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>TẠO & PHÂN CÔNG CÔNG VIỆC NGAY</span>';
        return;
      }

      const currentUser = AuthService.getCurrentUser();
      const isDeputy = AuthService.isDeputyManager();
      const hasDeputy = assignees.some(a => a.role === 'DEPUTY_MANAGER');

      const payload = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        categoryId: catSelect.value,
        categoryName: catName,
        departmentName: document.getElementById('task-department').value,
        location: fullLocation,
        room: roomName,
        assignedTo: assignedTo,
        assignedToName: assignedToName,
        assignedToIds: assignedToIds,
        assignees: assignees,
        priority: document.getElementById('task-priority').value,
        deadline: document.getElementById('task-deadline').value || null
      };

      if (isDeputy) {
        payload.deputyCoordinator = currentUser?.displayName || 'Phó Trưởng phòng';
        payload.deputyCoordinatorId = currentUser?.uid;
      } else if (hasDeputy) {
        payload.assignedByManager = currentUser?.displayName || 'Trưởng phòng';
        payload.assignedRole = 'DEPUTY_MANAGER';
      }

      const result = await ApiService.createTask(payload);
      if (result.success) {
        if (result.data) {
          RealtimeService.handleTaskUpdate(result.data);
        }
        SoundService.playSuccess();
        Utils.showToast(`Đã giao công việc mới thành công! Mã: ${result.code}`, 'success');
        setTimeout(() => {
          window.location.hash = '#/admin/tasks';
        }, 1200);
      } else {
        throw new Error(result.message || 'Lỗi tạo nhiệm vụ.');
      }
    } catch (err) {
      Utils.showToast(err.message || 'Không thể tạo nhiệm vụ.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>TẠO & PHÂN CÔNG CÔNG VIỆC NGAY</span>';
      }
    }
  },

  updateCreateTaskSelectionCount() {
    const checkboxes = document.querySelectorAll('input[name="create_task_staff_checkbox"]:checked');
    const badge = document.getElementById('create-task-staff-count');
    if (badge) {
      if (checkboxes.length === 0) {
        badge.innerText = 'Để trống nếu chờ nhân viên tự nhận';
        badge.className = 'text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200';
      } else {
        const names = Array.from(checkboxes).map(c => c.getAttribute('data-name')).join(', ');
        badge.innerText = `Đã chọn: ${checkboxes.length} người (${names})`;
        badge.className = 'text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200';
      }
    }
  },

  async loadStaffIntoSelect() {
    if (window.firebase && window.firebase.firestore) {
      try {
        const snap = await window.firebase.firestore().collection('users').get();
        const container = document.getElementById('create-task-staff-container');
        if (!container) return;

        const allUsers = [];
        snap.forEach(doc => {
          const u = { uid: doc.id, ...doc.data() };
          if (u.isActive !== false) allUsers.push(u);
        });

        // Trưởng phòng chỉ được phân công Phó phòng và Kỹ thuật viên (STAFF, STAFF_KTX)
        const allowedRoles = AuthService.isSuperAdmin() 
          ? ['MANAGER', 'DEPUTY_MANAGER', 'STAFF', 'STAFF_KTX'] 
          : ['DEPUTY_MANAGER', 'STAFF', 'STAFF_KTX'];

        const eligibleStaff = allUsers.filter(u => allowedRoles.includes(u.role || 'STAFF'));

        if (eligibleStaff.length === 0) {
          container.innerHTML = '<div class="p-3 text-center text-xs text-slate-400">Không có kỹ thuật viên khả dụng.</div>';
          return;
        }

        container.innerHTML = eligibleStaff.map(s => {
          const roleBadge = s.role === 'DEPUTY_MANAGER' ? 'Phó Trưởng phòng' : s.role === 'STAFF_KTX' ? 'KTV Ký Túc Xá' : s.role === 'MANAGER' ? 'Trưởng phòng' : 'Kỹ thuật viên';
          const roleColor = s.role === 'DEPUTY_MANAGER' ? 'bg-purple-100 text-purple-800' : s.role === 'STAFF_KTX' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800';

          return `
            <label class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs hover:bg-indigo-50/30">
              <div class="flex items-center gap-3 min-w-0">
                <input type="checkbox" name="create_task_staff_checkbox" value="${s.uid}" data-name="${s.displayName || s.email}" data-role="${s.role || 'STAFF'}" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" onchange="CreateTaskPage.updateCreateTaskSelectionCount()">
                <div class="truncate">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-extrabold text-slate-900 truncate">${s.displayName || s.email}</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${roleColor}">${roleBadge}</span>
                  </div>
                  <span class="text-[10px] text-slate-500">${s.departmentName ? s.departmentName : 'Bộ phận Kỹ thuật'} ${s.phone ? '• SĐT: ' + s.phone : ''}</span>
                </div>
              </div>
            </label>
          `;
        }).join('');
      } catch (e) {
        console.warn('Cannot load staff for createTask:', e);
      }
    }
  }
};

window.CreateTaskPage = CreateTaskPage;
