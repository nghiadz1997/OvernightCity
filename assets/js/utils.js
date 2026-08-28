/**
 * NSG SUPPORT - CÁC HÀM TIỆN ÍCH DÙNG CHUNG
 */

const Utils = {
  /**
   * Định dạng ngày giờ: 14:30 - 28/08/2026
   */
  formatDateTime(dateInput) {
    if (!dateInput) return 'Chưa có';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const pad = (n) => String(n).padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  },

  /**
   * Định dạng ngày: 28/08/2026
   */
  formatDate(dateInput) {
    if (!dateInput) return 'Chưa có';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  },

  /**
   * Hiển thị thời gian tương đối ("5 phút trước", "2 giờ trước")
   */
  timeAgo(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return this.formatDate(dateInput);
  },

  /**
   * Kiểm tra hạn chót còn lại bao lâu
   */
  getDeadlineStatus(deadlineStr, isCompleted = false) {
    if (!deadlineStr || isCompleted) return { label: 'Đúng hạn', color: 'green', isOverdue: false };
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs = deadline - now;

    if (diffMs < 0) {
      const hoursLate = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
      return {
        label: `Quá hạn ${hoursLate > 24 ? Math.floor(hoursLate / 24) + ' ngày' : hoursLate + ' giờ'}`,
        color: 'red',
        isOverdue: true
      };
    }

    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    if (hoursLeft <= 3) {
      return { label: `Sắp hết hạn (${hoursLeft}h)`, color: 'orange', isOverdue: false, isNear: true };
    }

    return {
      label: `Còn ${hoursLeft > 24 ? Math.floor(hoursLeft / 24) + ' ngày' : hoursLeft + ' giờ'}`,
      color: 'blue',
      isOverdue: false
    };
  },

  /**
   * Render HTML Badge Mức độ ưu tiên
   */
  renderPriorityBadge(priority) {
    const p = (priority || 'BÌNH THƯỜNG').toUpperCase();
    if (p === 'KHẨN CẤP') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-urgent pulse-emergency">
        <i class="fa-solid fa-triangle-exclamation text-[11px]"></i> KHẨN CẤP
      </span>`;
    }
    if (p === 'CAO') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-high">
        <i class="fa-solid fa-arrow-trend-up text-[11px]"></i> CAO
      </span>`;
    }
    if (p === 'TRUNG BÌNH') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-medium">
        <i class="fa-solid fa-circle text-[8px]"></i> TRUNG BÌNH
      </span>`;
    }
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-normal">
      <i class="fa-solid fa-circle-check text-[11px]"></i> BÌNH THƯỜNG
    </span>`;
  },

  /**
   * Render HTML Badge Trạng thái
   */
  renderStatusBadge(status, isOverdue = false) {
    const s = (status || 'CHỜ PHÂN CÔNG').toUpperCase();
    let badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
    let icon = 'fa-clock';

    if (s === 'MỚI' || s === 'CHỜ PHÂN CÔNG') {
      badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
      icon = 'fa-hourglass-start';
    } else if (s === 'ĐÃ PHÂN CÔNG') {
      badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
      icon = 'fa-user-check';
    } else if (s === 'ĐANG XỬ LÝ') {
      badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      icon = 'fa-screwdriver-wrench';
    } else if (s === 'CHỜ NGHIỆM THU') {
      badgeClass = 'bg-purple-50 text-purple-700 border border-purple-200';
      icon = 'fa-clipboard-check';
    } else if (s === 'HOÀN THÀNH') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      icon = 'fa-circle-check';
    } else if (s === 'TẠM DỪNG') {
      badgeClass = 'bg-orange-50 text-orange-700 border border-orange-200';
      icon = 'fa-pause';
    } else if (s === 'HỦY') {
      badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
      icon = 'fa-ban';
    }

    let html = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}">
      <i class="fa-solid ${icon} text-[10px]"></i> ${s}
    </span>`;

    if (isOverdue && s !== 'HOÀN THÀNH' && s !== 'HỦY') {
      html += ` <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
        <i class="fa-solid fa-clock-rotate-left"></i> QUÁ HẠN
      </span>`;
    }

    return html;
  },

  /**
   * Hiển thị Toast Notification trên màn hình
   */
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let icon = 'fa-circle-info text-blue-500';
    if (type === 'success') icon = 'fa-circle-check text-emerald-500';
    if (type === 'error') icon = 'fa-triangle-exclamation text-rose-500';
    if (type === 'warning') icon = 'fa-circle-exclamation text-amber-500';

    toast.innerHTML = `
      <i class="fa-solid ${icon} text-lg"></i>
      <div class="flex-1 text-sm font-medium text-slate-800">${message}</div>
      <button class="text-slate-400 hover:text-slate-600 ml-2" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },

  /**
   * Nén ảnh trực tiếp trên trình duyệt qua HTML5 Canvas trước khi upload
   */
  compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return resolve(file); // Nếu không phải ảnh thì giữ nguyên file
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  },

  /**
   * Modal xác nhận hành động (Confirmation Modal Promise)
   */
  confirmModal(title, message, confirmBtnText = 'Đồng ý', confirmBtnColor = 'bg-blue-600 hover:bg-blue-700') {
    return new Promise((resolve) => {
      const modalId = 'dynamic-confirm-modal';
      const existing = document.getElementById(modalId);
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-800 transform transition-all scale-100">
          <h3 class="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-blue-600"></i> ${title}
          </h3>
          <p class="text-sm text-slate-600 mb-6 leading-relaxed">${message}</p>
          <div class="flex justify-end gap-3">
            <button id="modal-cancel-btn" class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Hủy bỏ
            </button>
            <button id="modal-confirm-btn" class="px-4 py-2 text-sm font-medium text-white ${confirmBtnColor} rounded-lg shadow-sm transition-colors">
              ${confirmBtnText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('modal-cancel-btn').onclick = () => {
        modal.remove();
        resolve(false);
      };
      document.getElementById('modal-confirm-btn').onclick = () => {
        modal.remove();
        resolve(true);
      };
    });
  },

  /**
   * Xuất danh sách ra tệp CSV hỗ trợ tiếng Việt có BOM
   */
  exportToCsv(filename, headers, rows) {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Chuyển Base64 Data URL sang Binary Blob để gửi ảnh qua Telegram Bot / FormData
   */
  dataURLtoBlob(dataurl) {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn('Lỗi parse dataURLtoBlob:', e);
      return null;
    }
  },

  /**
   * Kiểm tra xem 1 công việc có được phân công cho nhân viên này hay không
   * Hỗ trợ cả 1 người (đơn) và nhiều người cùng làm 1 việc (nhóm 2-3 KTV)
   */
  isTaskAssignedToUser(item, userId) {
    if (!item || !userId) return false;
    if (item.assignedTo === userId) return true;
    if (item.deputyCoordinatorId === userId) return true;
    if (Array.isArray(item.assignedTo) && item.assignedTo.includes(userId)) return true;
    if (Array.isArray(item.assignedToIds) && item.assignedToIds.includes(userId)) return true;
    if (Array.isArray(item.assignees) && item.assignees.some(a => (a.uid === userId || a.id === userId))) return true;
    if (typeof item.assignedTo === 'string' && item.assignedTo.split(',').map(s => s.trim()).includes(userId)) return true;
    return false;
  }
};

window.Utils = Utils;
