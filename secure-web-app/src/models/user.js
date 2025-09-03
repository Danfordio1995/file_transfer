// src/models/user.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    // Only required for local authentication
    required: function() {
      return this.authType === 'local';
    },
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  authType: {
    type: String,
    enum: ['local', 'ad'],
    default: 'local'
  },
  adDN: {
    type: String,
    // Only for AD users
    sparse: true
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
