#!/bin/bash
# create-routes.sh
# Script to create API routes for the secure web application

echo "Creating API routes..."

# Ensure directory exists
mkdir -p src/routes

# Create authentication routes
cat > src/routes/authRoutes.js << 'EOF'
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

module.exports = router;
EOF

# Create module routes
cat > src/routes/moduleRoutes.js << 'EOF'
// src/routes/moduleRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Module = require('../models/module');
const roleService = require('../services/roles/roleService');
const taskService = require('../services/tasks/taskService');
const { authenticateToken, requireAdmin, requireModuleAccess } = require('../middleware/authMiddleware');
const { sanitizeModuleId } = require('../security/inputValidation');
const { createLogger } = require('../utils/logger');

const logger = createLogger('moduleRoutes');

/**
 * @route GET /api/modules
 * @desc Get all modules accessible by the current user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get all modules
    const allModules = await taskService.getAllModules();
    
    // Get accessible modules for user's role
    const accessibleModuleIds = await roleService.getAccessibleModules(req.user.role);
    
    // Filter modules based on user's access
    const modules = allModules.filter(module => 
      accessibleModuleIds.includes(module.moduleId)
    ).map(module => ({
      id: module.moduleId,
      name: module.name,
      description: module.description,
      tooltip: module.tooltip,
      icon: module.icon,
      parameters: module.parameterDefinitions
    }));
    
    res.json({ modules });
  } catch (error) {
    logger.error(`Error fetching modules: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/modules/:moduleId
 * @desc Get module details
 * @access Private (requires module access)
 */
