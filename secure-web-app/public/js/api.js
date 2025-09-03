// API Service for making requests to the backend

// Base API URL
const API_BASE_URL = '/api';

/**
 * Make an API request with authentication
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request data (for POST/PUT)
 * @returns {Promise} - API response
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add authentication token if available
  const token = getAuthToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add request body for non-GET requests
  if (method !== 'GET' && data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Handle authentication errors
    if (response.status === 401) {
      // Token expired or invalid
      clearAuthData();
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('login')) {
        window.location.reload();
      }
      
      throw new Error('Authentication expired');
    }
    
    // Parse response JSON
    const responseData = await response.json();
    
    // Handle API errors
    if (!response.ok) {
      const errorMessage = responseData.error || 'API request failed';
      throw new Error(errorMessage);
    }
    
    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Fetch available modules for the current user
 * @returns {Promise<Array>} - Available modules
 */
async function fetchModules() {
  try {
    const response = await apiRequest('/modules');
    return response.modules || [];
  } catch (error) {
    console.error('Error fetching modules:', error);
    return [];
  }
}

/**
 * Fetch detailed information for a specific module
 * @param {string} moduleId - Module ID
 * @returns {Promise<Object>} - Module details
 */
async function fetchModuleDetails(moduleId) {
  return apiRequest(`/modules/${moduleId}`);
}

/**
 * Execute a module with parameters
 * @param {string} moduleId - Module ID
 * @param {Object} parameters - Module parameters
 * @returns {Promise<Object>} - Execution result
 */
async function executeModule(moduleId, parameters) {
  return apiRequest(`/modules/${moduleId}/execute`, 'POST', { parameters });
}

/**
 * Fetch all modules (admin only)
 * @returns {Promise<Array>} - All modules
 */
async function fetchAllModules() {
  try {
    const response = await apiRequest('/modules', 'GET');
    return response.modules || [];
  } catch (error) {
    console.error('Error fetching all modules:', error);
    return [];
  }
}

/**
 * Create a new module (admin only)
 * @param {Object} moduleData - Module data
 * @returns {Promise<Object>} - Created module
 */
async function createModule(moduleData) {
  return apiRequest('/modules', 'POST', moduleData);
}

/**
 * Update a module (admin only)
 * @param {string} moduleId - Module ID
 * @param {Object} moduleData - Updated module data
 * @returns {Promise<Object>} - Updated module
 */
async function updateModule(moduleId, moduleData) {
  return apiRequest(`/modules/${moduleId}`, 'PUT', moduleData);
}

/**
 * Delete a module (admin only)
 * @param {string} moduleId - Module ID
 * @returns {Promise<Object>} - Result
 */
async function deleteModule(moduleId) {
  return apiRequest(`/modules/${moduleId}`, 'DELETE');
}

/**
 * Fetch all roles (admin only)
 * @returns {Promise<Array>} - All roles
 */
async function fetchRoles() {
  try {
    const response = await apiRequest('/roles');
    return response.roles || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Register a new user (admin only)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
async function registerUser(userData) {
  return apiRequest('/auth/register', 'POST', userData);
}
