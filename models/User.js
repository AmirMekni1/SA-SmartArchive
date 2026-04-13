// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
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
    enum: ['user', 'admin', 'verifier'],
    default: 'user'
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  verified_at: {
    type: Date,
    default: null
  },
  last_login: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  cin_number: {
    type: String,
    unique: true,
    sparse: true 
  }
});

module.exports = mongoose.model('User', userSchema);