const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'global' },
    siteName: { type: String, default: 'SmartArchive' },
    locale: { type: String, default: 'en' },
    timezone: { type: String, default: 'Africa/Tunis' },
    enforce2FA: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 30 },
    notifyByEmail: { type: Boolean, default: true },
    notifyBySms: { type: Boolean, default: false },
    autoClassify: { type: Boolean, default: true },
    autoVerifyThreshold: { type: Number, default: 92 },
    updatedBy: { type: String, default: '' },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

module.exports =
  mongoose.models.AdminSettings || mongoose.model('AdminSettings', AdminSettingsSchema);
