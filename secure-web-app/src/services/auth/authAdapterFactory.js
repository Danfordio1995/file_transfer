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
