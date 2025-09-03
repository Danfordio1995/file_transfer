// src/models/role.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Permission schema (embedded in role)
const permissionSchema = new Schema({
  moduleId: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Role schema
const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 10
    // Lower number = higher privilege (0 = superadmin)
  },
  permissions: [permissionSchema],
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
roleSchema.index({ name: 1 });
roleSchema.index({ level: 1 });

// Make sure the default roles exist
roleSchema.statics.initDefaultRoles = async function() {
  const Role = this;
  
  // Default roles with their permissions
  const defaultRoles = [
    {
      name: 'admin',
      description: 'Administrator with full access',
      level: 0,
      permissions: [
        { 
          moduleId: 'user_management', 
          description: 'Manage users and roles' 
        },
        { 
          moduleId: 'system_config', 
          description: 'System configuration' 
        }
      ]
    },
    {
      name: 'manager',
      description: 'Manager with elevated privileges',
      level: 5,
      permissions: [
        { 
          moduleId: 'reports', 
          description: 'Access to reports' 
        }
      ]
    },
    {
      name: 'user',
      description: 'Standard user',
      level: 10,
      permissions: [
        { 
          moduleId: 'dashboard', 
          description: 'User dashboard' 
        }
      ]
    }
  ];
  
  // Create or update default roles
  for (const roleData of defaultRoles) {
    await Role.findOneAndUpdate(
      { name: roleData.name },
      roleData,
      { upsert: true, new: true }
    );
  }
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
