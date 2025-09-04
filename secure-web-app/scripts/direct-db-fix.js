// Save this as scripts/direct-db-fix.js
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
  directDatabaseFix();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function directDatabaseFix() {
  try {
    // 1. First, let's create a database backup
    try {
      console.log('Creating database backup...');
      execSync(`mongodump --uri="${MONGODB_URI}" --out="db_backup_$(date +%Y%m%d_%H%M%S)"`);
      console.log('Database backup created');
    } catch (err) {
      console.log('Could not create database backup:', err.message);
      console.log('Proceeding without backup...');
    }
    
    // 2. Get direct database connection to work at collection level
    const db = mongoose.connection.db;
    
    // 3. Check modules collection
    console.log('\nChecking modules collection...');
    const modules = await db.collection('modules').find({}).toArray();
    
    console.log(`Found ${modules.length} modules:`);
    modules.forEach(module => {
      console.log(`- ${module.moduleId}: ${module.name} (active: ${module.isActive})`);
    });
    
    if (modules.length === 0) {
      console.log('No modules found, creating defaults...');
      
      // Create default modules directly
      await db.collection('modules').insertMany([
        {
          moduleId: 'system_info',
          name: 'System Information',
          description: 'Display system information including CPU, memory, and disk usage',
          tooltip: 'View detailed system information',
          icon: 'server',
          scriptName: 'system-info.sh',
          isActive: true,
          parameterDefinitions: [
            {
              name: 'format',
              description: 'Output format',
              type: 'string',
              required: false,
              defaultValue: 'text',
              validationPattern: '^(text|json|csv)$',
              validationMessage: 'Format must be one of: text, json, csv'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          moduleId: 'user_list',
          name: 'User List',
          description: 'List all system users',
          tooltip: 'View all system users',
          icon: 'users',
          scriptName: 'user-list.sh',
          isActive: true,
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
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      console.log('Default modules created');
    }
    
    // 4. Check roles collection
    console.log('\nChecking roles collection...');
    const roles = await db.collection('roles').find({}).toArray();
    
    console.log(`Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`- ${role.name}: Level ${role.level}, ${role.permissions?.length || 0} permissions`);
      if (role.permissions && role.permissions.length > 0) {
        role.permissions.forEach(perm => {
          console.log(`  - ${perm.moduleId}: ${perm.description}`);
        });
      }
    });
    
    // 5. DIRECT FIX: Update admin role permissions to match actual modules
    console.log('\nUpdating admin role permissions...');
    
    // Get all active modules
    const activeModules = await db.collection('modules').find({ isActive: true }).toArray();
    const moduleIds = activeModules.map(m => m.moduleId);
    
    console.log(`Active modules: ${moduleIds.join(', ')}`);
    
    // Update admin role with these modules
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    if (adminRole) {
      // Create new permissions array with the actual module IDs
      const newPermissions = moduleIds.map(moduleId => {
        const module = activeModules.find(m => m.moduleId === moduleId);
        return {
          moduleId,
          description: `Access to ${module.name}`,
          createdAt: new Date()
        };
      });
      
      // Update the admin role
      await db.collection('roles').updateOne(
        { name: 'admin' },
        { 
          $set: { 
            permissions: newPermissions,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('Admin role permissions updated');
    } else {
      console.log('Admin role not found');
    }
    
    // 6. Update user role
    const userRole = await db.collection('roles').findOne({ name: 'user' });
    
    if (userRole) {
      // Give user role access to system_info
      const systemInfoModule = activeModules.find(m => m.moduleId === 'system_info');
      
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
        
        console.log('User role permissions updated');
      }
    }
    
    // 7. Verify the changes
    console.log('\nVerifying changes...');
    
    const updatedAdminRole = await db.collection('roles').findOne({ name: 'admin' });
    console.log('Updated admin role permissions:');
    
    if (updatedAdminRole && updatedAdminRole.permissions) {
      updatedAdminRole.permissions.forEach(perm => {
        console.log(`- ${perm.moduleId}: ${perm.description}`);
      });
    }
    
    console.log('\nDirect database fix completed!');
    console.log('Please restart your server and refresh the dashboard page.');
    
  } catch (err) {
    console.error('Error during direct database fix:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}