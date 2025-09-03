#!/bin/bash
# create-middleware.sh
# Script to create middleware components

echo "Creating middleware components..."

# Ensure directory exists
mkdir -p src/middleware

# Create authentication middleware
cat > src/middleware/authMiddleware.js << 'EOF'
// src/middleware/authMiddleware.js
const authService = require('../services/auth/authService');
const User = require('../models/user');
const { createLogger } = require('../utils/logger');

const logger = createLogger('authMiddleware');

/**
 * Middleware to verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('Authentication failed: No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  // Verify token
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    logger.warn('Authentication failed: Invalid token');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  
  // Attach user to request
  req.user = decoded;
  
  // Update last login time
  updateLastLogin(decoded.id).catch(err => {
    logger.error(`Error updating last login: ${err.message}`);
  });
  
  next();
}

/**
 * Middleware to check if user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    logger.warn('Admin check failed: No authenticated user');
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    logger.warn(`Admin access denied for user: ${req.user.username}`);
    return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to check if user has manager role or above
 */
function requireManager(req, res, next) {
  if (!req.user) {
    logger.warn('Manager check failed: No authenticated user');
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    logger.warn(`Manager access denied for user: ${req.user.username}`);
    return res.status(403).json({ error: 'Forbidden: Manager privileges required' });
  }
  
  next();
}

/**
 * Middleware to check if user has access to a specific module
 * @param {string} moduleId - The module ID to check access for
 */
function requireModuleAccess(moduleId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Module access check failed: No authenticated user');
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }
      
      // Get the role service
      const roleService = require('../services/roles/roleService');
      
      // Check if user has access to this module
      const hasAccess = await roleService.hasModuleAccess(req.user.role, moduleId);
      
      if (!hasAccess) {
        logger.warn(`Module access denied for user ${req.user.username} to ${moduleId}`);
        return res.status(403).json({ error: 'Forbidden: You do not have access to this module' });
      }
      
      next();
    } catch (error) {
      logger.error(`Error checking module access: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Update the user's last login time
 * @param {string} userId - The user ID
 */
async function updateLastLogin(userId) {
  try {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date()
    });
  } catch (error) {
    logger.error(`Error updating last login: ${error.message}`);
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManager,
  requireModuleAccess
};
EOF

echo "Middleware components created successfully!"
