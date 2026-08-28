/**
 * NSG SUPPORT - REALTIME LISTENER ENGINE
 * Sử dụng Firebase Firestore onSnapshot listener thực tế (KHÔNG dùng setInterval polling)
 * Tự động cập nhật giao diện Dashboard, danh sách công việc, bình luận và thông báo tức thì
 */

const RealtimeService = {
  db: null,
  reportsUnsub: null,
  tasksUnsub: null,
  notificationsUnsub: null,

  // Cache dữ liệu realtime tại Client
  reports: [],
  tasks: [],
  notifications: [],

  // Danh sách callbacks đăng ký lắng nghe
  reportListeners: new Set(),
  taskListeners: new Set(),
  notificationListeners: new Set(),

  init() {
    console.log('[RealtimeService] Initializing Realtime Engine...');

    // Khởi tạo BroadcastChannel để đồng bộ tức thì giữa các tab trình duyệt trong môi trường nội bộ
    try {
      this.channel = new BroadcastChannel('nsg_realtime_sync');
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'NEW_REPORT') {
          this.handleIncomingReport(data, false);
        } else if (type === 'TASK_UPDATE') {
          this.handleTaskUpdate(data, false);
        } else if (type === 'NEW_NOTIFICATION') {
          this.handleIncomingNotification(data, false);
        }
      };
    } catch (e) {
      console.warn('[RealtimeService] BroadcastChannel not supported in this browser.');
    }

    // Nếu Firebase SDK đã được nhúng trong trang
    try {
      if (window.firebase) {
        if (!window.firebase.apps || !window.firebase.apps.length) {
          if (window.APP_CONFIG && window.APP_CONFIG.firebaseConfig) {
            window.firebase.initializeApp(window.APP_CONFIG.firebaseConfig);
          }
        }
        if (typeof window.firebase.firestore === 'function') {
          this.db = window.firebase.firestore();
          this.startFirestoreListeners();
        }
      }
    } catch (err) {
      console.warn('[RealtimeService] Firestore initialization fallback:', err.message);
      this.loadLocalData();
    }
  },

  /**
   * Đăng ký lắng nghe Firestore Realtime onSnapshot thực tế
   */
  startFirestoreListeners() {
    if (!this.db) return;

    // 1. Lắng nghe collection reports realtime
    this.reportsUnsub = this.db.collection('reports')
      .limit(100)
      .onSnapshot((snapshot) => {
        const newReports = [];
        snapshot.forEach((doc) => {
          newReports.push({ id: doc.id, ...doc.data() });
        });

        // Sắp xếp mới nhất lên đầu
        newReports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        this.reports = newReports;
        this.notifyReportListeners();
      }, (error) => {
        console.error('[RealtimeService] Reports onSnapshot error:', error);
      });

    // 2. Lắng nghe collection tasks realtime
    this.tasksUnsub = this.db.collection('tasks')
      .limit(100)
      .onSnapshot((snapshot) => {
        const newTasks = [];
        snapshot.forEach((doc) => {
          newTasks.push({ id: doc.id, ...doc.data() });
        });

        newTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        this.tasks = newTasks;
        this.notifyTaskListeners();
      }, (error) => {
        console.error('[RealtimeService] Tasks onSnapshot error:', error);
      });

    // 3. Lắng nghe collection notifications realtime
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      this.notificationsUnsub = this.db.collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          this.notifications = list;
          this.notifyNotificationListeners();
        });
    }
  },

  /**
   * Phát chuông và hiển thị thông báo nổi khi có phản ánh mới
   */
  triggerNewReportAlert(report) {
    if (report.priority === 'KHẨN CẤP') {
      SoundService.playUrgentAlert();
      Utils.showToast(`🚨 PHẢN ÁNH KHẨN CẤP MỚI: [${report.code}] ${report.title} tại ${report.location}`, 'error', 8000);
    } else {
      SoundService.playChime();
      Utils.showToast(`🔔 Có phản ánh mới: [${report.code}] ${report.title}`, 'info', 5000);
    }
  },

  handleIncomingReport(report, broadcast = true) {
    const existingIdx = this.reports.findIndex(r => r.id === report.id || r.code === report.code);
    if (existingIdx >= 0) {
      this.reports[existingIdx] = { ...this.reports[existingIdx], ...report };
    } else {
      this.reports.unshift(report);
      this.triggerNewReportAlert(report);
    }

    this.saveLocalData();
    this.notifyReportListeners();

    if (broadcast && this.channel) {
      this.channel.postMessage({ type: 'NEW_REPORT', data: report });
    }
  },

  handleTaskUpdate(task, broadcast = true) {
    const existingIdx = this.tasks.findIndex(t => t.id === task.id || t.code === task.code);
    if (existingIdx >= 0) {
      this.tasks[existingIdx] = { ...this.tasks[existingIdx], ...task };
    } else {
      this.tasks.unshift(task);
    }

    this.saveLocalData();
    this.notifyTaskListeners();

    if (broadcast && this.channel) {
      this.channel.postMessage({ type: 'TASK_UPDATE', data: task });
    }
  },

  handleIncomingNotification(noti, broadcast = true) {
    this.notifications.unshift(noti);
    this.saveLocalData();
    this.notifyNotificationListeners();
    SoundService.playChime();

    if (broadcast && this.channel) {
      this.channel.postMessage({ type: 'NEW_NOTIFICATION', data: noti });
    }
  },

  // Listeners registration
  subscribeReports(callback) {
    this.reportListeners.add(callback);
    callback(this.reports);
    return () => this.reportListeners.delete(callback);
  },

  subscribeTasks(callback) {
    this.taskListeners.add(callback);
    callback(this.tasks);
    return () => this.taskListeners.delete(callback);
  },

  subscribeNotifications(callback) {
    this.notificationListeners.add(callback);
    callback(this.notifications);
    return () => this.notificationListeners.delete(callback);
  },

  notifyReportListeners() {
    this.reportListeners.forEach(cb => {
      try { cb(this.reports); } catch (e) { console.error(e); }
    });
  },

  notifyTaskListeners() {
    this.taskListeners.forEach(cb => {
      try { cb(this.tasks); } catch (e) { console.error(e); }
    });
  },

  notifyNotificationListeners() {
    this.notificationListeners.forEach(cb => {
      try { cb(this.notifications); } catch (e) { console.error(e); }
    });
  },

  // Đồng bộ lưu trữ LocalStorage cho demo mượt mà
  saveLocalData() {
    try {
      localStorage.setItem('nsg_realtime_reports', JSON.stringify(this.reports.slice(0, 100)));
      localStorage.setItem('nsg_realtime_tasks', JSON.stringify(this.tasks.slice(0, 100)));
      localStorage.setItem('nsg_realtime_notifications', JSON.stringify(this.notifications.slice(0, 50)));
    } catch (e) {}
  },

  loadLocalData() {
    // Không dùng dữ liệu mẫu. Dữ liệu chạy 100% từ Cloud Firestore của người dùng.
    try {
      const rep = localStorage.getItem('nsg_realtime_reports');
      const tas = localStorage.getItem('nsg_realtime_tasks');
      const not = localStorage.getItem('nsg_realtime_notifications');

      if (rep) this.reports = JSON.parse(rep);
      if (tas) this.tasks = JSON.parse(tas);
      if (not) this.notifications = JSON.parse(not);
    } catch (e) {
      this.reports = [];
      this.tasks = [];
      this.notifications = [];
    }

    this.notifyReportListeners();
    this.notifyTaskListeners();
    this.notifyNotificationListeners();
  }
};

window.RealtimeService = RealtimeService;
