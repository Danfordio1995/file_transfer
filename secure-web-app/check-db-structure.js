// Save as scripts/check-db-structure.js
const mongoose = require('mongoose');
require('dotenv').config();

// Get MongoDB URI from .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

console.log('Connecting to MongoDB at:', MONGODB_URI);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Get native MongoDB driver connection
const db = mongoose.connection;

async function checkDatabaseStructure() {
  try {
    // List all collections
    const collections = await db.db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Find the user collection
    const userCollectionName = collections.find(c => 
      c.name === 'users' || c.name === 'Users' || c.name === 'user'
    )?.name;
    
    console.log(`\nLikely user collection name: ${userCollectionName || 'Not found'}`);
    
    // Check documents in the user collection
    if (userCollectionName) {
      const users = await db.db.collection(userCollectionName).find({}).toArray();
      console.log(`\nFound ${users.length} users in collection '${userCollectionName}'`);
      
      if (users.length > 0) {
        console.log('\nSample user document structure:');
        const sampleUser = users[0];
        
        // Print keys and value types
        Object.keys(sampleUser).forEach(key => {
          const valueType = typeof sampleUser[key];
          console.log(`- ${key}: ${valueType} ${valueType === 'string' && key === 'password' ? `(length: ${sampleUser[key].length})` : ''}`);
        });
        
        // Look for test user
        const testUser = users.find(u => u.username === 'test');
        console.log(`\nTest user found: ${testUser ? 'Yes' : 'No'}`);
        
        if (testUser) {
          console.log('Test user details:');
          console.log(`- username: ${testUser.username}`);
          console.log(`- role: ${testUser.role}`);
          console.log(`- isActive: ${testUser.isActive}`);
          console.log(`- password hash: ${testUser.password.substring(0, 20)}...`);
        }
      }
    }
    
    // Load the User model from your application
    try {
      const UserModel = require('../src/models/user');
      console.log('\nApplication User model schema:');
      
      // Get schema paths
      const schemaPaths = UserModel.schema.paths;
      Object.keys(schemaPaths).forEach(path => {
        if (path !== '__v') {
          const schemaType = schemaPaths[path];
          console.log(`- ${path}: ${schemaType.instance} ${schemaType.options.required ? '(required)' : ''}`);
        }
      });
    } catch (err) {
      console.log('\nCould not load application User model:', err.message);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}

checkDatabaseStructure();