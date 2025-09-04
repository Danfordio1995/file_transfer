// Save as scripts/verify-modules-api.js
const mongoose = require('mongoose');
const { execSync } = require('child_process');
require('dotenv').config();

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  verifyModulesApi();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function verifyModulesApi() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Check modules collection
    console.log('\nChecking modules collection:');
    const modules = await db.collection('modules').find({}).toArray();
    
    console.log(`Found ${modules.length} modules:`);
    modules.forEach(module => {
      console.log(`- ${module.moduleId}: ${module.name} (active: ${module.isActive})`);
    });
    
    // 2. Check admin role permissions
    console.log('\nChecking admin role permissions:');
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    if (adminRole && adminRole.permissions) {
      console.log(`Admin role has ${adminRole.permissions.length} permissions:`);
      adminRole.permissions.forEach(perm => {
        console.log(`- ${perm.moduleId}: ${perm.description}`);
        
        // Check if this permission corresponds to an existing module
        const moduleExists = modules.some(m => m.moduleId === perm.moduleId);
        console.log(`  Module exists: ${moduleExists ? '✓' : '✗'}`);
      });
    } else {
      console.log('Admin role not found or has no permissions');
    }
    
    // 3. Simulate API call to modules endpoint
    console.log('\nSimulating API call to /api/modules:');
    
    // Get roleService directly to simulate the API call
    const roleService = require('../src/services/roles/roleService');
    const taskService = require('../src/services/tasks/taskService');
    
    // This simulates what happens in the moduleRoutes.js GET / handler
    const accessibleModuleIds = await roleService.getAccessibleModules('admin');
    console.log(`Accessible module IDs for admin: ${accessibleModuleIds.join(', ')}`);
    
    const allModules = await taskService.getAllModules();
    console.log(`All active modules: ${allModules.map(m => m.moduleId).join(', ')}`);
    
    // Filter modules based on user's access (this is what the API does)
    const filteredModules = allModules.filter(module => 
      accessibleModuleIds.includes(module.moduleId)
    ).map(module => ({
      id: module.moduleId,
      name: module.name,
      description: module.description,
      icon: module.icon
    }));
    
    console.log('\nModules that would be returned by API:');
    if (filteredModules.length > 0) {
      filteredModules.forEach(module => {
        console.log(`- ${module.id}: ${module.name}`);
      });
    } else {
      console.log('No modules would be returned by the API');
    }
    
    // 4. Check for potential frontend issues
    console.log('\nPotential frontend issues:');
    console.log('- Check browser console for JavaScript errors');
    console.log('- Verify the API response format matches what the frontend expects');
    console.log('- Look for CSS issues that might be hiding the module elements');
    
    console.log('\nVerification completed');
    
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}