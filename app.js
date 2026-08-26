const firebaseConfig = {
    apiKey: "AIzaSyA3BSxBewE-Wm_2VLO3h7jXbvutGzVk-8Y",
    authDomain: "csvc-c27b7.firebaseapp.com",
    databaseURL: "https://csvc-c27b7-default-rtdb.firebaseio.com",
    projectId: "csvc-c27b7",
    storageBucket: "csvc-c27b7.firebasestorage.app",
    messagingSenderId: "326455593166",
    appId: "1:326455593166:web:a67d44050cc16aacb1a89f",
    measurementId: "G-1XJ8B50WGC"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let allRooms = [];
let currentSelectedRoomKey = null;
let fixedRoom = null;
let fixedArea = null;
let currentFeedbacks = []; 

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
const areaParam = urlParams.get('area');

if (roomParam) {
    fixedRoom = roomParam;
    fixedArea = areaParam || 'Khu A';
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('roomSelectionContainer').style.display = 'none';
        const badge = document.getElementById('roomBadge');
        badge.style.display = 'block';
        badge.innerHTML = `📍 Phản ánh tại phòng: <b style="color:#fff; font-size:15px;">${roomParam} (${fixedArea})</b>`;
    });
}

db.ref('rooms').on('value', (snapshot) => {
    const data = snapshot.val();
    allRooms = [];
    const roomListContainer = document.getElementById('roomListContainer');
    if(roomListContainer) roomListContainer.innerHTML = '';

    let firstRoom = null;
    let roomKeyExists = false;
    let groupedRooms = { 'Khu A': [], 'Khu B': [], 'Khu C': [], 'Khu D': [], 'Khu KTX': [] };

    if (data) {
        Object.keys(data).forEach(key => {
            const item = data[key];
            if (item && item.room) {
                const roomObj = { key, ...item };
                allRooms.push(roomObj);
                if(groupedRooms[item.area]) {
                    groupedRooms[item.area].push(roomObj);
                } else {
                    if(!groupedRooms['Khác']) groupedRooms['Khác'] = [];
                    groupedRooms['Khác'].push(roomObj);
                }

                if(!firstRoom) firstRoom = roomObj;
                if(key === currentSelectedRoomKey) roomKeyExists = true;
            }
        });
    }

    Object.keys(groupedRooms).forEach(areaName => {
        const list = groupedRooms[areaName];
        if(list.length > 0 && roomListContainer) {
            let rowsHtml = list.map(r => `
                <tr>
                    <td><b>${r.room}</b></td>
                    <td>
                        <div class="action-btns">
                            <button onclick="makeQR('${r.room}', '${r.area}', '${r.key}')" style="background:#0284c7; border:none; color:#fff; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">QR</button>
                            <button onclick="delRoom('${r.key}')" style="background:#ef4444; border:none; color:#fff; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">Xóa</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            roomListContainer.innerHTML += `
                <div class="area-section">
                    <div class="area-title">🏢 ${areaName} (${list.length} phòng)</div>
                    <table class="room-table-mini">
                        ${rowsHtml}
                    </table>
                </div>
            `;
        }
    });

    if (currentSelectedRoomKey && !roomKeyExists) {
        currentSelectedRoomKey = null;
        document.getElementById('qrcode').innerHTML = '';
    } else if (!currentSelectedRoomKey && firstRoom && document.getElementById('adminPanel').style.display === 'block') {
        makeQR(firstRoom.room, firstRoom.area, firstRoom.key);
    }

    filterRooms();
});

function filterRooms() {
    if (fixedRoom) return; 
    const areaElem = document.getElementById('area');
    const select = document.getElementById('roomSelect');
    if (!areaElem || !select) return;
    
    const area = areaElem.value;
    select.innerHTML = '<option value="" disabled selected>-- Chọn phòng --</option>';
    allRooms.filter(r => r.area === area).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.room; opt.innerText = r.room;
        select.appendChild(opt);
    });
}

function showToast(msg, isErr = false) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.className = isErr ? 'error show' : 'show';
    setTimeout(() => t.className = '', 3500);
}

// Thuật toán nén ảnh
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height *= maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width *= maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = error => reject(error);
    });
}

// Hàm phụ trợ chuyển đổi File ảnh thành chuỗi Base64
function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // ==========================================
    // 1. TÍNH NĂNG CHỐNG SPAM (COOLDOWN TIMER)
    // ==========================================
    const lastSubmit = localStorage.getItem('lastSubmitTime');
    const cooldownTime = 600000; // 600.000 milliseconds = 10 phút

    if (lastSubmit && (Date.now() - parseInt(lastSubmit) < cooldownTime)) {
        const timeLeft = Math.ceil((cooldownTime - (Date.now() - parseInt(lastSubmit))) / 1000);
        showToast(`Spam! Vui lòng đợi ${timeLeft} giây nữa để gửi phản ánh tiếp theo.`, true);
        return; 
    }
    // ==========================================

    let selectedArea = fixedArea;
    let selectedRoom = fixedRoom;

    if (!selectedRoom) {
        selectedArea = document.getElementById('area').value;
        selectedRoom = document.getElementById('roomSelect').value;
    }

    if (!selectedArea || !selectedRoom) {
        showToast('Vui lòng chọn khu vực và phòng!', true);
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true; 
    btn.innerText = 'Đang xử lý...';

    const issueType = document.getElementById('issueType').value;
    const priority = document.getElementById('priority').value;
    const content = document.getElementById('content').value;

    const payload = {
        area: selectedArea,
        room: selectedRoom,
        issueType: issueType,
        priority: priority,
        content: content,
        status: '🟡 Tiếp nhận',
        timestamp: Date.now()
    };

    try {
        await db.ref('feedbacks').push().set(payload);
        
        const messageCaption = `🚨 CÓ PHẢN ÁNH MỚI 🚨\n🏢 Khu vực: ${selectedArea}\n🚪 Phòng: ${selectedRoom}\n🔧 Sự cố: ${issueType}\n🔴 Mức độ: ${priority}\n📝 Nội dung: ${content}`;
        const imageFile = document.getElementById('imageInput').files[0];
        let base64String = null;

        if (imageFile) {
            btn.innerText = 'Đang nén ảnh...';
            const compressedFile = await compressImage(imageFile, 800, 800, 0.7);
            base64String = await blobToBase64(compressedFile);
        }

        btn.innerText = 'Đang gửi thông báo...';
        
        const gasUrl = "https://script.google.com/macros/s/AKfycbzJ4Jrn0UL9oqjR9JpmqPx80BRH79ckM7yaVm9_-IHPL7mPOkqk48G0WdZvsImXmcz2/exec"; 

        await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                caption: messageCaption,
                imageBase64: base64String
            })
        });

        localStorage.setItem('lastSubmitTime', Date.now().toString());

        showToast('Gửi phản ánh thành công!');
        document.getElementById('content').value = '';
        document.getElementById('imageInput').value = ''; 
        
        if (!fixedRoom) {
            document.getElementById('feedbackForm').reset();
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi gửi phản ánh, vui lòng thử lại!', true);
    } finally {
        btn.disabled = false; 
        btn.innerText = 'Gửi phản ánh';
    }
});

function openAdminLogin() {
    if (auth.currentUser) {
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminData();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('adminEmailInput').value = '';
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminEmailInput').focus();
    }
}

function closeAdminLogin() {
    document.getElementById('loginModal').style.display = 'none';
}

function submitAdminLogin() {
    const email = document.getElementById('adminEmailInput').value;
    const pass = document.getElementById('adminPasswordInput').value;
    const btnLogin = document.getElementById('btnLogin');
    
    if (!email || !pass) {
        alert('Vui lòng nhập đầy đủ Email và Mật khẩu!');
        return;
    }

    btnLogin.innerText = "Đang xử lý...";
    btnLogin.disabled = true;

    auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            closeAdminLogin();
            document.getElementById('adminPanel').style.display = 'block';
            loadAdminData();
            btnLogin.innerText = "Đăng nhập";
            btnLogin.disabled = false;
            
            if (allRooms.length > 0) {
                makeQR(allRooms[0].room, allRooms[0].area, allRooms[0].key);
            }
        })
        .catch((error) => {
            alert('Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu quản trị!');
            btnLogin.innerText = "Đăng nhập";
            btnLogin.disabled = false;
        });
}

document.getElementById('adminPasswordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAdminLogin();
});

function closeAdmin() { 
    auth.signOut().then(() => {
        document.getElementById('adminPanel').style.display = 'none';
        showToast("Đã đăng xuất thành công!");
    });
}

auth.onAuthStateChanged((user) => {
    if (user && document.getElementById('adminPanel').style.display === 'block') {
        loadAdminData();
    }
});

async function addRoom() {
    const roomInput = document.getElementById('newRoom');
    const areaSelect = document.getElementById('newArea');
    const room = roomInput.value.trim();
    const area = areaSelect.value;
    
    if (!room) {
        alert('Vui lòng nhập tên phòng!');
        roomInput.focus();
        return;
    }

    try {
        const newRef = await db.ref('rooms').push({ room, area });
        roomInput.value = '';
        makeQR(room, area, newRef.key);
        showToast('Thêm phòng thành công!');
    } catch (error) {
        showToast('Lỗi khi thêm phòng!', true);
    }
}

async function delRoom(k) { 
    if(confirm('Xóa phòng này?')) {
        await db.ref('rooms/'+k).remove();
    } 
}

function makeQR(room, area, key) {
    currentSelectedRoomKey = key;
    const box = document.getElementById('qrcode');
    box.innerHTML = '';
    const targetUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}&area=${encodeURIComponent(area)}`;
    new QRCode(box, { text: targetUrl, width: 140, height: 140 });
}

let areaChart = null, typeChart = null;
const statuses = ["🟡 Tiếp nhận", "🔵 Đã phân công", "🟠 Đang xử lý", "🟢 Hoàn thành", "⚪ Đóng phản ánh"];

function loadAdminData() {
    db.ref('feedbacks').on('value', (snap) => {
        const data = snap.val();
        const tbody = document.getElementById('feedbackTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        currentFeedbacks = []; 
        
        let total = 0, p1 = 0, p2 = 0, p3 = 0;
        let aStats = { 'Khu A': 0, 'Khu B': 0, 'Khu C': 0, 'Khu D': 0, 'Khu KTX': 0 };
        let tStats = { 'Điện': 0, 'Nước': 0, 'Máy lạnh': 0, 'Máy chiếu': 0, 'Máy tính': 0, 'Bàn ghế': 0, 'Mạng Internet': 0, 'Khác': 0 };

        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const item = data[key];
                currentFeedbacks.push(item); 
                total++;
                
                const st = item.status || "🟡 Tiếp nhận";
                if(st.includes("Tiếp nhận")) p1++;
                else if(st.includes("phân công") || st.includes("Đang xử lý")) p2++;
                else if(st.includes("Hoàn thành") || st.includes("Đóng")) p3++; 

                if(aStats[item.area] !== undefined) aStats[item.area]++;
                if(tStats[item.issueType] !== undefined) tStats[item.issueType]++;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(item.timestamp).toLocaleTimeString('vi-VN')} <br> <small style="color:#94a3b8;">${new Date(item.timestamp).toLocaleDateString('vi-VN')}</small></td>
                    <td><b style="color:#38bdf8;">${item.room}</b><br><small>${item.area}</small></td>
                    <td>${item.issueType}</td>
                    <td>${item.priority}</td>
                    <td style="max-width: 250px; word-wrap: break-word;">${item.content}</td>
                    <td>
                        <select class="status-select" onchange="updateSt('${key}', this.value)">
                            ${statuses.map(s => `<option value="${s}" ${st===s?'selected':''}>${s}</option>`).join('')}
                        </select>
                    </td>
                    <td><button onclick="delFb('${key}')" style="background:#ef4444; border:none; color:#fff; padding:6px 10px; border-radius:6px; cursor:pointer; font-weight:bold;">X</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        document.getElementById('c-pending').innerText = p1;
        document.getElementById('c-processing').innerText = p2;
        document.getElementById('c-completed').innerText = p3;
        document.getElementById('c-total').innerText = total;

        renderCharts(aStats, tStats);
    });
}

async function updateSt(key, newSt) {
    await db.ref('feedbacks/' + key).update({ status: newSt });
}

async function delFb(k) { if(confirm('Bạn có chắc chắn muốn xóa phản ánh này?')) await db.ref('feedbacks/'+k).remove(); }

function exportToExcel() {
    if (currentFeedbacks.length === 0) {
        alert('Không có dữ liệu phản ánh để xuất báo cáo!');
        return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "Thời gian,Khu vực,Phòng,Sự cố,Mức độ ưu tiên,Nội dung phản ánh,Trạng thái\n";

    currentFeedbacks.forEach(item => {
        const dateObj = new Date(item.timestamp);
        const timeString = `${dateObj.toLocaleTimeString('vi-VN')} ${dateObj.toLocaleDateString('vi-VN')}`.replace(/,/g, '');
        
        const area = `"${item.area || ''}"`;
        const room = `"${item.room || ''}"`;
        const issueType = `"${item.issueType || ''}"`;
        const priority = `"${item.priority || ''}"`;
        const content = `"${(item.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const status = `"${item.status || '🟡 Tiếp nhận'}"`;

        csvContent += `${timeString},${area},${room},${issueType},${priority},${content},${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `ThongKePhanAnh_CSVC_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderCharts(aStats, tStats) {
    const ctxA = document.getElementById('areaChart').getContext('2d');
    if(areaChart) areaChart.destroy();
    areaChart = new Chart(ctxA, { type: 'bar', data: { labels: Object.keys(aStats), datasets: [{ data: Object.values(aStats), backgroundColor: '#38bdf8' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

    const ctxT = document.getElementById('typeChart').getContext('2d');
    if(typeChart) typeChart.destroy();
    typeChart = new Chart(ctxT, { type: 'doughnut', data: { labels: Object.keys(tStats), datasets: [{ data: Object.values(tStats), backgroundColor: ['#38bdf8','#818cf8','#c084fc','#f472b6','#fb7185','#fbbf24','#34d399','#94a3b8'] }] }, options: { responsive: true, maintainAspectRatio: false } });
}