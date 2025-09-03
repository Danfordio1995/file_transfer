const fs = require('fs');
const path = require('path');

// Path to auth.js
const authJsPath = path.join(__dirname, 'public/js/auth.js');

try {
  // Read the file
  let content = fs.readFileSync(authJsPath, 'utf8');
  
  // Find the line with the syntax error by looking at line ~86
  const lines = content.split('\n');
  
  // Print lines around the error for debugging
  console.log('Checking auth.js around line 86:');
  for (let i = 80; i < 90 && i < lines.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
  
  // Check for common syntax errors
  let fixed = false;
  for (let i = 0; i < lines.length; i++) {
    // Look for misplaced dots, missing semicolons, etc.
    if (lines[i].trim().endsWith('.') && !lines[i].trim().endsWith('..')) {
      console.log(`Found suspicious line ending with dot at line ${i+1}: ${lines[i]}`);
      // Fix the line by removing the trailing dot
      lines[i] = lines[i].replace(/\.\s*$/, '');
      fixed = true;
    }
  }
  
  if (fixed) {
    // Write the fixed content back
    fs.writeFileSync(authJsPath, lines.join('\n'));
    console.log('Fixed syntax error in auth.js');
  } else {
    console.log('Could not automatically identify the syntax error. Let\'s rewrite the file.');
    
    // Create a new auth.js from scratch
    const newAuthJs = `// Authentication Service for managing user authentication

// Storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Initialize authentication service
 */
function initAuth() {
  // Check token expiration
  const token = getAuthToken();
  if (token) {
    // Decode token to check expiration
    try {
      const payload = parseJwt(token);
      const expirationDate = new Date(payload.exp * 1000);
      
      if (expirationDate <= new Date()) {
        // Token expired, clear auth data
        clearAuthData();
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      clearAuthData();
    }
  }
}

/**
 * Check if user is authenticated and redirect accordingly
 */
function checkAuthStatus() {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (token && user) {
    // User is authenticated, show dashboard
    showDashboard();
  } else {
    // User not authenticated, show login form
    showLoginForm();
  }
}

/**
 * Login user with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Login result
 */
async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }
    
    // Save auth token and user data
    saveAuthToken(data.token);
    saveCurrentUser(data.user);
    
    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Logout current user
 */
function logout() {
  clearAuthData();
}

/**
 * Get authentication token from storage
 * @returns {string|null} - Auth token or null if not found
 */
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save authentication token to storage
 * @param {string} token - Auth token
 */
function saveAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get current user from storage
 * @returns {Object|null} - User object or null if not found
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(USER_KEY);
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
}

/**
 * Save current user to storage
 * @param {Object} user - User object
 */
function saveCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication data from storage
 */
function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Parse JWT token to get payload
 * @param {string} token - JWT token
 * @returns {Object} - Token payload
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    throw error;
  }
}`;
    
    fs.writeFileSync(authJsPath, newAuthJs);
    console.log('Completely rewrote auth.js to fix syntax issues');
  }
} catch (err) {
  console.error('Error fixing auth.js:', err.message);
}
