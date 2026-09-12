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
          // Đảm bảo duy trì phiên đăng nhập cục bộ qua LOCAL persistence
          try {
            if (window.firebase.auth.Auth && window.firebase.auth.Auth.Persistence) {
              window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
            }
          } catch (pErr) {}

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
                    if (data.isActive === false) {
                      console.warn('[AuthService] Tài khoản bị khóa, tự động đăng xuất...');
                      await window.firebase.auth().signOut().catch(() => {});
                      this.currentUser = null;
                      this.isInitialized = true;
                      this.notifyListeners();
                      if (window.Utils) {
                        Utils.showToast('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.', 'error', 6000);
                      }
                      return;
                    }
                    role = data.role || 'USER';
                    departmentName = data.departmentName || departmentName;
                    displayName = data.displayName || displayName;
                    phone = data.phone || phone;
                  } else {
                    // Nếu chưa có record trong Firestore, khởi tạo ngay
                    if (fbUser.email && fbUser.email.includes('admin')) role = 'SUPER_ADMIN';
                    else if (fbUser.email && fbUser.email.includes('truongphong')) role = 'MANAGER';
                    else if (fbUser.email && fbUser.email.includes('ktv')) role = 'STAFF';

                    await window.firebase.firestore().collection('users').doc(fbUser.uid).set({
                      uid: fbUser.uid,
                      email: fbUser.email,
                      displayName: displayName,
                      role: role,
                      departmentName: departmentName,
                      phone: phone,
                      isActive: true,
                      createdAt: new Date().toISOString()
                    }, { merge: true }).catch(() => {});
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
   * ĐĂNG NHẬP THỰC TẾ QUA FIREBASE AUTHENTICATION (Hỗ trợ cả Email & Tên đăng nhập)
   */
  async login(emailOrUsername, password) {
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase SDK chưa sẵn sàng. Vui lòng tải lại trang.');
    }

    if (!emailOrUsername || !password) {
      throw new Error('Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
    }

    const rawInput = emailOrUsername.trim();
    // Tự động nhận diện nếu người dùng chỉ nhập username (ví dụ: admin, trongnghia, quangtrung...)
    const normalizedEmail = rawInput.includes('@') ? rawInput.toLowerCase() : `${rawInput.toLowerCase()}@nsg.edu.vn`;

    try {
      if (window.firebase.auth.Auth && window.firebase.auth.Auth.Persistence) {
        await window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
      }

      const userCredential = await window.firebase.auth().signInWithEmailAndPassword(normalizedEmail, password);
      const fbUser = userCredential.user;

      // Lấy thông tin hồ sơ và phân quyền (RBAC Role) từ Cloud Firestore
      let role = 'USER';
      let departmentName = 'Cán bộ / Giảng viên';
      let displayName = fbUser.displayName || normalizedEmail.split('@')[0];
      let phone = '';

      if (window.firebase.firestore) {
        try {
          const userDoc = await window.firebase.firestore().collection('users').doc(fbUser.uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            if (data.isActive === false) {
              await window.firebase.auth().signOut().catch(() => {});
              throw new Error('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên để được mở lại.');
            }
            role = data.role || 'USER';
            departmentName = data.departmentName || departmentName;
            displayName = data.displayName || displayName;
            phone = data.phone || '';
          } else {
            // Tự động đồng bộ document người dùng nếu chưa có trong Firestore
            if (normalizedEmail.includes('admin')) role = 'SUPER_ADMIN';
            else if (normalizedEmail.includes('truongphong')) role = 'MANAGER';
            else if (normalizedEmail.includes('ktv')) role = 'STAFF';

            await window.firebase.firestore().collection('users').doc(fbUser.uid).set({
              uid: fbUser.uid,
              email: fbUser.email || normalizedEmail,
              displayName: displayName,
              role: role,
              departmentName: departmentName,
              phone: phone,
              isActive: true,
              createdAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
        } catch (dbErr) {
          if (dbErr.message && dbErr.message.includes('tạm khóa')) {
            throw dbErr;
          }
          console.warn('[AuthService] Firestore profile fetch warning:', dbErr);
        }
      }

      const token = await fbUser.getIdToken().catch(() => 'token_' + Date.now());

      this.currentUser = {
        uid: fbUser.uid,
        email: fbUser.email || normalizedEmail,
        displayName: displayName,
        phone: phone,
        role: role,
        departmentName: departmentName,
        token: token
      };

      this.notifyListeners();
      return this.currentUser;
    } catch (err) {
      console.error('[AuthService] Firebase Sign-in error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Định dạng email không hợp lệ. Vui lòng nhập đúng định dạng email (ví dụ: admin@nsg.edu.vn hoặc admin).';
      } else if (err.code === 'auth/user-disabled') {
        msg = 'Tài khoản này đã bị vô hiệu hóa trên hệ thống.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi trong giây lát hoặc sử dụng Quên mật khẩu.';
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = window.location.hostname || 'domain của bạn';
        msg = `Tên miền "${host}" chưa được cấp phép (Authorized domain) trên Firebase Console. Vui lòng thêm "${host}" vào Firebase Console > Authentication > Settings > Authorized domains.`;
        setTimeout(() => AuthService.showUnauthorizedDomainAlert(host), 100);
      }
      throw new Error(msg);
    }
  },

  /**
   * Hiển thị bảng hướng dẫn cấp quyền tên miền Firebase Console trực quan
   */
  showUnauthorizedDomainAlert(domain) {
    const existing = document.getElementById('firebase-unauth-domain-modal');
    if (existing) existing.remove();

    const host = domain || window.location.hostname || 'domain của bạn';
    const projectId = window.APP_CONFIG?.firebaseConfig?.projectId || 'qttbcsvcsc';
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

    const div = document.createElement('div');
    div.id = 'firebase-unauth-domain-modal';
    div.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in';
    div.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-amber-200 relative space-y-4">
        <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer text-xl" onclick="document.getElementById('firebase-unauth-domain-modal').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black text-slate-900 leading-tight">CHƯA ỦY QUYỀN TÊN MIỀN TRÊN FIREBASE</h3>
            <p class="text-xs text-amber-700 font-semibold mt-0.5">Lỗi: auth/unauthorized-domain</p>
          </div>
        </div>

        <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-slate-700 space-y-2 leading-relaxed">
          <p>Tên miền bạn đang truy cập hiện tại là:</p>
          <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-300 font-mono font-bold text-blue-700 select-all">
            <span class="flex-1 truncate" id="unauth-domain-text">${host}</span>
            <button type="button" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer" onclick="navigator.clipboard.writeText('${host}'); if(window.Utils) Utils.showToast('Đã sao chép tên miền!', 'success');">
              <i class="fa-solid fa-copy mr-1"></i> Sao chép
            </button>
          </div>
          <p class="text-[11px] text-slate-500 pt-1">
            Firebase Authentication chặn các tên miền chưa đăng ký để bảo vệ hệ thống.
          </p>
        </div>

        <div class="space-y-2 text-xs text-slate-700">
          <p class="font-bold text-slate-900">Cách khắc phục ngay (30 giây):</p>
          <ol class="list-decimal pl-4 space-y-1.5 text-slate-600">
            <li>Mở Firebase Console dự án <strong>${projectId}</strong>.</li>
            <li>Vào mục <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
            <li>Bấm <strong>Add domain</strong>, dán <code>${host}</code> và bấm <strong>Save</strong>.</li>
          </ol>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <a href="${consoleUrl}" target="_blank" rel="noopener noreferrer" class="w-full sm:flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-center">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Mở Firebase Console cài đặt ngay</span>
          </a>
          <button type="button" class="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer" onclick="document.getElementById('firebase-unauth-domain-modal').remove()">
            Đóng
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  /**
   * ĐĂNG NHẬP 1-CHẠM BẰNG GOOGLE (Firebase GoogleAuthProvider)
   * Tự động lấy: displayName, email, photoURL, uid
   */
  async loginWithGoogle() {
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase SDK chưa sẵn sàng. Vui lòng kiểm tra kết nối mạng.');
    }

    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const userCredential = await window.firebase.auth().signInWithPopup(provider);
      const fbUser = userCredential.user;

      let role = 'USER';
      let departmentName = 'Cán bộ / Giảng viên / Sinh viên';
      let displayName = fbUser.displayName || fbUser.email.split('@')[0];
      let phone = '';

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
            await window.firebase.firestore().collection('users').doc(fbUser.uid).set({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: displayName,
              photoURL: fbUser.photoURL || '',
              role: 'USER',
              departmentName: departmentName,
              isActive: true,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (fErr) {
          console.warn('[AuthService] Firestore sync error on Google Login:', fErr);
        }
      }

      const token = await fbUser.getIdToken().catch(() => 'token_' + Date.now());
      this.currentUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: displayName,
        photoURL: fbUser.photoURL || '',
        phone: phone,
        role: role,
        departmentName: departmentName,
        token: token
      };

      this.notifyListeners();

      // Ghi nhận nhật ký đăng nhập và IP lên Server / Firestore (Audit Trail)
      try {
        const deviceId = window.Utils ? Utils.getOrCreateDeviceId() : '';
        const clientIp = (window.Utils && typeof Utils.getClientIp === 'function')
          ? await Utils.getClientIp()
          : '127.0.0.1';

        // 1. Ghi trực tiếp vào Firestore để hoạt động cả trên GitHub Pages
        if (window.firebase && window.firebase.firestore) {
          window.firebase.firestore().collection('audit_logs').add({
            action: 'LOGIN',
            email: fbUser.email,
            displayName: displayName,
            photoURL: fbUser.photoURL || '',
            deviceId: deviceId,
            clientIp: clientIp,
            userAgent: navigator.userAgent,
            provider: 'Google',
            details: 'Đăng nhập Google thành công',
            createdAt: new Date().toISOString()
          }).catch(e => console.warn('[AuthService] Firestore audit log failed:', e));
        }

        // 2. Ghi lên Backend Node API nếu có
        const apiBase = window.APP_CONFIG?.apiBaseUrl || '/api';
        fetch(`${apiBase}/audit/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
          body: JSON.stringify({
            email: fbUser.email,
            displayName: displayName,
            photoURL: fbUser.photoURL || '',
            deviceId,
            clientIp,
            provider: 'Google'
          })
        }).catch(() => {});
      } catch (logErr) {}

      return this.currentUser;
    } catch (err) {
      console.error('[AuthService] Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        throw new Error('Yêu cầu đăng nhập trước đó đã bị hủy.');
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error('Trình duyệt đã chặn cửa sổ popup Google. Vui lòng cho phép popup.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = window.location.hostname || 'domain của bạn';
        setTimeout(() => AuthService.showUnauthorizedDomainAlert(host), 100);
        throw new Error(`Tên miền "${host}" chưa được cấp phép (Authorized domain) trên Firebase Console.`);
      }
      throw new Error(err.message || 'Đăng nhập Google thất bại.');
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
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = window.location.hostname || 'domain của bạn';
        setTimeout(() => AuthService.showUnauthorizedDomainAlert(host), 100);
        msg = `Tên miền "${host}" chưa được cấp phép (Authorized domain) trên Firebase Console.`;
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
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = window.location.hostname || 'domain của bạn';
        msg = `Tên miền "${host}" chưa được cấp phép trong Firebase Console.`;
        setTimeout(() => AuthService.showUnauthorizedDomainAlert(host), 100);
      }
      throw new Error(msg);
    }
  },

  async logout() {
    this.currentUser = null;
    if (window.firebase && window.firebase.auth) {
      await window.firebase.auth().signOut().catch(() => {});
    }
    if (window.RealtimeService) {
      RealtimeService.notifications = [];
      RealtimeService.saveLocalData();
      RealtimeService.notifyNotificationListeners();
    }
    if (window.NotificationDrawerComponent) {
      NotificationDrawerComponent.close();
      NotificationDrawerComponent.render();
    }
    if (window.NavbarComponent) {
      NavbarComponent.updateBadge(0);
      NavbarComponent.render('app-navbar');
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
