#!/bin/bash
# create-models.sh
# Script to create model files for the secure web application

echo "Creating model files..."

# Ensure directory exists
mkdir -p src/models

# Create User model
cat > src/models/user.js << 'EOF'
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
EOF

# Create Role model
cat > src/models/role.js << 'EOF'
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
EOF

# Create Module model
cat > src/models/module.js << 'EOF'
// src/models/module.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Parameter definition schema (embedded in module)
const parameterDefinitionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: Schema.Types.Mixed,
    default: null
  },
  validationPattern: {
    type: String,
    default: null
  },
  validationMessage: {
    type: String,
    default: null
  }
}, { _id: false });

// Module schema
const moduleSchema = new Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Only allow lowercase letters, numbers, and underscores
    match: /^[a-z0-9_]+$/
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  tooltip: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'module'
  },
  scriptName: {
    type: String,
    required: true,
    trim: true
  },
  parameterDefinitions: [parameterDefinitionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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
moduleSchema.index({ moduleId: 1 });
moduleSchema.index({ isActive: 1 });

// Make sure default modules exist
moduleSchema.statics.initDefaultModules = async function() {
  const Module = this;
  
  // Default modules
  const defaultModules = [
    {
      moduleId: 'system_info',
      name: 'System Information',
      description: 'Display system information including CPU, memory, and disk usage',
      tooltip: 'View detailed system information',
      icon: 'server',
      scriptName: 'system-info.sh',
      parameterDefinitions: [
        {
          name: 'format',
          description: 'Output format',
          type: 'string',
          required: false,
          defaultValue: 'text',
          validationPattern: '^(text|json|csv)$',
          validationMessage: 'Format must be one of: text, json, csv'
        },
        {
          name: 'detail',
          description: 'Detail level',
          type: 'string',
          required: false,
          defaultValue: 'normal',
          validationPattern: '^(minimal|normal|detailed)$',
          validationMessage: 'Detail must be one of: minimal, normal, detailed'
        }
      ],
      isActive: true
    },
    {
      moduleId: 'user_list',
      name: 'User List',
      description: 'List all system users',
      tooltip: 'View all system users',
      icon: 'users',
      scriptName: 'user-list.sh',
      parameterDefinitions: [
        {
          name: 'sortBy',
          description: 'Sort by field',
          type: 'string',
          required: false,
          defaultValue: 'name',
          validationPattern: '^(name|uid|gid)$',
          validationMessage: 'Sort field must be one of: name, uid, gid'
        }
      ],
      isActive: true
    }
  ];
  
  // Create or update default modules
  for (const moduleData of defaultModules) {
    await Module.findOneAndUpdate(
      { moduleId: moduleData.moduleId },
      moduleData,
      { upsert: true, new: true }
    );
  }
};

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
EOF

echo "Model files created successfully!"
