// Save this as scripts/fix-module-permissions.js
const mongoose = require('mongoose');
const config = require('../config');

// Connect to MongoDB
mongoose.connect(config.db.uri, config.db.options)
  .then(() => {
    console.log('Connected to MongoDB');
    fixModulePermissions();
  })
  .catch(err => {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

async function fixModulePermissions() {
  try {
    // Load models
    const Role = require('../src/models/role');
    const Module = require('../src/models/module');
    
    // 1. Get all modules
    console.log('Fetching all modules...');
    const modules = await Module.find({});
    
    if (modules.length === 0) {
      console.error('No modules found in the database!');
      return;
    }
    
    console.log(`Found ${modules.length} modules: ${modules.map(m => m.moduleId).join(', ')}`);
    
    // 2. Update admin role
    console.log('\nUpdating admin role...');
    const adminRole = await Role.findOne({ name: 'admin' });
    
    if (!adminRole) {
      console.error('Admin role not found in the database!');
      return;
    }
    
    console.log(`Current admin permissions: ${adminRole.permissions.map(p => p.moduleId).join(', ')}`);
    
    // Add system_info and user_list permissions to admin role
    let updated = false;
    
    for (const module of modules) {
      if (!adminRole.permissions.some(p => p.moduleId === module.moduleId)) {
        adminRole.permissions.push({
          moduleId: module.moduleId,
          description: `Access to ${module.name}`
        });
        console.log(`Added permission for ${module.moduleId} to admin role`);
        updated = true;
      }
    }
    
    if (updated) {
      await adminRole.save();
      console.log('Admin role updated successfully');
    } else {
      console.log('No updates needed for admin role');
    }
    
    // 3. Update user role with system_info
    console.log('\nUpdating user role...');
    const userRole = await Role.findOne({ name: 'user' });
    
    if (userRole) {
      updated = false;
      
      // Add system_info to user role
      if (!userRole.permissions.some(p => p.moduleId === 'system_info')) {
        userRole.permissions.push({
          moduleId: 'system_info',
          description: 'Access to system information'
        });
        console.log('Added system_info permission to user role');
        updated = true;
      }
      
      if (updated) {
        await userRole.save();
        console.log('User role updated successfully');
      } else {
        console.log('No updates needed for user role');
      }
    } else {
      console.log('User role not found');
    }
    
    // 4. Verify permissions
    console.log('\nVerifying permissions...');
    
    const updatedAdminRole = await Role.findOne({ name: 'admin' });
    console.log(`Updated admin permissions: ${updatedAdminRole.permissions.map(p => p.moduleId).join(', ')}`);
    
    // Verify using roleService
    const roleService = require('../src/services/roles/roleService');
    const accessibleModules = await roleService.getAccessibleModules('admin');
    console.log(`Accessible modules for admin: ${accessibleModules.join(', ')}`);
    
    // Check if each module is accessible
    console.log('\nModule access check:');
    for (const module of modules) {
      const hasAccess = accessibleModules.includes(module.moduleId);
      console.log(`- ${module.moduleId}: ${hasAccess ? 'Accessible ✓' : 'Not accessible ✗'}`);
    }
    
    console.log('\nFix completed!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}