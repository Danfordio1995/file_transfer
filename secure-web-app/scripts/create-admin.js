
cat > create-admin.js << 'EOF'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/securewebapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Create User model schema directly in this file
const { Schema } = mongoose;
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: function() {
      return this.authType === 'local';
    },
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  authType: {
    type: String,
    enum: ['local', 'ad'],
    default: 'local'
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists, updating password...');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin-password', salt);
    
    // Create or update admin
    const adminUser = await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        authType: 'local',
        isActive: true
      },
      { upsert: true, new: true }
    );
    
    console.log('Admin user created/updated successfully!');
    console.log('Username: admin');
    console.log('Password: admin-password');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close MongoDB connection
    setTimeout(() => {
      mongoose.disconnect();
      console.log('MongoDB disconnected');
    }, 1000);
  }
}

createAdmin();
EOF