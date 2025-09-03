#!/bin/bash
# create-auth-service.sh
# Script to create authentication service files

echo "Creating authentication service files..."

# Ensure directories exist
mkdir -p src/services/auth/adapters

# Create main auth service
cat > src/services/auth/authService.js << 'EOF'
// src/services/auth/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../../config');
const User = require('../../models/user');
const { createLogger } = require('../../utils/logger');
const authAdapterFactory = require('./authAdapterFactory');

const logger = createLogger('authService');

/**
 * Authentication service that handles user authentication regardless of the backend
 * (local database or Active Directory)
 */
class AuthService {
  constructor() {
    // Create the appropriate authentication adapter based on config
    this.authAdapter = authAdapterFactory.createAuthAdapter();
  }

  /**
   * Authenticate a user with username and password
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} The authenticated user with token
   */
  async authenticate(username, password) {
    try {
      // Use the adapter to authenticate the user
      const user = await this.authAdapter.authenticate(username, password);
      
      if (!user) {
        logger.warn(`Failed authentication attempt for user: ${username}`);
        return null;
      }
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      logger.info(`User authenticated successfully: ${username}`);
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Generate a JWT token for the authenticated user
   * @param {Object} user - The user object
   * @returns {string} The JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    return jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Verify a JWT token
   * @param {string} token - The JWT token
   * @returns {Object} The decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Register a new user (only for local authentication mode)
   * @param {Object} userData - The user data
   * @returns {Promise<Object>} The created user
   */
  async registerUser(userData) {
    // Only allow registration in local mode
    if (config.auth.mode !== 'local') {
      logger.warn('Attempted to register user in non-local auth mode');
      throw new Error('User registration is only available in local authentication mode');
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        logger.warn(`Registration attempt with existing username: ${userData.username}`);
        throw new Error('Username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user
      const newUser = await User.create({
        username: userData.username,
        password: hashedPassword,
        email: userData.email,
        role: userData.role || 'user' // Default role
      });

      logger.info(`New user registered: ${userData.username}`);
      return {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      };
    } catch (error) {
      logger.error(`User registration error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AuthService();
EOF

# Create auth adapter factory
cat > src/services/auth/authAdapterFactory.js << 'EOF'
// src/services/auth/authAdapterFactory.js
const config = require('../../../config');
const LocalAuthAdapter = require('./adapters/localAuthAdapter');
const ActiveDirectoryAuthAdapter = require('./adapters/adAuthAdapter');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('authAdapterFactory');

/**
 * Factory for creating the appropriate authentication adapter
 */
class AuthAdapterFactory {
  /**
   * Create an authentication adapter based on the configuration
   * @returns {Object} The authentication adapter
   */
  createAuthAdapter() {
    const authMode = config.auth.mode;
    
    logger.info(`Creating auth adapter for mode: ${authMode}`);
    
    switch (authMode) {
      case 'local':
        return new LocalAuthAdapter();
      case 'ad':
        return new ActiveDirectoryAuthAdapter();
      default:
        logger.error(`Invalid auth mode: ${authMode}`);
        throw new Error(`Invalid auth mode: ${authMode}`);
    }
  }
}

module.exports = new AuthAdapterFactory();
EOF

# Create local auth adapter
cat > src/services/auth/adapters/localAuthAdapter.js << 'EOF'
// src/services/auth/adapters/localAuthAdapter.js
const bcrypt = require('bcryptjs');
const User = require('../../../models/user');
const { createLogger } = require('../../../utils/logger');

const logger = createLogger('localAuthAdapter');

/**
 * Adapter for local database authentication
 */
class LocalAuthAdapter {
  /**
   * Authenticate a user against the local database
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} The authenticated user
   */
  async authenticate(username, password) {
    try {
      // Find user by username
      const user = await User.findOne({ username });
      
      if (!user) {
        logger.warn(`User not found: ${username}`);
        return null;
      }
      
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        logger.warn(`Invalid password for user: ${username}`);
        return null;
      }
      
      logger.info(`Local authentication successful for user: ${username}`);
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      logger.error(`Local authentication error: ${error.message}`);
      throw new Error('Authentication failed');
    }
  }
}

module.exports = LocalAuthAdapter;
EOF

# Create Active Directory auth adapter
cat > src/services/auth/adapters/adAuthAdapter.js << 'EOF'
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
EOF

echo "Authentication service files created successfully!"
