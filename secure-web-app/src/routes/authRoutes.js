// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authService = require('../services/auth/authService');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { createLogger } = require('../utils/logger');
const config = require('../../config');

const logger = createLogger('authRoutes');

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, password } = req.body;
    
    // Authenticate user
    const result = await authService.authenticate(username, password);
    
    if (!result) {
      logger.warn(`Failed login attempt for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    logger.info(`User logged in: ${username}`);
    res.json(result);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Admin only
 */
router.post('/register', [
  authenticateToken,
  requireAdmin,
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').isIn(['admin', 'manager', 'user']).withMessage('Invalid role')
], async (req, res) => {
  // Only available in local authentication mode
  if (config.auth.mode !== 'local') {
    return res.status(400).json({ 
      error: 'User registration is only available in local authentication mode' 
    });
  }
  
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Register new user
    const userData = {
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      role: req.body.role,
      name: req.body.name
    };
    
    const newUser = await authService.registerUser(userData);
    
    logger.info(`New user registered by admin: ${newUser.username}`);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    logger.error(`User registration error: ${error.message}`);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (error) {
    logger.error(`Error fetching current user: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/auth/config
 * @desc Get auth configuration (for frontend)
 * @access Public
 */
router.get('/config', (req, res) => {
  res.json({
    authMode: config.auth.mode,
    // Only send non-sensitive configuration info
    useActiveDirectory: config.auth.mode === 'ad'
  });
});


/**
 * @route POST /api/auth/debug
 * @desc Debug login request
 * @access Public
 */
router.post('/debug', (req, res) => {
  console.log('DEBUG LOGIN REQUEST:');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  res.json({
    message: 'Debug info logged to server console',
    receivedBody: req.body
  });
});


/**
 * @route POST /api/auth/debug
 * @desc Debug login request
 * @access Public
 */
router.post('/debug', (req, res) => {
  console.log('DEBUG LOGIN REQUEST:');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  res.json({
    message: 'Debug info logged to server console',
    receivedBody: req.body
  });
});

module.exports = router;
