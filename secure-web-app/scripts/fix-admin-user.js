const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Define User schema directly in this file to avoid circular dependencies
const { Schema } = mongoose;
const userSchema = new Schema({
  username: String,
  password: String,
  email: String,
  role: String,
  authType: String,
  isActive: Boolean
});

// Define User model
const User = mongoose.model('User', userSchema);

// Define admin user properties - THIS FIXES THE REFERENCE ERROR
const admin = {
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  authType: 'local',
  isActive: true
};

async function createAdminUser() {
  try {
    console.log('Looking for admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: admin.username });
    
    if (existingAdmin) {
      console.log('Admin user already exists, updating...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin-password', salt);
      
      // Update admin user
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      
      console.log('Admin password updated successfully');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin-password', salt);
      
      // Create a new admin user
      const adminUser = new User({
        username: admin.username,
        password: hashedPassword,
        email: admin.email,
        role: admin.role,
        authType: admin.authType,
        isActive: admin.isActive
      });
      
      await adminUser.save();
      console.log('New admin user created successfully');
    }
    
    // Verify admin user
    const foundAdmin = await User.findOne({ username: admin.username });
    if (foundAdmin) {
      console.log('Admin user verified in database:');
      console.log('- Username:', foundAdmin.username);
      console.log('- Email:', foundAdmin.email);
      console.log('- Role:', foundAdmin.role);
      console.log('- Password hash length:', foundAdmin.password.length);
    } else {
      console.error('ERROR: Admin user not found after creation!');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the function
createAdminUser();