const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// MongoDB connection
mongoose.connect(config.db.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Create User schema directly in this file
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
    required: true,
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

// Create Role schema
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

// Create Module schema
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

const moduleSchema = new Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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

// Register models
const User = mongoose.model('User', userSchema);
const Role = mongoose.model('Role', roleSchema);
const Module = mongoose.model('Module', moduleSchema);

// Create or update admin user
async function initializeData() {
  try {
    console.log('Initializing application data...');
    
    // Create admin user
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin-password', salt);
      
      const adminUser = new User({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        authType: 'local',
        isActive: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create roles
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        level: 0,
        permissions: []
      },
      {
        name: 'manager',
        description: 'Manager with elevated privileges',
        level: 5,
        permissions: []
      },
      {
        name: 'user',
        description: 'Standard user',
        level: 10,
        permissions: []
      }
    ];
    
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Role "${roleData.name}" created`);
      } else {
        console.log(`Role "${roleData.name}" already exists`);
      }
    }
    
    // Create modules
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
    
    for (const moduleData of defaultModules) {
      const existingModule = await Module.findOne({ moduleId: moduleData.moduleId });
      if (!existingModule) {
        await Module.create(moduleData);
        console.log(`Module "${moduleData.moduleId}" created`);
      } else {
        console.log(`Module "${moduleData.moduleId}" already exists`);
      }
    }
    
    // Assign permissions to admin role
    const adminRole = await Role.findOne({ name: 'admin' });
    if (adminRole) {
      const moduleIds = defaultModules.map(m => m.moduleId);
      
      for (const moduleId of moduleIds) {
        const hasPermission = adminRole.permissions.some(p => p.moduleId === moduleId);
        
        if (!hasPermission) {
          adminRole.permissions.push({
            moduleId,
            description: `Access to ${moduleId}`
          });
        }
      }
      
      await adminRole.save();
      console.log('Admin role permissions updated');
    }
    
    // Assign system_info to user role
    const userRole = await Role.findOne({ name: 'user' });
    if (userRole) {
      const hasPermission = userRole.permissions.some(p => p.moduleId === 'system_info');
      
      if (!hasPermission) {
        userRole.permissions.push({
          moduleId: 'system_info',
          description: 'Access to system information'
        });
        
        await userRole.save();
        console.log('User role permissions updated');
      }
    }
    
    console.log('Initialization completed successfully');
  } catch (err) {
    console.error('Error initializing data:', err);
  } finally {
    mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the initialization
initializeData();