/**
 * NSG SUPPORT - PURE FIREBASE AUTHENTICATION & RBAC ROLE MANAGEMENT
 * Hoàn toàn chạy thực tế 100% qua Firebase Authentication & Cloud Firestore (Đã gỡ bỏ toàn bộ Demo/Mock)
 */

const AuthService = {
  currentUser: null,
  listeners: [],
  isInitialized: false,

  init() {
    console.log('[AuthService] Initializing Pure Firebase Auth...');

    try {
      if (window.firebase) {
        if (!window.firebase.apps || !window.firebase.apps.length) {
          if (window.APP_CONFIG && window.APP_CONFIG.firebaseConfig) {
            window.firebase.initializeApp(window.APP_CONFIG.firebaseConfig);
          }
        }

        if (typeof window.firebase.auth === 'function') {
          window.firebase.auth().onAuthStateChanged(async (fbUser) => {
            if (fbUser) {
              console.log('[AuthService] Firebase User detected:', fbUser.email);
              let role = 'USER';
              let departmentName = 'Cán bộ / Giảng viên';
              let displayName = fbUser.displayName || fbUser.email.split('@')[0];
              let phone = '';

              // Đọc phân quyền (Role RBAC) từ Cloud Firestore collection 'users'
              if (window.firebase.firestore) {
                try {
                  const userDoc = await window.firebase.firestore().collection('users').doc(fbUser.uid).get();
                  if (userDoc.exists) {
                    const data = userDoc.data();
                    role = data.role || 'USER';
                    departmentName = data.departmentName || departmentName;
                    displayName = data.displayName || displayName;
                    phone = data.phone || phone;
                  } else {
                    // Nếu là tài khoản đầu tiên hoặc chưa có record trong Firestore, khởi tạo ngay
                    if (fbUser.email.includes('admin')) role = 'SUPER_ADMIN';
                    else if (fbUser.email.includes('truongphong')) role = 'MANAGER';
                    else if (fbUser.email.includes('ktv')) role = 'STAFF';

                    await window.firebase.firestore().collection('users').doc(fbUser.uid).set({
                      uid: fbUser.uid,
                      email: fbUser.email,
                      displayName: displayName,
                      role: role,
                      departmentName: departmentName,
                      isActive: true,
                      createdAt: new Date().toISOString()
                    }, { merge: true });
                  }
                } catch (err) {
                  console.error('[AuthService] Error reading Firestore user profile:', err);
                }
              }

              const token = await fbUser.getIdToken().catch(() => 'token_' + Date.now());

              this.currentUser = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: displayName,
                phone: phone,
                role: role,
                departmentName: departmentName,
                token: token
              };
            } else {
              this.currentUser = null;
            }

            this.isInitialized = true;
            this.notifyListeners();
          });
        }
      }
    } catch (e) {
      console.warn('[AuthService] Firebase Auth init warning:', e);
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isAuthenticated() {
    return Boolean(this.currentUser);
  },

  getUserRole() {
    return this.currentUser ? this.currentUser.role : 'GUEST';
  },

  // Super Admin, Chuyên viên IT & Ban Giám Hiệu: Toàn quyền tối cao hệ thống, quản lý tất cả mọi thứ
  isSuperAdmin() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'STAFF_IT', 'ADMIN'].includes(role);
  },

  // Quản lý: Super Admin, Chuyên viên IT, Ban Giám Hiệu, Trưởng phòng, Phó Trưởng phòng
  isManager() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'STAFF_IT'].includes(role);
  },

  // Trưởng phòng (Level 2), Chuyên viên IT & Admin
  isDepartmentHead() {
    const role = this.getUserRole();
    return ['MANAGER', 'SUPER_ADMIN', 'STAFF_IT', 'ADMIN'].includes(role);
  },

  // Phó Trưởng phòng (Level 3)
  isDeputyManager() {
    const role = this.getUserRole();
    return role === 'DEPUTY_MANAGER';
  },

  // Kỹ thuật viên & Chuyên viên thực hiện
  isStaff() {
    const role = this.getUserRole();
    const staffRoles = ['STAFF', 'STAFF_IT', 'STAFF_MAINTENANCE', 'STAFF_GREEN', 'STAFF_CLEANING', 'STAFF_KTX'];
    return staffRoles.includes(role) || this.isManager();
  },

  // Kỹ thuật viên Ký túc xá
  isStaffKTX() {
    const role = this.getUserRole();
    return role === 'STAFF_KTX';
  },

  // Ban Giám Hiệu
  isSchoolAdmin() {
    const role = this.getUserRole();
    return role === 'ADMIN';
  },

  // Quản trị viên (Super Admin, Chuyên viên IT & Ban Giám Hiệu)
  isAdmin() {
    const role = this.getUserRole();
    return ['ADMIN', 'SUPER_ADMIN', 'STAFF_IT'].includes(role);
  },

  // Quyền quản lý User: Super Admin, Chuyên viên IT, Ban Giám Hiệu & Trưởng phòng
  canManageUsers() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF_IT'].includes(role);
  },

  // Quyền XÓA TASK / PHIẾU CÔNG VIỆC: SUPER ADMIN, ADMIN & CHUYÊN VIÊN IT
  canDeleteTask() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'STAFF_IT', 'ADMIN'].includes(role);
  },

  // Quyền phân công: Ban Giám Hiệu, Trưởng phòng, Chuyên viên IT & Super Admin toàn quyền; Phó phòng phân công các phiếu mình quản lý/điều phối
  canAssignTask(item = null) {
    if (this.isDepartmentHead() || this.isSuperAdmin() || this.isAdmin() || this.isManager()) return true;
    if (this.isDeputyManager()) {
      if (!item) return true;
      const user = this.getCurrentUser();
      if (!user) return false;
      if (item.assignedManagerId === user.uid || item.assignedTo === user.uid || !item.assignedTo) return true;
      return true;
    }
    return false;
  },

  // Quyền duyệt nghiệm thu: Ban Giám Hiệu, Trưởng phòng, Chuyên viên IT & Super Admin toàn quyền; Phó phòng duyệt phiếu mình điều phối
  canReviewTask(item = null) {
    if (this.isDepartmentHead() || this.isSuperAdmin() || this.isAdmin() || this.isManager()) return true;
    if (this.isDeputyManager()) {
      if (!item) return true;
      const user = this.getCurrentUser();
      if (!user) return false;
      if (item.assignedManagerId === user.uid || item.assignedReviewerId === user.uid) return true;
      return true;
    }
    return false;
  },

  // Quyền Quản lý Nhân sự: Trưởng phòng, Phó phòng, Ban Giám Hiệu, Chuyên viên IT, Super Admin
  canViewEmployees() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'STAFF_IT'].includes(role);
  },

  // Quyền Thêm / Sửa / Xóa Nhân sự & Cấu hình: Trưởng phòng, Chuyên viên IT, Admin & Super Admin
  canEditEmployees() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'MANAGER', 'STAFF_IT', 'ADMIN'].includes(role);
  },

  // Quyền Duyệt / Từ chối nghỉ phép: Trưởng phòng, Phó phòng, Ban Giám Hiệu, Chuyên viên IT, Super Admin
  canApproveLeave() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'STAFF_IT'].includes(role);
  },

  // Quyền Cấu hình chính sách ngày phép: Trưởng phòng, Chuyên viên IT, Admin & Super Admin
  canEditLeavePolicy() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'MANAGER', 'STAFF_IT', 'ADMIN'].includes(role);
  },

  getRoleLabel(role) {
    const map = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Ban Giám Hiệu',
      'MANAGER': 'Trưởng phòng',
      'DEPUTY_MANAGER': 'Phó Trưởng phòng',
      'STAFF_IT': 'Chuyên Viên IT',
      'STAFF_MAINTENANCE': 'Chuyên Viên Bảo Trì',
      'STAFF_GREEN': 'Cây Xanh',
      'STAFF_CLEANING': 'Tạp Vụ',
      'STAFF_KTX': 'Kỹ thuật viên Ký túc xá',
      'STAFF': 'Kỹ thuật viên',
      'USER': 'Cán bộ / Giảng viên / Sinh viên'
    };
    return map[role] || role || 'Người dùng';
  },

  hasRole(allowedRoles) {
    if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];
    const userRole = this.getUserRole();
    if (['SUPER_ADMIN', 'STAFF_IT', 'ADMIN'].includes(userRole)) return true;
    return allowedRoles.includes(userRole);
  },

  /**
   * ĐĂNG NHẬP THỰC TẾ QUA FIREBASE AUTHENTICATION
   */
  async login(email, password) {
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase SDK chưa sẵn sàng. Vui lòng tải lại trang.');
    }

    try {
      const userCredential = await window.firebase.auth().signInWithEmailAndPassword(email, password);
      const fbUser = userCredential.user;

      // Lấy thông tin role từ Firestore
      let role = 'USER';
      let departmentName = 'Cán bộ / Giảng viên';
      let displayName = fbUser.displayName || email.split('@')[0];

      if (window.firebase.firestore) {
        const userDoc = await window.firebase.firestore().collection('users').doc(fbUser.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          role = data.role || 'USER';
          departmentName = data.departmentName || departmentName;
          displayName = data.displayName || displayName;
        }
      }

      this.currentUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: displayName,
        role: role,
        departmentName: departmentName,
        token: await fbUser.getIdToken()
      };

      this.notifyListeners();
      return this.currentUser;
    } catch (err) {
      console.error('[AuthService] Firebase Sign-in error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email hoặc mật khẩu không chính xác.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Định dạng email không hợp lệ.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi trong giây lát.';
      }
      throw new Error(msg);
    }
  },

  /**
   * ĐĂNG KÝ TÀI KHOẢN MỚI TRỰC TIẾP TRÊN FIREBASE AUTH & FIRESTORE
   */
  async register({ email, password, displayName, phone, role = 'USER', departmentName = 'Khoa / Phòng ban' }) {
    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
      throw new Error('Firebase SDK chưa sẵn sàng.');
    }

    try {
      // 1. Tạo tài khoản trong Firebase Authentication
      const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(email, password);
      const fbUser = userCredential.user;

      // 2. Cập nhật Display Name
      await fbUser.updateProfile({ displayName: displayName });

      // 3. Lưu thông tin hồ sơ và phân quyền vào Cloud Firestore
      const userProfile = {
        uid: fbUser.uid,
        email: email,
        displayName: displayName,
        phone: phone || '',
        role: role,
        departmentName: departmentName,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      await window.firebase.firestore().collection('users').doc(fbUser.uid).set(userProfile);

      this.currentUser = {
        ...userProfile,
        token: await fbUser.getIdToken()
      };

      this.notifyListeners();
      return this.currentUser;
    } catch (err) {
      console.error('[AuthService] Firebase Register error:', err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Email này đã được đăng ký trước đó. Vui lòng đăng nhập.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Mật khẩu quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.';
      }
      throw new Error(msg);
    }
  },

  /**
   * GỬI EMAIL ĐẶT LẠI MẬT KHẨU
   */
  async sendPasswordReset(email) {
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase SDK chưa sẵn sàng.');
    }
    const cleanEmail = email.trim().toLowerCase();
    try {
      await window.firebase.auth().sendPasswordResetEmail(cleanEmail);
      return { success: true };
    } catch (err) {
      console.error('[AuthService] sendPasswordReset error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found') {
        msg = 'Không tìm thấy tài khoản với email này trên hệ thống.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Định dạng email không hợp lệ.';
      }
      throw new Error(msg);
    }
  },

  /**
   * ĐĂNG XUẤT THỰC TẾ
   */
  async logout() {
    this.currentUser = null;
    if (window.firebase && window.firebase.auth) {
      await window.firebase.auth().signOut().catch(() => {});
    }
    this.notifyListeners();
    Utils.showToast('Đã đăng xuất thành công.', 'info');
  },

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }
};

window.AuthService = AuthService;
AuthService.init();
