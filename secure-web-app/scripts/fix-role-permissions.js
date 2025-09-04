// Save as scripts/fix-role-permissions.js
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  fixRolePermissions();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function fixRolePermissions() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Get all modules
    console.log('Fetching modules...');
    const modules = await db.collection('modules').find({ isActive: true }).toArray();
    
    console.log(`Found ${modules.length} active modules:`);
    modules.forEach(module => {
      console.log(`- ${module.moduleId}: ${module.name}`);
    });
    
    // 2. Fix admin role
    console.log('\nFixing admin role permissions...');
    
    // First get admin role
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    if (!adminRole) {
      console.log('Admin role not found!');
      return;
    }
    
    console.log('Current admin permissions:', adminRole.permissions.map(p => p.moduleId));
    
    // Create new permissions array with actual modules
    const newPermissions = [];
    
    for (const module of modules) {
      newPermissions.push({
        moduleId: module.moduleId,
        description: `Access to ${module.name}`,
        createdAt: new Date()
      });
    }
    
    // Update admin role
    await db.collection('roles').updateOne(
      { name: 'admin' },
      { 
        $set: { 
          permissions: newPermissions,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Updated admin role with ${newPermissions.length} permissions`);
    
    // 3. Fix user role
    console.log('\nFixing user role permissions...');
    
    const userRole = await db.collection('roles').findOne({ name: 'user' });
    
    if (userRole) {
      // Give user role access to system_info
      const systemInfoModule = modules.find(m => m.moduleId === 'system_info');
      
      if (systemInfoModule) {
        await db.collection('roles').updateOne(
          { name: 'user' },
          {
            $set: {
              permissions: [{
                moduleId: 'system_info',
                description: `Access to ${systemInfoModule.name}`,
                createdAt: new Date()
              }],
              updatedAt: new Date()
            }
          }
        );
        
        console.log('Updated user role with permission for system_info');
      }
    }
    
    // 4. Verify the changes
    console.log('\nVerifying changes...');
    
    const updatedAdminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    console.log('Updated admin permissions:', updatedAdminRole.permissions.map(p => p.moduleId));
    
    console.log('\nPermissions fix completed!');
    console.log('Please restart your server and refresh the dashboard page.');
    
  } catch (err) {
    console.error('Error fixing role permissions:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}