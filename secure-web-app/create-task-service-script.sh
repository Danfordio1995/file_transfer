#!/bin/bash
# create-task-service.sh
# Script to create task service files for secure script execution

echo "Creating task service files..."

# Ensure directory exists
mkdir -p src/services/tasks

# Create task service
cat > src/services/tasks/taskService.js << 'EOF'
// src/services/tasks/taskService.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const execFilePromise = promisify(execFile);
const config = require('../../../config');
const Module = require('../../models/module');
const { createLogger } = require('../../utils/logger');
const { sanitizeModuleId, validateParameters } = require('../../security/inputValidation');

const logger = createLogger('taskService');

// Maximum script runtime in milliseconds
const MAX_SCRIPT_RUNTIME = config.security.maxScriptRuntimeMs || 30000;

/**
 * Service for secure script execution
 */
class TaskService {
  /**
   * Get all available modules
   * @returns {Promise<Array>} All modules
   */
  async getAllModules() {
    try {
      const modules = await Module.find({ isActive: true }).sort({ name: 1 });
      return modules;
    } catch (error) {
      logger.error(`Error fetching modules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get module by ID
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} The module
   */
  async getModuleById(moduleId) {
    try {
      // Sanitize and validate module ID
      const sanitizedModuleId = sanitizeModuleId(moduleId);
      
      if (!sanitizedModuleId) {
        logger.warn(`Invalid module ID: ${moduleId}`);
        throw new Error('Invalid module ID');
      }
      
      const module = await Module.findOne({ moduleId: sanitizedModuleId, isActive: true });
      
      if (!module) {
        logger.warn(`Module not found: ${sanitizedModuleId}`);
        throw new Error(`Module not found: ${sanitizedModuleId}`);
      }
      
      return module;
    } catch (error) {
      logger.error(`Error fetching module ${moduleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a module script with parameters
   * @param {string} moduleId - The module ID
   * @param {Object} parameters - The script parameters
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The execution result
   */
  async executeScript(moduleId, parameters, userId) {
    try {
      // Get module details
      const module = await this.getModuleById(moduleId);
      
      // Verify the script file exists
      const scriptPath = this.getScriptPath(module.scriptName);
      
      if (!scriptPath) {
        logger.error(`Script not found for module ${moduleId}: ${module.scriptName}`);
        throw new Error(`Script not found: ${module.scriptName}`);
      }
      
      // Validate parameters based on module requirements
      const validatedParams = validateParameters(parameters, module.parameterDefinitions);
      
      // Execute the script with validated parameters
      logger.info(`Executing script for module ${moduleId}: ${scriptPath}`);
      
      // Convert parameters to command-line arguments
      const args = this.paramsToArgs(validatedParams);
      
      // Execute script with timeout
      const result = await this.executeScriptWithTimeout(scriptPath, args, MAX_SCRIPT_RUNTIME, userId);
      
      // Log execution result
      logger.info(`Script execution for module ${moduleId} completed successfully`);
      
      return {
        success: true,
        moduleId,
        scriptName: module.scriptName,
        result: result.stdout,
        executionTime: result.executionTime
      };
    } catch (error) {
      logger.error(`Error executing script for module ${moduleId}: ${error.message}`);
      
      return {
        success: false,
        moduleId,
        error: error.message,
        stderr: error.stderr || null
      };
    }
  }

  /**
   * Get the full path to a script
   * @param {string} scriptName - The script name
   * @returns {string|null} The script path or null if not found
   */
  getScriptPath(scriptName) {
    // Security: Sanitize script name to prevent path traversal
    const sanitizedName = scriptName.replace(/[^a-zA-Z0-9_.-]/g, '');
    
    if (sanitizedName !== scriptName) {
      logger.warn(`Attempted path traversal in script name: ${scriptName}`);
      return null;
    }
    
    const scriptPath = path.join(process.cwd(), 'scripts', sanitizedName);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      logger.warn(`Script not found: ${scriptPath}`);
      return null;
    }
    
    return scriptPath;
  }

  /**
   * Convert parameters object to command-line arguments array
   * @param {Object} params - The parameters object
   * @returns {Array} The command-line arguments
   */
  paramsToArgs(params) {
    const args = [];
    
    // Convert object params to --key=value format
    for (const [key, value] of Object.entries(params)) {
      // Skip null or undefined values
      if (value === null || value === undefined) {
        continue;
      }
      
      // Format based on type
      if (typeof value === 'boolean') {
        // For boolean flags, just include the flag if true
        if (value === true) {
          args.push(`--${key}`);
        }
      } else if (Array.isArray(value)) {
        // For arrays, use multiple arguments
        for (const item of value) {
          args.push(`--${key}=${item}`);
        }
      } else {
        // For strings and numbers
        args.push(`--${key}=${value}`);
      }
    }
    
    return args;
  }

  /**
   * Execute a script with a timeout
   * @param {string} scriptPath - The script path
   * @param {Array} args - The command-line arguments
   * @param {number} timeout - The timeout in milliseconds
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The execution result
   */
  async executeScriptWithTimeout(scriptPath, args, timeout, userId) {
    // Record start time
    const startTime = Date.now();
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Script execution timed out after ${timeout}ms`));
      }, timeout);
    });
    
    // Add user ID to environment for logging purposes
    const env = {
      ...process.env,
      USER_ID: userId,
      SCRIPT_TIMEOUT_MS: timeout.toString()
    };
    
    try {
      // Race between script execution and timeout
      const result = await Promise.race([
        execFilePromise(scriptPath, args, { 
          timeout,
          env,
          // Security: No shell
          shell: false
        }),
        timeoutPromise
      ]);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      return {
        ...result,
        executionTime
      };
    } catch (error) {
      // Calculate execution time even for errors
      const executionTime = Date.now() - startTime;
      
      // Enhance error with execution time and stderr if available
      error.executionTime = executionTime;
      
      throw error;
    }
  }
}

module.exports = new TaskService();
EOF

echo "Task service files created successfully!"
