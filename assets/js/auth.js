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

  // Super Admin: Toàn quyền tối cao, DUY NHẤT có quyền xóa task
  isSuperAdmin() {
    const role = this.getUserRole();
    return role === 'SUPER_ADMIN';
  },

  // Quản lý: Super Admin, Trưởng phòng, Phó Trưởng phòng
  isManager() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER'].includes(role);
  },

  // Trưởng phòng Kỹ thuật (Level 2)
  isDepartmentHead() {
    const role = this.getUserRole();
    return role === 'MANAGER' || role === 'SUPER_ADMIN';
  },

  // Phó Trưởng phòng (Level 3)
  isDeputyManager() {
    const role = this.getUserRole();
    return role === 'DEPUTY_MANAGER';
  },

  // Kỹ thuật viên (Staff Khoa & Staff KTX)
  isStaff() {
    const role = this.getUserRole();
    return ['STAFF', 'STAFF_KTX'].includes(role) || this.isManager();
  },

  // Kỹ thuật viên Ký túc xá
  isStaffKTX() {
    const role = this.getUserRole();
    return role === 'STAFF_KTX';
  },

  // Quản trị viên (Super Admin & Admin)
  isAdmin() {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  },

  // Quyền quản lý User: Super Admin & Trưởng phòng
  canManageUsers() {
    const role = this.getUserRole();
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
  },

  // Quyền XÓA TASK / PHIẾU CÔNG VIỆC: DUY NHẤT SUPER ADMIN
  canDeleteTask() {
    const role = this.getUserRole();
    return role === 'SUPER_ADMIN';
  },

  hasRole(allowedRoles) {
    if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];
    const userRole = this.getUserRole();
    if (userRole === 'SUPER_ADMIN') return true;
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
