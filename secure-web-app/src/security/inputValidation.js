// src/security/inputValidation.js
const { createLogger } = require('../utils/logger');

const logger = createLogger('inputValidation');

/**
 * Sanitize a module ID
 * @param {string} moduleId - The module ID to sanitize
 * @returns {string|null} The sanitized module ID or null if invalid
 */
function sanitizeModuleId(moduleId) {
  if (!moduleId || typeof moduleId !== 'string') {
    return null;
  }
  
  // Whitelist approach: Only allow lowercase letters, numbers, and underscores
  const sanitized = moduleId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  // Verify the moduleId hasn't changed (was already valid)
  if (sanitized !== moduleId.trim().toLowerCase()) {
    logger.warn(`Module ID sanitized: ${moduleId} -> ${sanitized}`);
  }
  
  return sanitized;
}

/**
 * Validate parameters against definitions
 * @param {Object} params - The parameters to validate
 * @param {Array} definitions - The parameter definitions
 * @returns {Object} The validated parameters
 */
function validateParameters(params, definitions) {
  const validated = {};
  const errors = [];
  
  // Convert null/undefined params to empty object
  params = params || {};
  
  // Validate each parameter against its definition
  definitions.forEach(def => {
    const name = def.name;
    const value = params[name];
    
    // Check required parameters
    if (def.required && (value === undefined || value === null)) {
      errors.push(`Missing required parameter: ${name}`);
      return;
    }
    
    // If parameter is not provided but has default, use default
    if ((value === undefined || value === null) && def.defaultValue !== undefined) {
      validated[name] = def.defaultValue;
      return;
    }
    
    // Skip optional parameters that aren't provided
    if (value === undefined || value === null) {
      return;
    }
    
    // Type validation
    const validatedValue = validateParameterType(name, value, def.type);
    if (validatedValue.error) {
      errors.push(validatedValue.error);
      return;
    }
    
    // Pattern validation (for strings)
    if (def.type === 'string' && def.validationPattern && validatedValue.value) {
      const regexp = new RegExp(def.validationPattern);
      if (!regexp.test(validatedValue.value)) {
        errors.push(def.validationMessage || `Invalid format for parameter: ${name}`);
        return;
      }
    }
    
    // Add validated parameter to result
    validated[name] = validatedValue.value;
  });
  
  // If any validation errors, throw exception
  if (errors.length > 0) {
    const errorMessage = errors.join('; ');
    logger.warn(`Parameter validation failed: ${errorMessage}`);
    throw new Error(`Invalid parameters: ${errorMessage}`);
  }
  
  return validated;
}

/**
 * Validate a parameter's type
 * @param {string} name - The parameter name
 * @param {any} value - The parameter value
 * @param {string} type - The expected type
 * @returns {Object} The validation result
 */
function validateParameterType(name, value, type) {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { error: `Parameter ${name} must be a string` };
      }
      // Sanitize string
      return { value: sanitizeString(value) };
      
    case 'number':
      if (typeof value === 'string') {
        // Try to convert string to number
        const num = Number(value);
        if (isNaN(num)) {
          return { error: `Parameter ${name} must be a valid number` };
        }
        return { value: num };
      } else if (typeof value !== 'number' || isNaN(value)) {
        return { error: `Parameter ${name} must be a number` };
      }
      return { value };
      
    case 'boolean':
      if (typeof value === 'string') {
        // Convert string to boolean
        const lower = value.toLowerCase();
        if (lower === 'true') return { value: true };
        if (lower === 'false') return { value: false };
        return { error: `Parameter ${name} must be a boolean (true/false)` };
      } else if (typeof value !== 'boolean') {
        return { error: `Parameter ${name} must be a boolean` };
      }
      return { value };
      
    case 'array':
      if (typeof value === 'string') {
        // Try to parse string as JSON array
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            return { error: `Parameter ${name} must be an array` };
          }
          return { value: parsed };
        } catch {
          // If not JSON, split by comma
          return { value: value.split(',').map(v => v.trim()) };
        }
      } else if (!Array.isArray(value)) {
        return { error: `Parameter ${name} must be an array` };
      }
      // Sanitize array items
      return { 
        value: value.map(item => 
          typeof item === 'string' ? sanitizeString(item) : item
        ) 
      };
      
    default:
      return { error: `Unsupported parameter type: ${type}` };
  }
}

/**
 * Sanitize a string value
 * @param {string} value - The string to sanitize
 * @returns {string} The sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Remove control characters and standardize line endings
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .replace(/\r\n/g, '\n')                            // Standardize line endings
    .trim();                                           // Remove leading/trailing whitespace
}

module.exports = {
  sanitizeModuleId,
  validateParameters,
  sanitizeString
};
