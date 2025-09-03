// Authentication Service for managing user authentication

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
}