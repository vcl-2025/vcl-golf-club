// 简单的邮件代理服务器
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/send-email', async (req, res) => {
  try {
    const { apiKey, to, subject, html } = req.body;
    
    console.log('📧 代理服务器收到邮件发送请求');
    console.log('收件人:', to);
    console.log('主题:', subject);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Greenfield Golf Club <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 邮件发送成功:', result);
      res.json({ success: true, data: result });
    } else {
      console.log('❌ 邮件发送失败:', result);
      res.json({ success: false, error: result });
    }
  } catch (error) {
    console.error('❌ 代理服务器错误:', error);
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`📧 邮件代理服务器运行在 http://localhost:${PORT}`);
});
