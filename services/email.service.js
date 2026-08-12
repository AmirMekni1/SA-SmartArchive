const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendVerificationEmail = async (email, code, username = null) => {
  const subject = 'Verification Code - National Identification Platform';
  const verificationLink = `http://localhost:3001/api/auth/verify-email-buttom?email=${email}&code=${code}`;
  
  const htmlContent = `
    <!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
        <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        background: linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%);
        color: #1f2937;
      }
      .container {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
      }
      .header {
        background: linear-gradient(135deg, #17657c 100%, #00c3ff 100%);
        color: #ffffff;
        padding: 28px 24px;
        text-align: center;
      }
      .brand {
        font-size: 24px;
        margin: 8px 0 0;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .subtitle {
        margin: 8px 0 0;
        font-size: 14px;
        opacity: 0.9;
      }
      .content {
        padding: 32px 26px;
        text-align: center;
      }
      h3 {
        margin: 0;
        font-size: 24px;
        color: #0f172a;
      }
      .lead {
        margin: 14px 0 8px;
        font-size: 15px;
        line-height: 1.7;
        color: #475569;
      }
      .button {
        display: inline-block;
        margin: 18px 0;
        padding: 14px 30px;
        border-radius: 10px;
        text-decoration: none;
        background: #0f766e;
        color: #ffffff;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .code-label {
        margin: 14px 0 10px;
        color: #334155;
        font-size: 14px;
      }
      .code {
        font-size: 34px;
        font-weight: 800;
        color: #0f766e;
        letter-spacing: 8px;
        background: #f0fdfa;
        border: 1px dashed #99f6e4;
        padding: 14px 18px;
        border-radius: 10px;
        display: inline-block;
        margin: 6px 0 16px;
      }
      .help-text {
        margin: 0;
        font-size: 14px;
        color: #475569;
      }
      .alert {
        margin-top: 18px;
        font-size: 13px;
        color: #b91c1c;
      }
      .footer {
        border-top: 1px solid #e5e7eb;
        background: #f8fafc;
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        line-height: 1.7;
      }
      @media (max-width: 560px) {
        body { padding: 14px; }
        .content { padding: 24px 16px; }
        .code { font-size: 28px; letter-spacing: 5px; }
        h3 { font-size: 21px; }
      }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
        <img src="https://github.com/AmirMekni1/SA-SmartArchive/blob/Backend/Images/SmartArchiveLogo.png?raw=true" alt="Smart Archive Logo" style="width:56px; height:56px; border-radius:10px; object-fit:cover;  padding:6px;"/>
        <p class="brand">Smart Archive</p>
        <p class="subtitle">Secure account verification</p>
            </div>
            <div class="content">
                <h3>Hello ${username || 'User'}!</h3>
        <p class="lead">Thank you for signing up. Confirm your email address to activate your account and continue securely.</p>
        <a href="${verificationLink}" class="button">Verify Email Address</a>
        <p class="code-label">Or enter this verification code:</p>
                <div class="code">${code}</div>
        <p class="help-text">This code is valid for <strong>15 minutes</strong>.</p>
        <p class="alert">If you did not create this account, you can safely ignore this message.</p>
            </div>
            <div class="footer">
        <p>© 2026 National Identification Platform. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    Hello ${username || 'User'}!
    
    Thank you for registering with us. To verify your email address, copy and paste the following link into your browser:
    ${verificationLink}
    
    Or use your verification code: ${code}
    
    This code is valid for 15 minutes.
    
    If you did not create this account, please ignore this email.
    
    --
    National Identification Platform
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`✅ Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Email error: ${error.message}`);
    return false;
  }
};

const sendPasswordResetEmail = async (email, code, username = null) => {
  const subject = 'إعادة تعيين كلمة المرور - منصة التعريف الوطنية';
  const resetLink = `http://localhost:3000/reset-password?email=${encodeURIComponent(email)}&code=${code}`;

  const htmlContent = `
    <!DOCTYPE html>
  <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif;
        background: linear-gradient(180deg, #fffaf3 0%, #fff4e5 100%);
        color: #1f2937;
      }
      .container {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #fed7aa;
        box-shadow: 0 16px 40px rgba(124, 45, 18, 0.12);
      }
      .header {
        background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
        color: #ffffff;
        padding: 26px 24px;
        text-align: center;
      }
      .header h2 {
        margin: 0;
        font-size: 24px;
      }
      .header p {
        margin: 8px 0 0;
        font-size: 14px;
        opacity: 0.93;
      }
      .content {
        padding: 30px 24px;
        text-align: center;
      }
      h3 {
        margin: 0;
        font-size: 23px;
        color: #7c2d12;
      }
      .lead {
        margin: 14px 0 10px;
        font-size: 15px;
        line-height: 1.9;
        color: #7c2d12;
      }
      .button {
        background: #c2410c;
        color: #ffffff;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 10px;
        display: inline-block;
        margin: 18px 0;
        font-weight: 700;
        font-size: 15px;
      }
      .code-label {
        margin: 14px 0 10px;
        color: #9a3412;
        font-size: 14px;
      }
      .code {
        font-size: 34px;
        font-weight: 800;
        color: #9a3412;
        letter-spacing: 6px;
        background: #fff7ed;
        border: 1px dashed #fdba74;
        padding: 14px 18px;
        border-radius: 10px;
        display: inline-block;
        margin: 4px 0 14px;
      }
      .hint {
        margin: 0;
        color: #9a3412;
        font-size: 14px;
      }
      .footer {
        border-top: 1px solid #ffedd5;
        background: #fffaf3;
        padding: 16px;
        text-align: center;
        font-size: 12px;
        color: #9a3412;
        line-height: 1.8;
      }
      @media (max-width: 560px) {
        body { padding: 14px; }
        .content { padding: 24px 16px; }
        .code { font-size: 28px; letter-spacing: 4px; }
      }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>إعادة تعيين كلمة المرور</h2>
        <p>طلب آمن لتحديث كلمة المرور</p>
            </div>
            <div class="content">
                <h3>مرحباً ${username || 'المستخدم'}!</h3>
        <p class="lead">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر التالي لإكمال العملية.</p>
        <p><a href="${resetLink}" class="button">إعادة تعيين كلمة المرور</a></p>
        <p class="code-label">أو استخدم رمز التحقق التالي:</p>
                <div class="code">${code}</div>
        <p class="hint">هذا الرمز صالح لمدة 15 دقيقة فقط.</p>
            </div>
            <div class="footer">
        <p>إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    مرحباً ${username || 'المستخدم'}!

    تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.
    استخدم الرابط التالي:
    ${resetLink}

    أو استخدم رمز التحقق التالي: ${code}
    هذا الرمز صالح لمدة 15 دقيقة.
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Password reset email error: ${error.message}`);
    return false;
  }
};

