// scripts/init-modules.js
// Script to initialize test modules in the database
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB connection
mongoose.connect(config.db.uri, config.db.options)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Import Module model
const Module = require('../src/models/module');
const Role = require('../src/models/role');

// Create test modules
async function createTestModules() {
  try {
    // Define test modules
    const modules = [
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
            validationPattern: '^(text|json|csv),
            validationMessage: 'Format must be one of: text, json, csv'
          },
          {
            name: 'detail',
            description: 'Detail level',
            type: 'string',
            required: false,
            defaultValue: 'normal',
            validationPattern: '^(minimal|normal|detailed),
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
            validationPattern: '^(name|uid|gid),
            validationMessage: 'Sort field must be one of: name, uid, gid'
          }
        ],
        isActive: true
      },
      {
        moduleId: 'disk_usage',
        name: 'Disk Usage',
        description: 'Show disk usage of directories',
        tooltip: 'View disk usage information',
        icon: 'hdd',
        scriptName: 'disk-usage.sh',
        parameterDefinitions: [
          {
            name: 'path',
            description: 'Directory path',
            type: 'string',
            required: false,
            defaultValue: '.'
          },
          {
            name: 'min-size',
            description: 'Minimum size in MB',
            type: 'number',
            required: false,
            defaultValue: 0
          },
          {
            name: 'format',
            description: 'Output format',
            type: 'string',
            required: false,
            defaultValue: 'text',
            validationPattern: '^(text|json),
            validationMessage: 'Format must be one of: text, json'
          }
        ],
        isActive: true
      }
    ];
    
    // Insert modules
    for (const module of modules) {
      const existingModule = await Module.findOne({ moduleId: module.moduleId });
      
      if (existingModule) {
        console.log(`Module ${module.moduleId} already exists`);
        continue;
      }
      
      await Module.create(module);
      console.log(`Module ${module.moduleId} created`);
    }
    
    // Assign modules to roles
    const adminRole = await Role.findOne({ name: 'admin' });
    if (adminRole) {
      const moduleIds = modules.map(m => m.moduleId);
      
      // Add all modules to admin role
      for (const moduleId of moduleIds) {
        const hasModule = adminRole.permissions.some(p => p.moduleId === moduleId);
        
        if (!hasModule) {
          adminRole.permissions.push({
            moduleId,
            description: `Access to ${moduleId} module`
          });
        }
      }
      
      await adminRole.save();
      console.log('Modules assigned to admin role');
    }
    
    // Assign some modules to user role
    const userRole = await Role.findOne({ name: 'user' });
    if (userRole) {
      const userModuleIds = ['system_info', 'disk_usage'];
      
      for (const moduleId of userModuleIds) {
        const hasModule = userRole.permissions.some(p => p.moduleId === moduleId);
        
        if (!hasModule) {
          userRole.permissions.push({
            moduleId,
            description: `Access to ${moduleId} module`
          });
        }
      }
      
      await userRole.save();
      console.log('Modules assigned to user role');
    }
    
  } catch (err) {
    console.error('Error creating test modules:', err.message);
  } finally {
    // Close the connection
    mongoose.disconnect();
  }
}

// Run the function
createTestModules();
