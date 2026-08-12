const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['verification', 'password_reset'],
      default: 'verification'
    },
    expires_at: { type: Date, required: true }
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports =
  mongoose.models.VerificationCode || mongoose.model('VerificationCode', verificationCodeSchema);

