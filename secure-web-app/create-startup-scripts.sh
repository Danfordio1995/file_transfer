#!/bin/bash
# create-startup-scripts.sh
# Create scripts to initialize the database with an admin user

echo "Creating startup scripts..."

mkdir -p scripts

# Create a script to initialize the admin user
cat > scripts/init-admin.js << 'EOF_INNER'
// scripts/init-admin.js
// Script to initialize the admin user in the database
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// MongoDB connection
mongoose.connect(config.db.uri, config.db.options)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Import User model
const User = require('../src/models/user');

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin-password', salt);
    
    // Create the admin user
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin',
      authType: 'local'
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err.message);
  } finally {
    // Close the connection
    mongoose.disconnect();
  }
}

// Run the function
createAdminUser();
EOF_INNER

# Create a script to create test modules
cat > scripts/init-modules.js << 'EOF_INNER'
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
EOF_INNER

# Add the initialization commands to package.json
cat > add-init-scripts.js << 'EOF_INNER'
const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read the file
let packageJson;
try {
  const data = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(data);
} catch (err) {
  console.error('Error reading package.json:', err.message);
  process.exit(1);
}

// Add initialization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts.init = 'node scripts/init-admin.js && node scripts/init-modules.js';
packageJson.scripts.postinstall = 'chmod +x scripts/*.sh';

// Write the file back
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Added initialization scripts to package.json');
} catch (err) {
  console.error('Error writing package.json:', err.message);
  process.exit(1);
}
EOF_INNER

chmod +x create-startup-scripts.sh
echo "Startup scripts created successfully!"
