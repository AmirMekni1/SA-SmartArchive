// routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const VerificationCode = require("../models/VerificationCode");
const { verifyToken } = require("../middleware/auth.middleware");
const crypto = require("crypto-js");

const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendWelcomeEmailToNewUser,
} = require("../services/email.service");
const {
  generateVerificationCode,
  generateToken,
  isValidEmail,
  isValidCIN,
  isStrongPassword,
} = require("../utils/helpers-ocr");

const router = express.Router();

const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};



// =======================
// POST /api/auth/verify-email - تأكيد البريد الإلكتروني
// =======================
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Check verification code
    const verification = await VerificationCode.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      expires_at: { $gt: new Date() },
    });

    if (!verification) {
      console.error(
        `Verification failed: email=${normalizedEmail}, code=${normalizedCode}`,
      );
      return res.status(400).json({
        success: false,
        error: `"Verification code is invalid or has expired"`,
      });
    }else{
      if (user.is_verified) {
      await sendWelcomeEmail(normalizedEmail, user.username);
      const token = generateToken(user._id, user.cin_number);
      return res.json({
        success: true,
        message: "Verification successful",
        token,
        user: {
          id: user._id,
          cin_number: user.cin_number,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    }else{
      await User.updateOne(
        { _id: user._id },
        { $set: { is_verified: true} },
      );
      password = crypto.AES.decrypt(user.password, process.env.PASSWORD_SECRET).toString(crypto.enc.Utf8);
      await sendWelcomeEmailToNewUser(normalizedEmail, user.username, user.cin_number, password);
      const token = generateToken(user._id, user.cin_number);
      return res.json({
        success: true,
        message: "Verification successful",
        token,
        user: {
          id: user._id,
          cin_number: user.cin_number,
          username: user.username,
          email: user.email,
          role: user.role,
          is_verified: true,
        },
      });
    }
  }
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// POST /api/auth/verify-email-buttom 
// =======================
router.get("/verify-email-buttom", async (req, res) => {
  try {
    const { email, code } = req.query;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Check verification code
    const verification = await VerificationCode.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      expires_at: { $gt: new Date() },
    });

    if (!verification) {
      console.error(
        `Verification failed: email=${normalizedEmail}, code=${normalizedCode}`,
      );
      return res.status(400).json({
        success: false,
        error: `"Verification code is invalid or has expired"`,
      });
    }else{
      if (user.is_verified) {
      await sendWelcomeEmail(normalizedEmail, user.username);
      const token = generateToken(user._id, user.cin_number);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });
      return res.redirect('http://localhost:5173/dashboard');
        }
      
    else{
      await User.updateOne(
        { _id: user._id },
        { $set: { is_verified: true} },
      );
      password = crypto.AES.decrypt(user.password, process.env.PASSWORD_SECRET).toString(crypto.enc.Utf8);
      await sendWelcomeEmailToNewUser(normalizedEmail, user.username, user.cin_number, password);
      const token = generateToken(user._id, user.cin_number);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });
      return res.redirect('http://localhost:5173/dashboard');
    }    
}
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// POST /api/auth/login - تسجيل الدخول
// =======================
router.post("/login", async (req, res) => {
  try {
    const { cin_number, password } = req.body;

    if (!cin_number || !password) {
      return res.status(400).json({
        success: false,
        error: "رقم البطاقة وكلمة المرور مطلوبان",
      });
    }

    const user = await User.findOne({ cin_number });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "رقم البطاقة غير موجود",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "كلمة المرور غير صحيحة",
      });
    }

    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        error: "يرجى تأكيد بريدك الإلكتروني أولاً",
        requires_verification: true,
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    const token = generateToken(user._id, user.cin_number);
console.log(`User ${user.username} logged in successfully`);
    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: {
        id: user._id,
        cin_number: user.cin_number,
        username: user.username,
        email: user.email,
        is_verified: user.is_verified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// GET /api/auth/me - معلومات المستخدم الحالي
// =======================
router.get("/me", verifyToken, async (req, res) => {
  try {
res.json({
      success: true,
      user: {
        id: req.user._id.toString(),
        cin_number: req.user.cin_number,
        username: req.user.username,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        full_name: req.user.full_name,
        is_verified: req.user.is_verified,
        role: req.user.role,
        created_at: req.user.created_at,
        last_login: req.user.last_login,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// POST /api/auth/logout - تسجيل الخروج
// =======================
router.post("/logout", verifyToken, async (req, res) => {
  res.json({
    success: true,
    message: "تم تسجيل الخروج بنجاح",
  });
});

// =======================
// POST /api/auth/resend-code - إعادة إرسال رمز التحقق
// =======================
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "لم يتم العثور على حساب معلق لهذا البريد",
      });
    }

    const newCode = generateVerificationCode();

    // Update verification code
    await VerificationCode.findOneAndUpdate(
      { email },
      {
        code: newCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
      },
      { upsert: true },
    );


    const emailSent = await sendVerificationEmail(
      email,
      newCode,
      user.username,
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: "فشل إرسال البريد",
      });
    }

    res.json({
      success: true,
      message: "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني",
    });
  } catch (error) {
    console.error("Resend code error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// POST /api/auth/check-cin - التحقق من وجود رقم بطاقة
// =======================
router.post("/check-cin", async (req, res) => {
  try {
    const { cin_number } = req.body;

    if (!cin_number) {
      return res.status(400).json({
        success: false,
        error: "رقم البطاقة مطلوب",
      });
    }

    const user = await User.findOne({ cin_number });

    res.json({
      success: true,
      exists: !!user,
      is_verified: user ? user.is_verified : false,
    });
  } catch (error) {
    console.error("Check CIN error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================
// POST /api/auth/send-code - إرسال رمز تحقق
// =======================
router.post("/send-code", async (req, res) => {
  try {
    const {
      email,
      username,
      purpose,
      code,
      cin_number,
      first_name,
      last_name,
      full_name,
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: "تنسيق البريد الإلكتروني غير صالح",
      });
    }

    // Generate verification code if not provided
    const verificationCode = code || generateVerificationCode();

    // Send verification email directly using Node.js service
    const emailSent = await sendVerificationEmail(
      normalizedEmail,
      verificationCode,
      username,
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: "فشل في إرسال رمز التحقق",
      });
    }

    // Save verification code to database
    await VerificationCode.create({
      email: normalizedEmail,
      code: verificationCode,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });

    // For new users, store pending registration data if CIN number is provided
    if (cin_number) {
      let existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { cin_number }],
      });

      const UserUsername =
        username || full_name || normalizedEmail.split("@")[0] || cin_number;
      const pendingPassword = await crypto.AES.encrypt(
        generateRandomPassword(),
        process.env.PASSWORD_SECRET,
      ).toString();

      if (!existingUser) {
        await User.create({
          cin_number,
          email: normalizedEmail,
          password: pendingPassword,
          username: UserUsername,
          first_name: first_name || null,
          last_name: last_name || null,
          full_name: full_name || null,
          is_verified: false,
          role: "user",
          created_at: new Date(),
        });
      } else {
        const updates = {};
        if (!existingUser.cin_number) updates.cin_number = cin_number;
        if (!existingUser.first_name && first_name)
          updates.first_name = first_name;
        if (!existingUser.last_name && last_name) updates.last_name = last_name;
        if (!existingUser.full_name && full_name) updates.full_name = full_name;
        if (!existingUser.email) updates.email = normalizedEmail;
        if (Object.keys(updates).length > 0) {
          await User.updateOne({ _id: existingUser._id }, { $set: updates });
        }
      }

    }

    res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح",
      email: normalizedEmail,
      code: verificationCode,
      purpose: purpose || "verification",
    });
  } catch (error) {
    console.error("Send code error:", error.message);
    res.status(500).json({
      success: false,
      error: "فشل في إرسال رمز التحقق",
    });
  }
});


// =======================
// POST /api/auth/test-email - اختبار البريد الإلكتروني
// =======================
router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب",
      });
    }

    console.log("Testing email service...");
    console.log(
      "EMAIL_ADDRESS:",
      process.env.EMAIL_ADDRESS ? "SET" : "NOT SET",
    );
    console.log(
      "EMAIL_PASSWORD:",
      process.env.EMAIL_PASSWORD ? "SET" : "NOT SET",
    );

    const emailSent = await sendVerificationEmail(email, "123456", "Test User");

    res.json({
      success: emailSent,
      message: emailSent
        ? "تم إرسال البريد الإلكتروني بنجاح"
        : "فشل في إرسال البريد الإلكتروني",
      email_credentials: {
        address: process.env.EMAIL_ADDRESS ? "configured" : "missing",
        password: process.env.EMAIL_PASSWORD ? "configured" : "missing",
      },
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
