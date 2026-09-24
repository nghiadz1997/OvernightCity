const axios = require('axios');

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
    this.baseUrl = this.token ? `https://api.telegram.org/bot${this.token}` : null;
  }

  isEnabled() {
    return Boolean(this.token && this.managerChatId);
  }

  /**
   * Gửi tin nhắn raw qua Telegram Bot API
   */
  async sendTelegramMessage(text, chatId = null, parseMode = 'HTML') {
    const targetChatId = chatId || this.managerChatId;
    if (!this.isEnabled() || !targetChatId) {
      console.log('[TelegramService] Telegram not configured or disabled. Skipped sending message.');
      return { success: false, reason: 'NOT_CONFIGURED' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: targetChatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[TelegramService] Error sending telegram message:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Thông báo khi có phản ánh mới từ người dùng
   */
  async notifyNewReport(report) {
    const priorityIcon = {
      'KHẨN CẤP': '🔴',
      'CAO': '🟠',
      'TRUNG BÌNH': '🟡',
      'BÌNH THƯỜNG': '🟢'
    }[report.priority] || '🔵';

    const createdAt = report.createdAtFormatted || new Date().toLocaleString('vi-VN');
    const escape = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const description = (report.description || 'Chưa có nội dung mô tả chi tiết').trim();
    const rawTech = (report.techRequirement || report.technicalRequirement || '').trim();
    const techReq = rawTech || 'Tiếp nhận, kiểm tra hiện trường và xử lý theo quy trình kỹ thuật tiêu chuẩn.';

    const message = `
📢 <b>[NSG SUPPORT] CÓ PHẢN ÁNH SỰ CỐ MỚI!</b>
━━━━━━━━━━━━━━━━━━━━━━━━
📋 <b>Mã phiếu:</b> <code>${report.code || 'PYC-XXXXXX'}</code>
⚠️ <b>Mức độ:</b> <b>${priorityIcon} ${report.priority || 'BÌNH THƯỜNG'}</b>
📌 <b>Loại sự cố:</b> ${escape(report.categoryName || 'Kỹ thuật')}
📍 <b>Địa điểm:</b> ${escape(report.location || 'Chưa xác định')} ${report.room ? `- ${escape(report.room)}` : ''}
🏷️ <b>Tiêu đề:</b> ${escape(report.title || 'Không có tiêu đề')}
👤 <b>Người gửi:</b> <b>${escape(report.senderName || 'Ẩn danh')}</b>
📞 <b>SĐT liên hệ:</b> <code>${escape(report.senderPhone || 'Không có')}</code>
🏢 <b>Khoa/Phòng:</b> ${escape(report.senderDept || 'Khác')}
⏰ <b>Thời gian:</b> ${createdAt}
━━━━━━━━━━━━━━━━━━━━━━━━
📝 <b>Nội dung chi tiết:</b>
<i>${escape(description.substring(0, 800))}</i>

🛠️ <b>Yêu cầu kỹ thuật:</b>
<i>${escape(techReq.substring(0, 600))}</i>
━━━━━━━━━━━━━━━━━━━━━━━━
👉 <i>Vui lòng truy cập hệ thống NSG SUPPORT để tiếp nhận & phân công xử lý.</i>
    `.trim();

    return this.sendTelegramMessage(message);
  }

  /**
   * Thông báo khi Trưởng phòng phân công công việc cho Kỹ thuật viên
   */
  async notifyTaskAssigned(task, staffChatId = null) {
    const deadline = task.deadlineFormatted || (task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : 'Không có');
    const escape = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const description = (task.description || 'Chi tiết theo phân công công việc').trim();
    const rawTech = (task.techRequirement || task.technicalRequirement || task.assignmentNote || '').trim();
    const techReq = rawTech || 'Tiến hành kiểm tra hiện trường và xử lý theo quy định kỹ thuật.';
    
    const message = `
📋 <b>[NSG SUPPORT] CÔNG VIỆC MỚI ĐƯỢC PHÂN CÔNG!</b>
━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ <b>Mã:</b> <code>${task.code || 'TASK-XXXXXX'}</code>
📌 <b>Nhiệm vụ:</b> <b>${escape(task.title || 'Nhiệm vụ')}</b>
📍 <b>Địa điểm:</b> ${escape(task.location || 'Trường')} ${task.room ? `- ${escape(task.room)}` : ''}
⚠️ <b>Mức độ:</b> ${task.priority || 'BÌNH THƯỜNG'}
⏰ <b>Hạn chót:</b> <b>${deadline}</b>
👤 <b>Người giao:</b> ${escape(task.assignedByName || 'Trưởng phòng Kỹ thuật')}
👨‍🔧 <b>Người phụ trách:</b> <b>${escape(task.assignedToName || 'Kỹ thuật viên')}</b>
${task.assignmentNote ? `💬 <b>Chỉ đạo:</b> <i>"${escape(task.assignmentNote)}"</i>\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━
📝 <b>Nội dung chi tiết:</b>
<i>${escape(description.substring(0, 800))}</i>

🛠️ <b>Yêu cầu kỹ thuật:</b>
<i>${escape(techReq.substring(0, 600))}</i>
━━━━━━━━━━━━━━━━━━━━━━━━
👉 <i>Vui lòng truy cập trang Kỹ thuật viên để nhận việc và cập nhật tiến độ.</i>
    `.trim();

    // Gửi cho nhóm quản lý và gửi riêng cho kỹ thuật viên nếu có Chat ID cá nhân
    await this.sendTelegramMessage(message);
    if (staffChatId && staffChatId !== this.managerChatId) {
      await this.sendTelegramMessage(message, staffChatId);
    }
    return { success: true };
  }

  /**
   * Thông báo khi công việc bị quá hạn (Overdue)
   */
  async notifyTaskOverdue(task) {
    const deadline = task.deadlineFormatted || (task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : 'N/A');

    const message = `
🚨 <b>CẢNH BÁO: CÔNG VIỆC QUÁ HẠN!</b>

<b>Mã:</b> <code>${task.code}</code>
<b>Tiêu đề:</b> ${task.title}
<b>Người phụ trách:</b> ${task.assignedToName || 'Chưa nhận'}
⏰ <b>Hạn chót:</b> ${deadline}
⚠️ <b>Trạng thái:</b> <b>${task.status} (QUÁ HẠN)</b>

👉 <i>Đề nghị kiểm tra tiến độ ngay lập tức!</i>
    `.trim();

    return this.sendTelegramMessage(message);
  }

  /**
   * Thông báo khi Kỹ thuật viên hoàn thành và gửi yêu cầu nghiệm thu
   */
  async notifyTaskCompleted(task, staffName) {
    const message = `
✅ <b>YÊU CẦU NGHIỆM THU CÔNG VIỆC</b>

<b>Mã:</b> <code>${task.code}</code>
<b>Tiêu đề:</b> ${task.title}
👨‍🔧 <b>Kỹ thuật viên:</b> ${staffName || task.assignedToName || 'Nhân viên'}
⏰ <b>Thời gian hoàn thành:</b> ${new Date().toLocaleString('vi-VN')}
📝 <b>Ghi chú xử lý:</b> <i>${task.completionNote || 'Đã kiểm tra và xử lý xong.'}</i>

👉 <i>Kính mời Trưởng phòng truy cập hệ thống để duyệt nghiệm thu hoặc yêu cầu làm lại.</i>
    `.trim();

    return this.sendTelegramMessage(message);
  }

  /**
   * Thông báo khi Trưởng phòng yêu cầu xử lý lại (Reject nghiệm thu)
   */
  async notifyTaskReopened(task, managerName, reason) {
    const message = `
🔄 <b>YÊU CẦU XỬ LÝ LẠI CÔNG VIỆC</b>

<b>Mã:</b> <code>${task.code}</code>
<b>Tiêu đề:</b> ${task.title}
👤 <b>Người duyệt:</b> ${managerName || 'Trưởng phòng'}
❌ <b>Lý do chưa đạt:</b>
<b><i>${reason || 'Cần kiểm tra kỹ lại theo yêu cầu.'}</i></b>

👉 <i>Kỹ thuật viên phụ trách vui lòng tiếp tục xử lý và cập nhật kết quả.</i>
    `.trim();

    return this.sendTelegramMessage(message);
  }
}

module.exports = new TelegramService();
