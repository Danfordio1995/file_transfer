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
