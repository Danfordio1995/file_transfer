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
