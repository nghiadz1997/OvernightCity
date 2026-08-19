// File: /api/telegram.js (Dành cho Vercel Node.js Serverless Function)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { area, room, issueType, priority, content, status } = req.body;
    
    // Thay thế Bot Token và Chat ID của bạn vào đây (hoặc cấu hình qua biến môi trường Environment Variables)
    const BOT_TOKEN = '8657313024:AAH5ptu0wyzabFvhrefuJulkkS7IPuRF5Nc';
    const CHAT_ID = '6159104725';

    const message = `🔔 *PHẢN ÁNH CƠ SỞ VẬT CHẤT*\n\n` +
                    `🏢 *Khu/Phòng:* ${room} (${area})\n` +
                    `🔧 *Sự cố:* ${issueType || 'N/A'}\n` +
                    `🔴 *Mức độ:* ${priority || 'Bình thường'}\n` +
                    `📌 *Trạng thái:* ${status || '🟡 Tiếp nhận'}\n` +
                    `📝 *Nội dung:* ${content}`;

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (data.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(400).json({ success: false, error: data });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}