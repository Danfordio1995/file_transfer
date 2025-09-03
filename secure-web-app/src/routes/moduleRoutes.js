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
