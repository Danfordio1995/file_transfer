// config/ad.js
/**
 * Configuration for Active Directory authentication
 */
module.exports = {
  // AD server settings
  url: process.env.AD_URL || 'ldap://your-ad-server.com',
  baseDN: process.env.AD_BASE_DN || 'OU=Users,DC=example,DC=com',
  
  // Service account credentials (for querying AD)
  username: process.env.AD_USERNAME || 'service_account@example.com',
  password: process.env.AD_PASSWORD || 'service_account_password',
  
  // Group to role mapping
  // Maps AD group patterns to application roles
  groupMappings: {
    // Default mappings
    'admin': 'CN=Admins,.*DC=example,DC=com',
    'manager': 'CN=Managers,.*DC=example,DC=com',
    'user': 'CN=Users,.*DC=example,DC=com'
  },
  
  // Connection options
  connectionOptions: {
    reconnect: true,
    timeout: 10000,
    connectTimeout: 10000
  },
  
  // Cache settings
  cache: {
    enabled: true,
    ttl: 3600 // 1 hour
  }
};
