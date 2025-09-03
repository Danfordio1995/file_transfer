// src/index.js
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const config = require('../config');
const { createLogger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const roleRoutes = require('./routes/roleRoutes');

const logger = createLogger('app');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(config.db.uri, config.db.options)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Initialize default roles and modules after DB connection
    const Role = require('./models/role');
    const Module = require('./models/module');
    
    Role.initDefaultRoles()
      .then(() => logger.info('Default roles initialized'))
      .catch(err => logger.error(`Error initializing roles: ${err.message}`));
    
    Module.initDefaultModules()
      .then(() => logger.info('Default modules initialized'))
      .catch(err => logger.error(`Error initializing modules: ${err.message}`));
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: config.security.rateLimit.message
});
app.use('/api/', limiter);

// Request logging
app.use(morgan(config.logging.format, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Parse cookies
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/roles', roleRoutes);

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Authentication mode: ${config.auth.mode}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:');
  logger.error(err);
  // Don't exit the process in production, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:');
  logger.error(err);
  // Exit with error in case of uncaught exception
  process.exit(1);
});

module.exports = app;
