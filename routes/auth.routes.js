const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const VerificationCode = require("../models/VerificationCode");
const { verifyToken } = require("../middleware/auth.middleware");
const crypto = require("crypto-js");
const Admin = require("../models/Admin");

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

const normalizeRecoveryPurpose = (purpose) => {
  if (purpose === "reset" || purpose === "password_reset") {
    return "password_reset";
  }
  return "verification";
};

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const user = await User.findOne({ email: normalizedEmail });
    const admin = await Admin.findOne({ email: normalizedEmail });

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
    } else {
      if (admin) {
        await sendWelcomeEmail(normalizedEmail, admin.username);
        const token = generateToken(admin._id, admin.cin_number);
        await verification.deleteOne();
        return res.json({
          success: true,
          message: "Verification successful",
          token,
          user: {
            id: admin._id,
            cin_number: admin.cin_number,
            username: admin.username,
            email: admin.email,
            role: admin.role,
          },
        });
      }
      else if (user.is_verified) {
        await sendWelcomeEmail(normalizedEmail, user.username);
        const token = generateToken(user._id, user.cin_number);
        await verification.deleteOne();
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
      } else {
        await User.updateOne(
          { _id: user._id },
          { $set: { is_verified: true } },
        );
        password = crypto.AES.decrypt(
          user.password,
          process.env.PASSWORD_SECRET,
        ).toString(crypto.enc.Utf8);
        await sendWelcomeEmailToNewUser(
          normalizedEmail,
          user.username,
          user.cin_number,
          password,
        );
        const token = generateToken(user._id, user.cin_number);
        await verification.deleteOne();
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

router.get("/verify-email-buttom", async (req, res) => {
  try {
    const { email, code } = req.query;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const user = await User.findOne({ email: normalizedEmail });

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
    } else {
      if (admin) {
        await sendWelcomeEmail(normalizedEmail, admin.username);
        const token = generateToken(admin._id, admin.cin_number);
        await verification.deleteOne();
        return res.json({
          success: true,
          message: "Verification successful",
          token,
          user: {
            id: admin._id,
            cin_number: admin.cin_number,
            username: admin.username,
            email: admin.email,
            role: admin.role,
          },
        });
      } else if (user.is_verified) {
        await sendWelcomeEmail(normalizedEmail, user.username);
        const token = generateToken(user._id, user.cin_number);
        res.cookie("token", token, {
          httpOnly: true,
          secure: false,
        });
        return res.redirect("http://localhost:5173/dashboard");
      } else {
        await User.updateOne(
          { _id: user._id },
          { $set: { is_verified: true } },
        );
        password = crypto.AES.decrypt(
          user.password,
          process.env.PASSWORD_SECRET,
        ).toString(crypto.enc.Utf8);
        await sendWelcomeEmailToNewUser(
          normalizedEmail,
          user.username,
          user.cin_number,
          password,
        );
        const token = generateToken(user._id, user.cin_number);
        res.cookie("token", token, {
          httpOnly: true,
          secure: false,
        });
        return res.redirect("http://localhost:5173/dashboard");
      }
    }
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const admin = await Admin.findOne({ cin_number });
    console.log("Found admin:", admin);
if (admin) {
      const isValidAdminPassword =(await crypto.AES.decrypt(admin.password,process.env.PASSWORD_SECRET,).toString(crypto.enc.Utf8)) === password;
      if (isValidAdminPassword) {
         await sendWelcomeEmail(admin.email, admin.username);
        const token = generateToken(admin._id, admin.cin_number);
        admin.last_login = new Date();
        return res.json({
          success: true,
          message: "Verification successful",
          token,
          user: {
            id: admin._id,
            cin_number: admin.cin_number,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            is_verified: true,
          },
        });
      } else {
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Number of card not found",
      });
    }

    const isValidPassword =(await crypto.AES.decrypt(user.password,process.env.PASSWORD_SECRET,).toString(crypto.enc.Utf8)) === password;

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Password is incorrect",
      });
    } else {
      if (user.is_verified) {
        await sendWelcomeEmail(user.email, user.username);
        const token = generateToken(user._id, user.cin_number);
        user.last_login = new Date();
        await user.save();
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
      } else {
        await User.updateOne(
          { _id: user._id },
          { $set: { is_verified: true } },
        );
        password = crypto.AES.decrypt(
          user.password,
          process.env.PASSWORD_SECRET,
        ).toString(crypto.enc.Utf8);
        await sendWelcomeEmailToNewUser(
          user.email,
          user.username,
          user.cin_number,
          password,
        );
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
  }}
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const u = req.user;
    res.json({
      success: true,
      user: {
        id: u._id.toString(),
        cin_number: u.cin_number,
        username: u.username,
        email: u.email,
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        full_name: u.full_name || "",
        is_verified: u.is_verified !== undefined ? u.is_verified : true,
        role: u.role,
        phone: u.phone || "",
        address: u.address || "",
        date_of_birth: u.date_of_birth || "",
        bio: u.bio || "",
        avatar: u.avatar || "",
        created_at: u.created_at,
        last_login: u.last_login || null,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/logout", verifyToken, async (req, res) => {
  res.json({
    success: true,
    message: "تم تسجيل الخروج بنجاح",
  });
});

router.put("/profile", verifyToken, async (req, res) => {
  try {
    const allowedFields = [
      "username",
      "email",
      "first_name",
      "last_name",
      "full_name",
      "phone",
      "address",
      "date_of_birth",
      "bio",
      "avatar",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided",
      });
    }

    const Model = req.user.role === "admin" ? Admin : User;

    const updated = await Model.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    return res.json({
      success: true,
      user: {
        id: updated._id,
        cin_number: updated.cin_number,
        username: updated.username,
        email: updated.email,
        first_name: updated.first_name || "",
        last_name: updated.last_name || "",
        full_name: updated.full_name || "",
        is_verified: updated.is_verified !== undefined ? updated.is_verified : true,
        role: updated.role,
        phone: updated.phone || "",
        address: updated.address || "",
        date_of_birth: updated.date_of_birth || "",
        bio: updated.bio || "",
        avatar: updated.avatar || "",
        created_at: updated.created_at,
        last_login: updated.last_login || null,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current and new passwords are required",
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error:
          "Password must contain at least 8 characters including uppercase, lowercase and number",
      });
    }

    const Model = req.user.role === "admin" ? Admin : User;
    const account = await Model.findById(req.user._id);
    if (!account) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentPassword = crypto.AES.decrypt(
      account.password,
      process.env.PASSWORD_SECRET,
    ).toString(crypto.enc.Utf8);

    if (currentPassword !== oldPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    account.password = crypto.AES.encrypt(
      newPassword,
      process.env.PASSWORD_SECRET,
    ).toString();
    await account.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب",
      });
    }

    const user = await User.findOne({ email }) || await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "لم يتم العثور على حساب معلق لهذا البريد",
      });
    }

    const newCode = generateVerificationCode();

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
    const admin = await Admin.findOne({ cin_number, role: "admin" });
    const account = admin || user;

    res.json({
      success: true,
      exists: !!account,
      is_verified: account ? account.is_verified : false,
      role: account ? account.role : null,
    });
  } catch (error) {
    console.error("Check CIN error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const normalizedPurpose = normalizeRecoveryPurpose(purpose);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: "تنسيق البريد الإلكتروني غير صالح",
      });
    }
    const adminByEmail = await Admin.findOne({ email: normalizedEmail });
    const userByEmail = await User.findOne({ email: normalizedEmail });
    const userByCin = cin_number ? await User.findOne({ cin_number }) : null;
    const adminByCin = cin_number
      ? await Admin.findOne({ cin_number, role: "admin" })
      : null;
    const adminAccount = adminByEmail || adminByCin;

    const isNewUserFlow = !!cin_number && normalizedPurpose === "verification";
    const isSameAccountByCin =
      userByEmail && userByCin && String(userByEmail._id) === String(userByCin._id);

    if (adminAccount) {
      const verificationCode = code || generateVerificationCode();
      const adminUsername = adminAccount.username || username || "admin";

      const emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationCode,
        adminUsername,
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          error: "فشل في إرسال رمز التحقق",
        });
      }

      await VerificationCode.create({
        email: normalizedEmail,
        code: verificationCode,
        purpose: normalizedPurpose,
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
      });

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق بنجاح",
        email: normalizedEmail,
        code: verificationCode,
        purpose: normalizedPurpose,
      });
    }

    if (isNewUserFlow && userByEmail && !isSameAccountByCin) {
      return res.status(400).json({
        success: false,
        error: "adress email already exists and is associated with an account",
      });
    }

    const verificationCode = code || generateVerificationCode();

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

    await VerificationCode.create({
      email: normalizedEmail,
      code: verificationCode,
      purpose: normalizedPurpose,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });

    if (cin_number) {
      if (adminByCin) {
        return res.status(400).json({
          success: false,
          error: "This CIN belongs to an admin account",
        });
      }

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

    return res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح",
      email: normalizedEmail,
      code: verificationCode,
      purpose: normalizedPurpose,
    });
  } catch (error) {
    console.error("Send code error:", error.message);
    res.status(500).json({
      success: false,
      error: "فشل في إرسال رمز التحقق",
    });
  }
});

router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = String(code).trim();

    const verification = await VerificationCode.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      expires_at: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        error: "Verification code is invalid or has expired",
      });
    }

    return res.json({
      success: true,
      message: "Verification code is valid",
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const handleResetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Email, code and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must contain at least 8 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = String(code).trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const verification = await VerificationCode.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      expires_at: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        error: "Verification code is invalid or has expired",
      });
    }

    user.password = crypto.AES.encrypt(
      newPassword,
      process.env.PASSWORD_SECRET,
    ).toString();
    await user.save();

    await verification.deleteOne();

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

router.post("/reset-password", handleResetPassword);

router.post("/forgot-password/reset", handleResetPassword);

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