const sendWelcomeEmail = async (email, username) => {
  const subject = "Welcome to the National Identification Platform";
  
  const htmlContent = `
    <!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
        <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        background: linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%);
        color: #1f2937;
      }
      .container {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #bbf7d0;
        box-shadow: 0 16px 40px rgba(22, 101, 52, 0.12);
      }
      .header {
        background: linear-gradient(135deg, #166534 0%, #16a34a 100%);
        color: #ffffff;
        padding: 28px 24px;
        text-align: center;
      }
      .header h2 {
        margin: 0;
        font-size: 27px;
      }
      .header p {
        margin: 8px 0 0;
        font-size: 14px;
        opacity: 0.92;
      }
      .content {
        padding: 30px 24px;
        text-align: center;
      }
      .content h3 {
        margin: 0;
        font-size: 24px;
        color: #14532d;
      }
      .content p {
        margin: 12px 0;
        color: #365314;
        line-height: 1.75;
        font-size: 15px;
      }
      .badge {
        margin: 18px auto 4px;
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
        border-radius: 999px;
        display: inline-block;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 700;
      }
      .footer {
        border-top: 1px solid #dcfce7;
        background: #f7fee7;
        padding: 16px;
        text-align: center;
        font-size: 12px;
        color: #4d7c0f;
      }
      @media (max-width: 560px) {
        body { padding: 14px; }
        .content { padding: 24px 16px; }
        .header h2 { font-size: 24px; }
      }
        </style>
    </head>
    <body>
        <div class="container">
      <div class="header">
        <h2>Welcome Aboard</h2>
        <p>Your account is now active</p>
      </div>
      <div class="content">
        <h3>Hello ${username}!</h3>
        <p>Your account has been successfully confirmed on the National Identification Platform.</p>
        <p>You can now sign in and start using all platform services.</p>
        <div class="badge">Account Verified</div>
      </div>
            <div class="footer">
        <p>© 2026 National Identification Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Welcome email error: ${error.message}`);
    return false;
  }
};

const sendWelcomeEmailToNewUser = async (email, username, cin, password) => {
  const subject = "Welcome to the National Identification Platform";

  const htmlContent = `
    <!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
        <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        background: linear-gradient(180deg, #ecfeff 0%, #f0f9ff 100%);
        color: #1e293b;
      }
      .container {
        max-width: 700px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #bae6fd;
        box-shadow: 0 16px 40px rgba(2, 132, 199, 0.12);
      }
      .header {
        background: linear-gradient(135deg, #0369a1 0%, #01cafc 100%);
        color: #ffffff;
        padding: 28px 24px;
        text-align: center;
      }
      .header h2 {
        margin: 0;
        font-size: 27px;
      }
      .header p {
        margin: 8px 0 0;
        font-size: 14px;
        opacity: 0.92;
      }
      .content {
        padding: 30px 24px;
        text-align: left;
      }
      .content h3 {
        margin: 0;
        font-size: 23px;
        color: #0c4a6e;
      }
      .content p {
        margin: 12px 0;
        color: #334155;
        line-height: 1.75;
        font-size: 15px;
      }
      .credential-card {
        margin-top: 18px;
        background: #f0f9ff;
        border: 1px solid #7dd3fc;
        border-radius: 12px;
        padding: 16px;
      }
      .credential-row {
        margin: 8px 0;
        font-size: 14px;
        color: #0f172a;
      }
      .label {
        font-weight: 700;
        color: #0369a1;
      }
      .warning {
        margin-top: 14px;
        font-size: 13px;
        color: #b91c1c;
      }
      .footer {
        border-top: 1px solid #e0f2fe;
        background: #f8fafc;
        padding: 16px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }
      @media (max-width: 560px) {
        body { padding: 14px; }
        .content { padding: 24px 16px; }
        .header h2 { font-size: 24px; }
      }
        </style>
    </head>
    <body>
        <div class="container">
      <div class="header">
        <h2>Welcome Aboard</h2>
        <p>Your account is ready to use</p>
      </div>
      <div class="content">
        <h3>Hello ${username}!</h3>
        <p>Your account has been successfully confirmed on the National Identification Platform.</p>
        <p>You can now sign in and access your services with the credentials below.</p>
        <div class="credential-card">
          <div class="credential-row"><span class="label">National ID:</span> ${cin}</div>
          <div class="credential-row"><span class="label">Temporary Password:</span> ${password}</div>
        </div>
        <p class="warning">For your security, please change this temporary password after your first login.</p>
      </div>
      <div class="footer">
        <p>© 2026 National Identification Platform. All rights reserved.</p>
      </div>
    </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      html: htmlContent,
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Welcome email error: ${error.message}`);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendWelcomeEmailToNewUser };

