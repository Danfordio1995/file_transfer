#!/bin/bash
# create-config.sh
# Script to create configuration files for the secure web application

echo "Creating configuration files..."

# Ensure directory exists
mkdir -p config

# Create main config file
cat > config/index.js << 'EOF'
// config/index.js
require('dotenv').config();
const localConfig = require('./local');
const adConfig = require('./ad');

// Determine authentication mode
const authMode = process.env.AUTH_MODE || 'local';

// Load appropriate configuration based on auth mode
const authConfig = authMode === 'ad' ? adConfig : localConfig;

// Configuration settings
const config = {
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'change_this_to_a_secure_random_string',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  // Database configuration
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_to_a_secure_random_string',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  
  // Authentication configuration
  auth: {
    mode: authMode,
    ...authConfig
  },
  
  // Security configuration
  security: {
    // Maximum script runtime in milliseconds
    maxScriptRuntimeMs: parseInt(process.env.MAX_SCRIPT_RUNTIME_MS, 10) || 30000,
    
    // Enable Web Application Firewall (if available)
    enableWAF: process.env.ENABLE_WAF === 'true',
    
    // CORS configuration
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests, please try again later'
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;
EOF

# Create local authentication config
cat > config/local.js << 'EOF'
// config/local.js
/**
 * Configuration for local authentication
 */
module.exports = {
  // Password requirements
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  
  // Account lockout policy
  accountLockout: {
    enabled: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  }
};
EOF

# Create Active Directory authentication config
cat > config/ad.js << 'EOF'
// config/ad.js
/**
 * Configuration for Active Directory authentication
 */
module.exports = {
  // AD server settings
  url: process.env.AD_URL || 'ldap://your-ad-server.com',
  baseDN: process.env.AD_BASE_DN || 'OU=Users,DC=example,DC=com',
  
  // Service account credentials (for querying AD)
  username: process.env.AD_USERNAME || 'service_account@example.com',
  password: process.env.AD_PASSWORD || 'service_account_password',
  
  // Group to role mapping
  // Maps AD group patterns to application roles
  groupMappings: {
    // Default mappings
    'admin': 'CN=Admins,.*DC=example,DC=com',
    'manager': 'CN=Managers,.*DC=example,DC=com',
    'user': 'CN=Users,.*DC=example,DC=com'
  },
  
  // Connection options
  connectionOptions: {
    reconnect: true,
    timeout: 10000,
    connectTimeout: 10000
  },
  
  // Cache settings
  cache: {
    enabled: true,
    ttl: 3600 // 1 hour
  }
};
EOF

echo "Configuration files created successfully!"
