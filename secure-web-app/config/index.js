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
