#!/bin/bash
# create-role-service.sh
# Script to create role service files

echo "Creating role service files..."

# Ensure directory exists
mkdir -p src/services/roles

# Create role service
cat > src/services/roles/roleService.js << 'EOF'
// src/services/roles/roleService.js
const Role = require('../../models/role');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('roleService');

/**
 * Service for managing roles and permissions
 */
class RoleService {
  /**
   * Get all roles
   * @returns {Promise<Array>} All roles
   */
  async getAllRoles() {
    try {
      const roles = await Role.find({}).sort({ level: 1 });
      return roles;
    } catch (error) {
      logger.error(`Error fetching roles: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get role by name
   * @param {string} roleName - The role name
   * @returns {Promise<Object>} The role
   */
  async getRoleByName(roleName) {
    try {
      const role = await Role.findOne({ name: roleName });
      return role;
    } catch (error) {
      logger.error(`Error fetching role ${roleName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get modules accessible by a role
   * @param {string} roleName - The role name
   * @returns {Promise<Array>} Modules accessible by the role
   */
  async getAccessibleModules(roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      
      if (!role) {
        logger.warn(`Role not found: ${roleName}`);
        return [];
      }
      
      // Get the role hierarchy (all roles at or below this role's level)
      const roles = await Role.find({ level: { $gte: role.level } });
      
      // Collect all permissions from these roles
      const modules = new Set();
      roles.forEach(role => {
        role.permissions.forEach(permission => {
          modules.add(permission.moduleId);
        });
      });
      
      logger.info(`Accessible modules for ${roleName}: ${Array.from(modules).join(', ')}`);
      return Array.from(modules);
    } catch (error) {
      logger.error(`Error fetching accessible modules for ${roleName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a role has access to a specific module
   * @param {string} roleName - The role name
   * @param {string} moduleId - The module ID
   * @returns {Promise<boolean>} Whether the role has access
   */
  async hasModuleAccess(roleName, moduleId) {
    try {
      const modules = await this.getAccessibleModules(roleName);
      return modules.includes(moduleId);
    } catch (error) {
      logger.error(`Error checking module access for ${roleName} to ${moduleId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Create a new role
   * @param {Object} roleData - The role data
   * @returns {Promise<Object>} The created role
   */
  async createRole(roleData) {
    try {
      // Check if role already exists
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        logger.warn(`Role already exists: ${roleData.name}`);
        throw new Error(`Role already exists: ${roleData.name}`);
      }
      
      const newRole = await Role.create(roleData);
      logger.info(`Role created: ${newRole.name}`);
      
      return newRole;
    } catch (error) {
      logger.error(`Error creating role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a role
   * @param {string} roleName - The role name
   * @param {Object} roleData - The new role data
   * @returns {Promise<Object>} The updated role
   */
  async updateRole(roleName, roleData) {
    try {
      const updatedRole = await Role.findOneAndUpdate(
        { name: roleName },
        roleData,
        { new: true }
      );
      
      if (!updatedRole) {
        logger.warn(`Role not found: ${roleName}`);
        throw new Error(`Role not found: ${roleName}`);
      }
      
      logger.info(`Role updated: ${roleName}`);
      return updatedRole;
    } catch (error) {
      logger.error(`Error updating role ${roleName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a role
   * @param {string} roleName - The role name
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteRole(roleName) {
    try {
      // Prevent deletion of core roles
      if (['admin', 'manager', 'user'].includes(roleName)) {
        logger.warn(`Cannot delete core role: ${roleName}`);
        throw new Error(`Cannot delete core role: ${roleName}`);
      }
      
      const result = await Role.deleteOne({ name: roleName });
      
      if (result.deletedCount === 0) {
        logger.warn(`Role not found: ${roleName}`);
        throw new Error(`Role not found: ${roleName}`);
      }
      
      logger.info(`Role deleted: ${roleName}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting role ${roleName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a module permission to a role
   * @param {string} roleName - The role name
   * @param {string} moduleId - The module ID
   * @param {string} description - The module description
   * @returns {Promise<Object>} The updated role
   */
  async addModulePermission(roleName, moduleId, description) {
    try {
      const role = await this.getRoleByName(roleName);
      
      if (!role) {
        logger.warn(`Role not found: ${roleName}`);
        throw new Error(`Role not found: ${roleName}`);
      }
      
      // Check if permission already exists
      const existingPermission = role.permissions.find(p => p.moduleId === moduleId);
      
      if (existingPermission) {
        logger.warn(`Permission already exists for ${roleName} to ${moduleId}`);
        return role;
      }
      
      // Add new permission
      role.permissions.push({
        moduleId,
        description
      });
      
      await role.save();
      logger.info(`Added module permission for ${roleName} to ${moduleId}`);
      
      return role;
    } catch (error) {
      logger.error(`Error adding module permission for ${roleName} to ${moduleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a module permission from a role
   * @param {string} roleName - The role name
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} The updated role
   */
  async removeModulePermission(roleName, moduleId) {
    try {
      const role = await this.getRoleByName(roleName);
      
      if (!role) {
        logger.warn(`Role not found: ${roleName}`);
        throw new Error(`Role not found: ${roleName}`);
      }
      
      // Filter out the permission
      role.permissions = role.permissions.filter(p => p.moduleId !== moduleId);
      
      await role.save();
      logger.info(`Removed module permission for ${roleName} to ${moduleId}`);
      
      return role;
    } catch (error) {
      logger.error(`Error removing module permission for ${roleName} to ${moduleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all module permissions
   * @returns {Promise<Array>} All module permissions
   */
  async getAllModulePermissions() {
    try {
      const roles = await this.getAllRoles();
      
      // Collect all unique module permissions
      const modulePermissions = new Map();
      
      roles.forEach(role => {
        role.permissions.forEach(permission => {
          if (!modulePermissions.has(permission.moduleId)) {
            modulePermissions.set(permission.moduleId, {
              moduleId: permission.moduleId,
              description: permission.description
            });
          }
        });
      });
      
      return Array.from(modulePermissions.values());
    } catch (error) {
      logger.error(`Error fetching all module permissions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new RoleService();
EOF

echo "Role service files created successfully!"