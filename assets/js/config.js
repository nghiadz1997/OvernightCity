/**
 * NSG SUPPORT - CẤU HÌNH HỆ THỐNG PHÍA CLIENT
 */

const APP_CONFIG = {
  appName: 'NSG SUPPORT',
  logoUrl: '/assets/icons/Logo.png',
  appTitle: 'PHẢN ÁNH & HỖ TRỢ KỸ THUẬT',
  appDescription: 'Cổng tiếp nhận phản ánh, hỗ trợ kỹ thuật và quản lý công việc nội bộ',
  hotline: '0909.277.944',
  hotlineTel: '0909277944',
  apiBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api',

  // Cấu hình Firebase Web Client của dự án qttbcsvcsc
  firebaseConfig: {
    apiKey: "AIzaSyA-Ikh0okAVnGJ9IClc1qI5sR3tYFKRnqY",
    authDomain: "qttbcsvcsc.firebaseapp.com",
    databaseURL: "https://qttbcsvcsc-default-rtdb.firebaseio.com",
    projectId: "qttbcsvcsc",
    storageBucket: "qttbcsvcsc.firebasestorage.app",
    messagingSenderId: "472709830163",
    appId: "1:472709830163:web:9a8721a114802502ce91e6",
    measurementId: "G-ZQ1CFNTY16"
  },

  // Danh mục phản ánh chuẩn theo yêu cầu mục 6 & 33
  CATEGORIES: [
    { id: 'FACILITIES', name: 'Cơ sở vật chất', icon: 'fa-building', slaHours: 48 },
    { id: 'COMPUTER', name: 'Máy tính', icon: 'fa-desktop', slaHours: 8 },
    { id: 'PRINTER', name: 'Máy in', icon: 'fa-print', slaHours: 12 },
    { id: 'PROJECTOR', name: 'Máy chiếu', icon: 'fa-video', slaHours: 4 },
    { id: 'NETWORK', name: 'Mạng/Internet', icon: 'fa-wifi', slaHours: 4 },
    { id: 'CAMERA', name: 'Camera an ninh', icon: 'fa-camera', slaHours: 12 },
    { id: 'AUDIO', name: 'Âm thanh', icon: 'fa-volume-high', slaHours: 4 },
    { id: 'ELECTRICITY', name: 'Điện', icon: 'fa-bolt', slaHours: 2 },
    { id: 'WATER', name: 'Nước', icon: 'fa-faucet-drip', slaHours: 4 },
    { id: 'SOFTWARE', name: 'Phần mềm', icon: 'fa-code', slaHours: 24 },
    { id: 'TEACHING_EQUIPMENT', name: 'Thiết bị dạy học', icon: 'fa-chalkboard-user', slaHours: 4 },
    { id: 'OFFICE_EQUIPMENT', name: 'Thiết bị văn phòng', icon: 'fa-fax', slaHours: 12 },
    { id: 'OTHER', name: 'Khác', icon: 'fa-circle-question', slaHours: 48 }
  ],

  // Mức độ ưu tiên
  PRIORITIES: [
    { id: 'KHẨN CẤP', name: 'Khẩn cấp', color: 'red', slaHours: 2, desc: 'Ảnh hưởng trực tiếp đến giờ giảng / an toàn' },
    { id: 'CAO', name: 'Cao', color: 'orange', slaHours: 8, desc: 'Cần xử lý trong ngày làm việc' },
    { id: 'TRUNG BÌNH', name: 'Trung bình', color: 'yellow', slaHours: 24, desc: 'Xử lý trong vòng 24 - 48 giờ' },
    { id: 'BÌNH THƯỜNG', name: 'Bình thường', color: 'blue', slaHours: 48, desc: 'Xử lý theo lịch bảo trì định kỳ' }
  ],

  // Danh sách phòng ban mẫu mặc định
  DEPARTMENTS: [
    'Ban Giám Hiệu',
    'Phòng Quản trị Thiết bị và Cơ sở vật chất',
    'Phòng Đào tạo',
    'Phòng Công tác Sinh viên',
    'Phòng Hành chính - Quản trị',
    'Phòng Kế toán - Tài chính',
    'Khoa Công nghệ Thông tin',
    'Khoa Điện - Điện tử',
    'Khoa Kinh tế',
    'Trung tâm Khảo thí & Đảm bảo CL',
    'Ban Quản lý Ký túc xá'
  ],

  // Cấu trúc phân cấp địa điểm 3 tầng: Cơ sở -> Khu vực / Tòa nhà -> Phòng / Vị trí cụ thể
  CAMPUSES: [
    {
      id: 'CS1',
      name: 'Cơ sở 1 (Trụ sở chính)',
      zones: [
        {
          id: 'KHU_A',
          name: 'Khu A (Giảng đường chính)',
          rooms: ['Phòng A101', 'Phòng A102', 'Phòng A103', 'Phòng A201', 'Phòng A202', 'Phòng A203', 'Phòng A301', 'Phòng A302', 'Hội trường A', 'Sảnh tầng trệt Khu A']
        },
        {
          id: 'KHU_B',
          name: 'Khu B (Khu thực hành & CNTT)',
          rooms: ['Phòng Lab B101', 'Phòng Lab B102', 'Phòng Máy B201', 'Phòng Máy B202', 'Phòng Mạng B301', 'Phòng Server B302', 'Xưởng thực hành B', 'Sảnh Khu B']
        },
        {
          id: 'KHU_C',
          name: 'Khu C (Khu Hiệu bộ & Văn phòng)',
          rooms: ['Phòng Ban Giám Hiệu', 'Phòng Đào tạo (C101)', 'Phòng Công tác SV (C102)', 'Phòng Hành chính - QT (C201)', 'Phòng Kế toán (C202)', 'Văn phòng Khoa CNTT (C301)', 'Văn phòng Khoa Điện (C302)', 'Phòng họp C']
        },
        {
          id: 'KHU_D',
          name: 'Khu D (Thư viện & Hội trường lớn)',
          rooms: ['Thư viện tầng 1', 'Phòng đọc thư viện tầng 2', 'Hội trường lớn D1', 'Phòng truyền thống D2', 'Căn tin trung tâm Khu D']
        }
      ]
    },
    {
      id: 'CS2',
      name: 'Cơ sở 2',
      zones: [
        {
          id: 'TOA_E',
          name: 'Khu E (Giảng đường Cơ sở 2)',
          rooms: ['Phòng E101', 'Phòng E102', 'Phòng E201', 'Phòng E202', 'Phòng E301', 'Văn phòng điều hành CS2']
        },
        {
          id: 'TOA_F',
          name: 'Khu F (Thực hành & Thí nghiệm)',
          rooms: ['Xưởng Cơ khí F1', 'Xưởng Ô tô F2', 'Phòng Thí nghiệm Điện F3', 'Kho vật tư thiết bị F']
        },
        {
          id: 'SAN_TT',
          name: 'Khu Thể thao & Đa năng CS2',
          rooms: ['Nhà thi đấu đa năng', 'Sân bóng đá', 'Sân bóng rổ', 'Khu quản lý thể chất']
        }
      ]
    },
    {
      id: 'CS3',
      name: 'Cơ sở 3 (Khu Ký Túc Xá)',
      zones: [
        {
          id: 'KTX_BLOCK_A',
          name: 'Ký Túc Xá - Block A (Nam)',
          rooms: ['Phòng Quản lý KTX Block A', 'Phòng 101-A', 'Phòng 102-A', 'Phòng 201-A', 'Phòng 202-A', 'Phòng 301-A', 'Phòng 302-A', 'Khu sinh hoạt chung Block A']
        },
        {
          id: 'KTX_BLOCK_B',
          name: 'Ký Túc Xá - Block B (Nữ)',
          rooms: ['Phòng Quản lý KTX Block B', 'Phòng 101-B', 'Phòng 102-B', 'Phòng 201-B', 'Phòng 202-B', 'Phòng 301-B', 'Phòng 302-B', 'Khu sinh hoạt chung Block B']
        },
        {
          id: 'KTX_TIEN_ICH',
          name: 'Khu Tiện ích & Căn tin KTX',
          rooms: ['Căn tin KTX', 'Phòng Y tế KTX', 'Phòng Tự học KTX', 'Nhà giữ xe KTX']
        }
      ]
    }
  ],

  // Danh mục phân quyền vai trò người dùng hệ thống (RBAC)
  ROLES: [
    { id: 'SUPER_ADMIN', name: 'Super Admin', level: 1, desc: 'Toàn quyền hệ thống & Duy nhất được xóa task' },
    { id: 'ADMIN', name: 'Ban Giám Hiệu', level: 2, desc: 'Giám sát điều hành toàn diện & Giao việc trực tiếp cho Trưởng phòng' },
    { id: 'MANAGER', name: 'Trưởng phòng', level: 2, desc: 'Giao việc cho Phó phòng / KTV, Nghiệm thu, Phân quyền' },
    { id: 'DEPUTY_MANAGER', name: 'Phó Trưởng phòng', level: 3, desc: 'Nhận chỉ đạo từ Trưởng phòng, Chỉ định KTV xử lý, Nghiệm thu' },
    { id: 'STAFF_IT', name: 'Chuyên Viên IT', level: 1, desc: 'Toàn quyền quản trị hệ thống, xử lý CNTT & Quản lý như Super Admin' },
    { id: 'STAFF_MAINTENANCE', name: 'Chuyên Viên Bảo Trì', level: 4, desc: 'Xử lý điện nước, cơ sở vật chất, máy chiếu, âm thanh' },
    { id: 'STAFF_GREEN', name: 'Cây Xanh', level: 4, desc: 'Chăm sóc cảnh quan, cây xanh, khuôn viên trường' },
    { id: 'STAFF_CLEANING', name: 'Tạp Vụ', level: 4, desc: 'Vệ sinh phòng học, văn phòng, sảnh tòa nhà' },
    { id: 'STAFF_KTX', name: 'Kỹ thuật viên Ký túc xá', level: 4, desc: 'Tiếp nhận & Xử lý sự cố tại Ký Túc Xá' },
    { id: 'STAFF', name: 'Kỹ thuật viên', level: 4, desc: 'Tiếp nhận & Xử lý sự cố hiện trường chung' },
    { id: 'USER', name: 'Cán bộ / Giảng viên / Sinh viên', level: 5, desc: 'Gửi phản ánh sự cố & Đánh giá chất lượng' }
  ]
};

// Đăng ký toàn cục
window.APP_CONFIG = APP_CONFIG;

// Khởi tạo Firebase SDK ngay khi nạp cấu hình
if (window.firebase && !window.firebase.apps.length) {
  try {
    window.firebase.initializeApp(APP_CONFIG.firebaseConfig);
    console.log('[Firebase] Initialized with Project:', APP_CONFIG.firebaseConfig.projectId);
  } catch (e) {
    console.error('[Firebase] Init error:', e);
  }
}
