// Fix database module issues
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
  fixDbModules();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function fixDbModules() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Ensure modules have all required fields
    console.log('Updating modules to ensure all fields are present...');
    
    const modules = await db.collection('modules').find({}).toArray();
    
    for (const module of modules) {
      // Ensure all required fields are present
      const updates = {};
      
      if (!module.name) updates.name = module.moduleId;
      if (!module.description) updates.description = `Module for ${module.moduleId}`;
      if (!module.scriptName) updates.scriptName = `${module.moduleId}.sh`;
      if (module.isActive === undefined) updates.isActive = true;
      if (!module.icon) updates.icon = 'module';
      if (!module.createdAt) updates.createdAt = new Date();
      if (!module.updatedAt) updates.updatedAt = new Date();
      
      if (Object.keys(updates).length > 0) {
        await db.collection('modules').updateOne(
          { _id: module._id },
          { $set: updates }
        );
        
        console.log(`Updated module ${module.moduleId} with missing fields`);
      }
    }
    
    // 2. Update admin role to have permissions for ALL modules
    console.log('Ensuring admin role has permissions for all modules...');
    
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    if (adminRole) {
      const permissions = [];
      
      for (const module of modules) {
        permissions.push({
          moduleId: module.moduleId,
          description: `Access to ${module.name}`,
          createdAt: new Date()
        });
      }
      
      await db.collection('roles').updateOne(
        { name: 'admin' },
        { 
          $set: { 
            permissions,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`Updated admin role with permissions for ${modules.length} modules`);
    }
    
    console.log('Database fix completed');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}
