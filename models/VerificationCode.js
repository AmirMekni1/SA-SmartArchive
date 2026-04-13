// models/VerificationCode.js
const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['verification', 'password_reset'],
    default: 'verification'
  },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
