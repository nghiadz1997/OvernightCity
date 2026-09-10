const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });
        console.log('[EmailService] SMTP Transporter configured for user:', user);
      } catch (err) {
        console.error('[EmailService] Error initializing transporter:', err.message);
        this.transporter = null;
      }
    } else {
      console.log('[EmailService] SMTP credentials not provided in .env. Running in SIMULATION mode.');
    }
  }

  isEnabled() {
    return Boolean(this.transporter);
  }

  getFromAddress() {
    return process.env.SMTP_FROM || `"NSG SUPPORT" <${process.env.SMTP_USER || 'support@nsg.edu.vn'}>`;
  }

  getClientUrl() {
    return process.env.CLIENT_URL || 'http://localhost:5000';
  }

  /**
   * 1. Gửi email xác nhận khi người dùng vừa tạo phản ánh thành công
   */
  async sendReportConfirmation(report) {
    if (!report || !report.senderEmail) {
      return { success: false, message: 'Không có email người nhận.' };
    }

    const clientUrl = this.getClientUrl();
    const trackingUrl = `${clientUrl}/#/tracking?code=${encodeURIComponent(report.code)}`;
    const subject = `[NSG SUPPORT] Xác nhận tiếp nhận phản ánh #${report.code}`;

    const priorityBadge = report.priority === 'KHẨN CẤP'
      ? '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:bold;">🔴 KHẨN CẤP</span>'
      : report.priority === 'CAO'
      ? '<span style="background:#ffedd5;color:#ea580c;padding:3px 8px;border-radius:6px;font-weight:bold;">🟠 CAO</span>'
      : '<span style="background:#dbeafe;color:#2563eb;padding:3px 8px;border-radius:6px;font-weight:bold;">🔵 ' + (report.priority || 'BÌNH THƯỜNG') + '</span>';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 16px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">NSG SUPPORT - HỆ THỐNG PHẢN ÁNH</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Xác nhận tiếp nhận phản ánh sự cố & hỗ trợ kỹ thuật</p>
        </div>

        <div style="background: white; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
            Xin chào <strong>${report.senderName || 'Quý Thầy/Cô và Bạn'}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Hệ thống đã ghi nhận phản ánh của bạn và tự động chuyển đến bộ phận kỹ thuật để tiếp nhận & xử lý.
          </p>

          <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 140px;">Mã phản ánh:</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #1d4ed8;">${report.code}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Tiêu đề:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${report.title}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Địa điểm:</td>
                <td style="padding: 6px 0;">${report.location} ${report.room ? `- Phòng: <strong>${report.room}</strong>` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Danh mục:</td>
                <td style="padding: 6px 0;">${report.categoryName || 'Cơ sở vật chất'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Mức độ ưu tiên:</td>
                <td style="padding: 6px 0;">${priorityBadge}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Thời gian gửi:</td>
                <td style="padding: 6px 0;">${new Date().toLocaleString('vi-VN')}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
            Mỗi khi cán bộ kỹ thuật tiếp nhận, kiểm tra hoặc khắc phục xong, bạn sẽ nhận được email cập nhật trạng thái tự động.
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${trackingUrl}" style="background: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
              🔍 BẤM VÀO ĐÂY ĐỂ THEO DÕI TIẾN ĐỘ
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Đây là email tự động từ hệ thống NSG SUPPORT. Vui lòng không trả lời trực tiếp email này.
          </p>
        </div>
      </div>
    `;

    return this.sendMail(report.senderEmail, subject, html, `Đã ghi nhận phản ánh mã ${report.code}. Tra cứu tại: ${trackingUrl}`);
  }

  /**
   * 2. Gửi email cập nhật khi trạng thái xử lý thay đổi
   */
  async sendStatusUpdate(report, newStatus, note = '', staffName = '') {
    if (!report || !report.senderEmail) {
      return { success: false, message: 'Không có email người nhận.' };
    }

    const clientUrl = this.getClientUrl();
    const trackingUrl = `${clientUrl}/#/tracking?code=${encodeURIComponent(report.code)}`;
    const subject = `[NSG SUPPORT] Cập nhật tiến độ phản ánh #${report.code}: ${newStatus}`;

    let statusColor = '#2563eb';
    let statusText = newStatus;
    if (newStatus === 'HOÀN THÀNH') {
      statusColor = '#16a34a';
      statusText = '✅ ĐÃ HOÀN THÀNH';
    } else if (newStatus === 'ĐANG XỬ LÝ') {
      statusColor = '#ea580c';
      statusText = '⚙️ ĐANG KHẮC PHỤC / XỬ LÝ';
    } else if (newStatus === 'ĐÃ TIẾP NHẬN' || newStatus === 'ĐÃ PHÂN CÔNG') {
      statusColor = '#2563eb';
      statusText = '📋 ĐÃ TIẾP NHẬN / PHÂN CÔNG KỸ THUẬT';
    } else if (newStatus === 'CHỜ NGHIỆM THU') {
      statusColor = '#0891b2';
      statusText = '🔍 ĐANG KIỂM TRA / CHỜ NGHIỆM THU';
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 16px;">
        <div style="background: ${statusColor}; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 18px; font-weight: 800;">CẬP NHẬT TIẾN ĐỘ PHẢN ÁNH</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Mã phiếu: <strong>${report.code}</strong></p>
        </div>

        <div style="background: white; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
            Xin chào <strong>${report.senderName || 'Bạn'}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Phản ánh <em>"${report.title}"</em> của bạn vừa được cập nhật trạng thái mới:
          </p>

          <div style="background: #f8fafc; border: 2px solid ${statusColor}; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
            <div style="font-size: 18px; font-weight: 800; color: ${statusColor};">
              ${statusText}
            </div>
            ${note ? `<p style="font-size: 13px; color: #475569; margin: 10px 0 0; font-style: italic;">"Ghi chú: ${note}"</p>` : ''}
            ${staffName ? `<p style="font-size: 12px; color: #64748b; margin: 6px 0 0;">Cán bộ phụ trách: <strong>${staffName}</strong></p>` : ''}
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${trackingUrl}" style="background: ${statusColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              XEM CHI TIẾT TIẾN ĐỘ & HÌNH ẢNH XỬ LÝ
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            NSG SUPPORT - Cổng tiếp nhận và hỗ trợ kỹ thuật nội bộ
          </p>
        </div>
      </div>
    `;

    return this.sendMail(report.senderEmail, subject, html, `Phản ánh ${report.code} chuyển trạng thái: ${newStatus}. Chi tiết: ${trackingUrl}`);
  }

  async sendMail(to, subject, html, textFallback = '') {
    if (!this.transporter) {
      console.log('----------------------------------------------------');
      console.log('📧 [EmailService] SIMULATION MODE (No SMTP configured)');
      console.log(`📤 To: ${to}`);
      console.log(`📝 Subject: ${subject}`);
      console.log(`📄 Message: ${textFallback}`);
      console.log('----------------------------------------------------');
      return { success: true, simulated: true, to, subject };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject,
        html,
        text: textFallback
      });
      console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EmailService] Error sending email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