router.get('/:moduleId', [
  authenticateToken,
  param('moduleId').custom(value => {
    const sanitized = sanitizeModuleId(value);
    if (!sanitized) {
      throw new Error('Invalid module ID format');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const moduleId = sanitizeModuleId(req.params.moduleId);
    
    // Check if user has access to this module
    const hasAccess = await roleService.hasModuleAccess(req.user.role, moduleId);
    
    if (!hasAccess) {
      logger.warn(`Module access denied for user ${req.user.username} to ${moduleId}`);
      return res.status(403).json({ error: 'Access denied to this module' });
    }
    
    // Get module details
    const module = await taskService.getModuleById(moduleId);
    
    res.json({
      id: module.moduleId,
      name: module.name,
      description: module.description,
      tooltip: module.tooltip,
      icon: module.icon,
      parameters: module.parameterDefinitions
    });
  } catch (error) {
    logger.error(`Error fetching module ${req.params.moduleId}: ${error.message}`);
    
    if (error.message.includes('Module not found')) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/modules/:moduleId/execute
 * @desc Execute a module script
 * @access Private (requires module access)
 */
router.post('/:moduleId/execute', [
  authenticateToken,
  param('moduleId').custom(value => {
    const sanitized = sanitizeModuleId(value);
    if (!sanitized) {
      throw new Error('Invalid module ID format');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const moduleId = sanitizeModuleId(req.params.moduleId);
    
    // Middleware to check module access
    await requireModuleAccess(moduleId)(req, res, async () => {
      try {
        // Execute the script
        const result = await taskService.executeScript(
          moduleId,
          req.body.parameters || {},
          req.user.id
        );
        
        res.json(result);
      } catch (error) {
        logger.error(`Error executing module ${moduleId}: ${error.message}`);
        res.status(500).json({ 
          error: 'Error executing module',
          details: error.message
        });
      }
    });
  } catch (error) {
    logger.error(`Error in module execution route ${req.params.moduleId}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/modules
 * @desc Create a new module
 * @access Admin only
 */
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('moduleId').matches(/^[a-z0-9_]+$/).withMessage('Module ID can only contain lowercase letters, numbers and underscores'),
  body('name').notEmpty().withMessage('Module name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('scriptName').notEmpty().withMessage('Script name is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if module already exists
    const existingModule = await Module.findOne({ moduleId: req.body.moduleId });
    
    if (existingModule) {
      return res.status(400).json({ error: 'Module ID already exists' });
    }
    
    // Create new module
    const newModule = await Module.create({
      moduleId: req.body.moduleId,
      name: req.body.name,
      description: req.body.description,
      tooltip: req.body.tooltip,
      icon: req.body.icon || 'module',
      scriptName: req.body.scriptName,
      parameterDefinitions: req.body.parameterDefinitions || [],
      createdBy: req.user.id
    });
    
    logger.info(`Module created: ${newModule.moduleId}`);
    
    res.status(201).json({
      message: 'Module created successfully',
      module: {
        id: newModule.moduleId,
        name: newModule.name
      }
    });
  } catch (error) {
    logger.error(`Error creating module: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/modules/:moduleId
 * @desc Update a module
 * @access Admin only
 */
router.put('/:moduleId', [
  authenticateToken,
  requireAdmin,
  param('moduleId').custom(value => {
    const sanitized = sanitizeModuleId(value);
    if (!sanitized) {
      throw new Error('Invalid module ID format');
    }
    return true;
  }),
  body('name').optional().notEmpty().withMessage('Module name cannot be empty'),
  body('scriptName').optional().notEmpty().withMessage('Script name cannot be empty')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const moduleId = sanitizeModuleId(req.params.moduleId);
    
    // Update module
    const updateData = {};
    
    // Only update fields that are provided
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.tooltip !== undefined) updateData.tooltip = req.body.tooltip;
    if (req.body.icon) updateData.icon = req.body.icon;
    if (req.body.scriptName) updateData.scriptName = req.body.scriptName;
    if (req.body.parameterDefinitions) updateData.parameterDefinitions = req.body.parameterDefinitions;
    if (req.body.isActive !== undefined) updateData.isActive = !!req.body.isActive;
    
    const updatedModule = await Module.findOneAndUpdate(
      { moduleId },
      updateData,
      { new: true }
    );
    
    if (!updatedModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    logger.info(`Module updated: ${moduleId}`);
    
    res.json({
      message: 'Module updated successfully',
      module: {
        id: updatedModule.moduleId,
        name: updatedModule.name,
        isActive: updatedModule.isActive
      }
    });
  } catch (error) {
    logger.error(`Error updating module ${req.params.moduleId}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route DELETE /api/modules/:moduleId
 * @desc Delete a module
 * @access Admin only
 */
router.delete('/:moduleId', [
  authenticateToken,
  requireAdmin,
  param('moduleId').custom(value => {
    const sanitized = sanitizeModuleId(value);
    if (!sanitized) {
      throw new Error('Invalid module ID format');
    }
    return true;
  })
], async (req, res) => {
  try {
    const moduleId = sanitizeModuleId(req.params.moduleId);
    
    // Delete module
    const result = await Module.deleteOne({ moduleId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    logger.info(`Module deleted: ${moduleId}`);
    
    res.json({
      message: 'Module deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting module ${req.params.moduleId}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
EOF

# Create role routes
cat > src/routes/roleRoutes.js << 'EOF'
// src/routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const roleService = require('../services/roles/roleService');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { createLogger } = require('../utils/logger');

const logger = createLogger('roleRoutes');

/**
 * @route GET /api/roles
 * @desc Get all roles
 * @access Admin only
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json({ roles });
  } catch (error) {
    logger.error(`Error fetching roles: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/roles/:name
 * @desc Get role by name
 * @access Admin only
 */
router.get('/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const role = await roleService.getRoleByName(req.params.name);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ role });
  } catch (error) {
    logger.error(`Error fetching role ${req.params.name}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/roles
 * @desc Create a new role
 * @access Admin only
 */
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name').isString().isLength({ min: 2, max: 50 }).withMessage('Role name must be 2-50 characters'),
  body('description').isString().notEmpty().withMessage('Description is required'),
  body('level').isInt({ min: 0, max: 100 }).withMessage('Level must be 0-100')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Create role
    const roleData = {
      name: req.body.name,
      description: req.body.description,
      level: req.body.level,
      permissions: req.body.permissions || []
    };
    
    const newRole = await roleService.createRole(roleData);
    
    logger.info(`Role created: ${newRole.name}`);
    
    res.status(201).json({
      message: 'Role created successfully',
      role: {
        name: newRole.name,
        level: newRole.level
      }
    });
  } catch (error) {
    logger.error(`Error creating role: ${error.message}`);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/roles/:name
 * @desc Update a role
 * @access Admin only
 */
router.put('/:name', [
  authenticateToken,
  requireAdmin,
  body('description').optional().isString().notEmpty().withMessage('Description cannot be empty'),
  body('level').optional().isInt({ min: 0, max: 100 }).withMessage('Level must be 0-100')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Prevent modification of core roles' level
    if (['admin', 'manager', 'user'].includes(req.params.name) && req.body.level !== undefined) {
      return res.status(400).json({ 
        error: 'Cannot modify level of core roles' 
      });
    }
    
    // Update role
    const updateData = {};
    
    // Only update fields that are provided
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.level !== undefined) updateData.level = req.body.level;
    
    const updatedRole = await roleService.updateRole(req.params.name, updateData);
    
    logger.info(`Role updated: ${updatedRole.name}`);
    
    res.json({
      message: 'Role updated successfully',
      role: {
        name: updatedRole.name,
        level: updatedRole.level
      }
    });
  } catch (error) {
    logger.error(`Error updating role ${req.params.name}: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route DELETE /api/roles/:name
 * @desc Delete a role
 * @access Admin only
 */
router.delete('/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await roleService.deleteRole(req.params.name);
    
    logger.info(`Role deleted: ${req.params.name}`);
    
    res.json({
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting role ${req.params.name}: ${error.message}`);
    
    if (error.message.includes('Cannot delete core role')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/roles/:name/modules/:moduleId
 * @desc Add module permission to role
 * @access Admin only
 */
router.post('/:name/modules/:moduleId', [
  authenticateToken,
  requireAdmin,
  body('description').isString().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const roleName = req.params.name;
    const moduleId = req.params.moduleId;
    const description = req.body.description;
    
    const updatedRole = await roleService.addModulePermission(roleName, moduleId, description);
    
    logger.info(`Module permission added: ${roleName} -> ${moduleId}`);
    
    res.json({
      message: 'Module permission added successfully',
      role: {
        name: updatedRole.name,
        permissions: updatedRole.permissions
      }
    });
  } catch (error) {
    logger.error(`Error adding module permission: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route DELETE /api/roles/:name/modules/:moduleId
 * @desc Remove module permission from role
 * @access Admin only
 */
router.delete('/:name/modules/:moduleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roleName = req.params.name;
    const moduleId = req.params.moduleId;
    
    const updatedRole = await roleService.removeModulePermission(roleName, moduleId);
    
    logger.info(`Module permission removed: ${roleName} -> ${moduleId}`);
    
    res.json({
      message: 'Module permission removed successfully',
      role: {
        name: updatedRole.name,
        permissions: updatedRole.permissions
      }
    });
  } catch (error) {
    logger.error(`Error removing module permission: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
EOF

echo "API routes created successfully!"