// src/services/auth/adapters/adAuthAdapter.js
const ldap = require('ldapjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../../../../config');
const User = require('../../../models/user');
const { createLogger } = require('../../../utils/logger');

const logger = createLogger('adAuthAdapter');

/**
 * Adapter for Active Directory authentication
 */
class ActiveDirectoryAuthAdapter {
  /**
   * Authenticate a user against Active Directory
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} The authenticated user
   */
  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      // Create LDAP client
      const client = ldap.createClient({
        url: config.ad.url,
        reconnect: true
      });
      
      // Handle connection errors
      client.on('error', (err) => {
        logger.error(`LDAP connection error: ${err.message}`);
        client.destroy();
        reject(new Error('LDAP connection error'));
      });

      const userDN = this.buildUserDN(username);
      
      // Bind with user credentials
      client.bind(userDN, password, async (err) => {
        if (err) {
          logger.warn(`LDAP bind failed for user ${username}: ${err.message}`);
          client.destroy();
          resolve(null);
          return;
        }
        
        try {
          // Search for user details
          const userDetails = await this.searchUser(client, username);
          
          if (!userDetails) {
            logger.warn(`User not found in AD: ${username}`);
            client.unbind();
            resolve(null);
            return;
          }
          
          // Get or create user in local database for roles and preferences
          const user = await this.getOrCreateLocalUser(userDetails);
          
          logger.info(`AD authentication successful for user: ${username}`);
          client.unbind();
          resolve(user);
        } catch (error) {
          logger.error(`Error during AD authentication: ${error.message}`);
          client.destroy();
          reject(error);
        }
      });
    });
  }

  /**
   * Build the user DN for binding
   * @param {string} username - The username
   * @returns {string} The user DN
   */
  buildUserDN(username) {
    // Handle different AD username formats (UPN or sAMAccountName)
    if (username.includes('@')) {
      return username; // UPN format
    }
    
    // Base DN from configuration
    const baseDN = config.ad.baseDN;
    
    // For sAMAccountName format
    return `CN=${username},${baseDN}`;
  }

  /**
   * Search for user details in AD
   * @param {Object} client - The LDAP client
   * @param {string} username - The username
   * @returns {Promise<Object>} The user details
   */
  searchUser(client, username) {
    return new Promise((resolve, reject) => {
      const baseDN = config.ad.baseDN;
      let filter;
      
      // Handle different AD username formats
      if (username.includes('@')) {
        filter = `(userPrincipalName=${username})`;
      } else {
        filter = `(sAMAccountName=${username})`;
      }
      
      const options = {
        scope: 'sub',
        filter: filter,
        attributes: ['dn', 'cn', 'sAMAccountName', 'mail', 'memberOf']
      };
      
      client.search(baseDN, options, (err, res) => {
        if (err) {
          logger.error(`LDAP search error: ${err.message}`);
          reject(err);
          return;
        }
        
        let user = null;
        
        res.on('searchEntry', (entry) => {
          user = {
            dn: entry.object.dn,
            username: entry.object.sAMAccountName,
            name: entry.object.cn,
            email: entry.object.mail,
            groups: entry.object.memberOf
          };
        });
        
        res.on('error', (err) => {
          logger.error(`LDAP search result error: ${err.message}`);
          reject(err);
        });
        
        res.on('end', () => {
          resolve(user);
        });
      });
    });
  }

  /**
   * Get or create a local user record for AD users
   * @param {Object} adUser - The AD user details
   * @returns {Promise<Object>} The local user
   */
  async getOrCreateLocalUser(adUser) {
    try {
      // Look for existing user
      let user = await User.findOne({ username: adUser.username });
      
      if (user) {
        // Update user info if needed
        user.email = adUser.email || user.email;
        
        // Map AD groups to roles if needed
        const role = await this.mapGroupToRole(adUser.groups);
        if (role && user.role !== role) {
          user.role = role;
        }
        
        await user.save();
      } else {
        // Create new user
        const role = await this.mapGroupToRole(adUser.groups) || 'user';
        
        user = await User.create({
          username: adUser.username,
          email: adUser.email,
          name: adUser.name,
          role: role,
          authType: 'ad',
          adDN: adUser.dn,
          // No password - we don't store AD passwords
          _id: uuidv4()
        });
      }
      
      logger.info(`Local user record for AD user: ${adUser.username}`);
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      logger.error(`Error creating local user for AD user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map AD groups to local roles
   * @param {Array} groups - The AD groups
   * @returns {Promise<string>} The mapped role
   */
  async mapGroupToRole(groups) {
    if (!groups || !Array.isArray(groups)) {
      return 'user'; // Default role
    }
    
    // Get group mapping from config
    const groupMappings = config.ad.groupMappings || {};
    
    // Map groups to roles based on configuration
    for (const [role, groupPattern] of Object.entries(groupMappings)) {
      const regex = new RegExp(groupPattern);
      if (groups.some(group => regex.test(group))) {
        return role;
      }
    }
    
    // Default role if no mapping found
    return 'user';
  }
}

module.exports = ActiveDirectoryAuthAdapter;
