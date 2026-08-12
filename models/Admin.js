const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    first_name: {
      type: String,
      default: null
    },
    last_name: {
      type: String,
      default: null
    },
    full_name: {
      type: String,
      default: null
    },
    role: {
      type: String,
      default: 'admin'
    },
    is_verified: {
      type: Boolean,
      default: true
    },
    verified_at: {
      type: Date,
      default: null
    },
    last_login: {
      type: Date,
      default: null
    },
    cin_number: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    date_of_birth: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
