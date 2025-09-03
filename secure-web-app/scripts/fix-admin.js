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

// Create User schema directly in this file
const { Schema } = mongoose;
const userSchema = new Schema({
  username: String,
  password: String,
  email: String,
  role: String,
  authType: String,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);

async function fixAdminUser() {
  try {
    console.log('Looking for admin user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin-password', salt);
    console.log('Generated password hash for "admin-password"');
    
    // Delete any existing admin user to start fresh
    const deleteResult = await User.deleteMany({ username: 'admin' });
    console.log('Deleted existing admin users:', deleteResult.deletedCount);
    
    // Create a new admin user
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin',
      authType: 'local',
      isActive: true
    });
    
    await adminUser.save();
    console.log('New admin user created successfully');
    
    // Verify admin user
    const foundAdmin = await User.findOne({ username: 'admin' });
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

fixAdminUser();