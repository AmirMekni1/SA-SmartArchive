// services/email.service.js
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
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
  
  // Verification link (can be customized based on frontend)
  const verificationLink = `http://localhost:3001/api/auth/verify-email-buttom?email=${email}&code=${code}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eeaa9 0%, #764ba28f 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .code { font-size: 32px; font-weight: bold; color: #27ae60; letter-spacing: 5px; background: #f0f4ff; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .button { background: #27ae60; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background: #229954; }
            .divider { border-top: 2px solid #e0e0e0; margin: 25px 0; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
            .note { color: #e74c3c; font-size: 12px; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2><img src="http://localhost:3001/Images/SmartArchiveLogo.png" alt="Email Icon" style="vertical-align: middle; margin-right: 8px;"/> National Identification Platform</h2>
            </div>
            <div class="content">
                <h3>Hello ${username || 'User'}!</h3>
                <p>Thank you for registering with us. To verify your email address, click the button below:</p>
                <a href="${verificationLink}" class="button">✓ Verify Email</a>
                <div class="divider"></div>
                <p>Or use your verification code:</p>
                <div class="code">${code}</div>
                <p>This code is valid for <strong>15 minutes</strong></p>
                <p class="note">⚠️ If you did not create this account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 National Identification Platform - All rights reserved</p>
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
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .code { font-size: 32px; font-weight: bold; color: #d35400; letter-spacing: 5px; background: #fff4e5; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .button { background: #d35400; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>إعادة تعيين كلمة المرور</h2>
            </div>
            <div class="content">
                <h3>مرحباً ${username || 'المستخدم'}!</h3>
                <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p>
                <p><a href="${resetLink}" class="button">إعادة التعيين</a></p>
                <p>أو استخدم رمز التحقق التالي:</p>
                <div class="code">${code}</div>
                <p>هذا الرمز صالح لمدة 15 دقيقة.</p>
            </div>
            <div class="footer">
                <p>إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد.</p>
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
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="container">
          <div class="header">
            <h2>🎉 Welcome!</h2>
          </div>
        <div class="content">
          <h3>Hello ${username}!</h3>
          <p>Your account has been successfully confirmed on the National Identification Platform.</p>
          <p>You can now log in and start using our services.</p>
        </div>
            <div class="footer">
                <p>© 2026 National Identification Platform - All rights reserved</p>
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
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
          <div class="header">
            <h2>🎉 Welcome!</h2>
          </div>
        <div class="content">
          <h3>Hello ${username}!</h3>
          <p>Your account has been successfully confirmed on the National Identification Platform.</p>
          <p>You can now log in and start using our services.</p>
          <p>Your National ID number : ${cin}</p>
          <p>Your Password : ${password}</p>
        </div>
        <div class="footer">
          <p>© 2026 National Identification Platform - All rights reserved</p>
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
