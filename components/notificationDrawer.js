/**
 * NSG SUPPORT - NOTIFICATION DRAWER COMPONENT
 */

const NotificationDrawerComponent = {
  isOpen: false,

  render(containerId = 'notification-drawer-container') {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    const notifications = RealtimeService.notifications || [];
    const unreadCount = notifications.filter(n => !n.isRead).length;

    container.innerHTML = `
      <!-- Backdrop -->
      <div id="notif-backdrop" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity ${this.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}" onclick="NotificationDrawerComponent.close()"></div>

      <!-- Slide-out Drawer -->
      <div id="notif-drawer" class="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${this.isOpen ? 'translate-x-0' : 'translate-x-full'}">
        <!-- Header -->
        <div class="h-16 px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-bell text-blue-400"></i>
            <h3 class="font-bold text-base">Trung tâm thông báo</h3>
            ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">${unreadCount}</span>` : ''}
          </div>
          <div class="flex items-center gap-3">
            ${unreadCount > 0 ? `
              <button class="text-xs text-blue-300 hover:text-white underline font-medium" onclick="NotificationDrawerComponent.markAllRead()">
                Đã đọc tất cả
              </button>
            ` : ''}
            <button class="text-slate-400 hover:text-white text-lg p-1" onclick="NotificationDrawerComponent.close()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          ${notifications.length === 0 ? `
            <div class="text-center text-slate-400 py-16">
              <i class="fa-regular fa-bell-slash text-4xl mb-3 block text-slate-300"></i>
              <p class="text-sm font-medium">Hiện không có thông báo nào.</p>
            </div>
          ` : notifications.map(n => `
            <div class="p-3.5 rounded-xl border transition-all cursor-pointer ${n.isRead ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-blue-50/70 border-blue-200 hover:bg-blue-50'}" onclick="NotificationDrawerComponent.handleClickItem('${n.targetId || ''}', '${n.targetCode || ''}', '${n.id}')">
              <div class="flex items-start justify-between gap-2">
                <h4 class="text-xs font-bold ${n.isRead ? 'text-slate-800' : 'text-blue-900'} leading-tight">
                  ${n.title}
                </h4>
                <span class="text-[10px] text-slate-400 whitespace-nowrap">
                  ${Utils.timeAgo(n.createdAt)}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                ${n.body}
              </p>
              ${n.targetCode ? `
                <div class="mt-2 flex items-center gap-1.5">
                  <span class="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    ${n.targetCode}
                  </span>
                  <span class="text-[10px] text-blue-600 font-semibold hover:underline">
                    Xem chi tiết →
                  </span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <p class="text-[11px] text-slate-400">Hệ thống thông báo Realtime NSG SUPPORT</p>
        </div>
      </div>
    `;
  },

  toggle() {
    this.isOpen = !this.isOpen;
    this.render();
  },

  open() {
    this.isOpen = true;
    this.render();
  },

  close() {
    this.isOpen = false;
    this.render();
  },

  markAllRead() {
    (RealtimeService.notifications || []).forEach(n => n.isRead = true);
    RealtimeService.saveLocalData();
    NavbarComponent.updateBadge(0);
    this.render();
    Utils.showToast('Đã đánh dấu đọc tất cả thông báo.', 'info');
  },

  handleClickItem(targetId, targetCode, notifId) {
    const notif = (RealtimeService.notifications || []).find(n => n.id === notifId);
    if (notif) {
      notif.isRead = true;
      RealtimeService.saveLocalData();
      NavbarComponent.updateBadge(RealtimeService.notifications.filter(n => !n.isRead).length);
    }
    this.close();

    if (targetCode) {
      TaskModalComponent.open(targetId, targetCode, targetCode.startsWith('TASK-') ? 'TASK' : 'REPORT');
    }
  }
};

window.NotificationDrawerComponent = NotificationDrawerComponent;
