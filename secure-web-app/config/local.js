// config/local.js
/**
 * Configuration for local authentication
 */
module.exports = {
  // Password requirements
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  
  // Account lockout policy
  accountLockout: {
    enabled: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  }
};
