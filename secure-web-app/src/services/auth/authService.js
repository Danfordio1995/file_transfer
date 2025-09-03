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
