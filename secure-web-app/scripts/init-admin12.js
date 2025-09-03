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
