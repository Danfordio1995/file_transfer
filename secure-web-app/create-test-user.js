// Save as scripts/create-test-user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Get MongoDB URI from .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

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

async function createUserWithModel() {
  try {
    // Dynamically load the User model from your application
    // This ensures we're using the exact same model as your application
    let User;
    try {
      User = require('../src/models/user');
      console.log('Successfully loaded User model from application');
    } catch (err) {
      console.log('Could not load User model from application, creating a basic model');
      const userSchema = new mongoose.Schema({
        username: String,
        password: String,
        email: String,
        role: String,
        authType: String,
        isActive: Boolean,
        createdAt: Date,
        updatedAt: Date
      });
      User = mongoose.model('User', userSchema);
    }
    
    // Create test user data
    const username = 'testuser';
    const password = 'admin-password';
    
    console.log(`Creating test user: ${username}`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('User already exists, deleting...');
      await User.deleteOne({ username });
    }
    
    // Hash password with bcrypt (same as your application)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('Password hash generated');
    
    // Create the new user using the model
    const newUser = new User({
      username,
      password: hashedPassword,
      email: 'testuser@example.com',
      role: 'admin',
      authType: 'local',
      isActive: true
    });
    
    await newUser.save();
    
    console.log('Test user created successfully');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Collection:', User.collection.name);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

createUserWithModel();