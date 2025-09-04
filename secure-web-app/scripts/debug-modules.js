// Save this as scripts/debug-modules.js
const mongoose = require('mongoose');
const config = require('../config');

// Connect to MongoDB
mongoose.connect(config.db.uri, config.db.options)
  .then(() => {
    console.log('Connected to MongoDB');
    debugModules();
  })
  .catch(err => {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

async function debugModules() {
  try {
    // Load models
    const Role = require('../src/models/role');
    const Module = require('../src/models/module');
    const User = require('../src/models/user');
    
    // 1. Check available modules
    console.log('\n=== MODULES ===');
    const modules = await Module.find({});
    
    if (modules.length === 0) {
      console.log('No modules found in the database!');
    } else {
      console.log(`Found ${modules.length} modules:`);
      modules.forEach(module => {
        console.log(`- ${module.moduleId} (${module.name}): Active: ${module.isActive}`);
      });
    }
    
    // 2. Check roles
    console.log('\n=== ROLES ===');
    const roles = await Role.find({});
    
    if (roles.length === 0) {
      console.log('No roles found in the database!');
    } else {
      console.log(`Found ${roles.length} roles:`);
      roles.forEach(role => {
        console.log(`- ${role.name} (Level ${role.level}): ${role.permissions.length} permissions`);
        if (role.permissions.length > 0) {
          console.log('  Permissions:');
          role.permissions.forEach(perm => {
            console.log(`  - ${perm.moduleId}: ${perm.description}`);
          });
        }
      });
    }
    
    // 3. Check admin user
    console.log('\n=== ADMIN USER ===');
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('Admin user not found in the database!');
    } else {
      console.log(`Admin user found: ${adminUser.username} (${adminUser.role})`);
      
      // 4. Check if the admin role exists
      const adminRole = await Role.findOne({ name: adminUser.role });
      
      if (!adminRole) {
        console.log(`Role '${adminUser.role}' assigned to admin user does not exist!`);
      }
    }
    
    // 5. Check role service for admin
    console.log('\n=== ROLE SERVICE TEST ===');
    const roleService = require('../src/services/roles/roleService');
    
    try {
      const accessibleModules = await roleService.getAccessibleModules('admin');
      console.log(`Accessible modules for admin role: ${accessibleModules.join(', ') || 'None'}`);
      
      // Check if each module is accessible
      if (modules.length > 0 && accessibleModules.length > 0) {
        console.log('\nModule access check:');
        for (const module of modules) {
          const hasAccess = accessibleModules.includes(module.moduleId);
          console.log(`- ${module.moduleId}: ${hasAccess ? 'Accessible ✓' : 'Not accessible ✗'}`);
        }
      }
    } catch (err) {
      console.error(`Error in roleService.getAccessibleModules: ${err.message}`);
    }
    
  } catch (err) {
    console.error(`Error in debugging: ${err.message}`);
    console.error(err);
  } finally {
    // Disconnect from database
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}