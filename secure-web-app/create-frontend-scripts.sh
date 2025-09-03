#!/bin/bash
# create-frontend.sh
# Script to create frontend JavaScript files

echo "Creating frontend JavaScript files..."

# Ensure directories exist
mkdir -p public/js
mkdir -p public/css
mkdir -p public/img

# Create authentication service for frontend
cat > public/js/auth.js << 'EOF'
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
EOF

# Create API service for frontend
cat > public/js/api.js << 'EOF'
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
EOF

# Create main JavaScript file for frontend
cat > public/js/main.js << 'EOF'
// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the authentication system
  initAuth();
  
  // Setup event listeners for UI interactions
  setupEventListeners();
  
  // Check if user is already logged in
  checkAuthStatus();
});

// Setup event listeners
function setupEventListeners() {
  // Login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Module panel close button
  const closeModuleBtn = document.getElementById('closeModuleBtn');
  if (closeModuleBtn) {
    closeModuleBtn.addEventListener('click', () => {
      document.getElementById('modulePanel').classList.add('hidden');
    });
  }
  
  // Execute module button
  const executeModuleBtn = document.getElementById('executeModuleBtn');
  if (executeModuleBtn) {
    executeModuleBtn.addEventListener('click', executeCurrentModule);
  }
  
  // Admin tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Show selected tab content
      document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
      });
      document.getElementById(`${tabName}Tab`).classList.add('active');
    });
  });
}

// UI State management
let currentModuleId = null;

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginError = document.getElementById('loginError');
  
  try {
    loginError.textContent = '';
    
    const result = await login(username, password);
    
    if (result.success) {
      showDashboard();
    } else {
      loginError.textContent = result.error || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = 'An error occurred during login';
  }
}

// Handle logout button click
function handleLogout() {
  logout();
  showLoginForm();
}

// Show the dashboard after successful login
async function showDashboard() {
  document.getElementById('loginContainer').classList.add('hidden');
  document.getElementById('dashboardContainer').classList.remove('hidden');
  
  // Show admin panel if user is admin
  const user = getCurrentUser();
  if (user && user.role === 'admin') {
    document.getElementById('adminContainer').classList.remove('hidden');
    loadAdminData();
  } else {
    document.getElementById('adminContainer').classList.add('hidden');
  }
  
  // Update user info in header
  const userInfoElement = document.getElementById('username');
  const userRoleElement = document.getElementById('userRole');
  
  if (user) {
    userInfoElement.textContent = user.username;
    userRoleElement.textContent = user.role;
  }
  
  // Load available modules
  await loadModules();
}

// Show the login form
function showLoginForm() {
  document.getElementById('dashboardContainer').classList.add('hidden');
  document.getElementById('adminContainer').classList.add('hidden');
  document.getElementById('loginContainer').classList.remove('hidden');
  
  // Clear form fields
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').textContent = '';
}

// Load and display available modules for the current user
async function loadModules() {
  try {
    const modules = await fetchModules();
    
    const moduleGrid = document.getElementById('moduleGrid');
    moduleGrid.innerHTML = '';
    
    if (modules.length === 0) {
      moduleGrid.innerHTML = '<p>No modules available for your role.</p>';
      return;
    }
    
    modules.forEach(module => {
      const moduleCard = document.createElement('div');
      moduleCard.className = 'module-card';
      moduleCard.setAttribute('data-module-id', module.id);
      moduleCard.setAttribute('title', module.tooltip || module.description);
      
      moduleCard.innerHTML = `
        <i class="fas fa-${module.icon || 'cogs'}"></i>
        <h3>${module.name}</h3>
        <p>${module.description}</p>
      `;
      
      moduleCard.addEventListener('click', () => {
        openModule(module.id);
      });
      
      moduleGrid.appendChild(moduleCard);
    });
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

// Open a module for execution
async function openModule(moduleId) {
  try {
    const module = await fetchModuleDetails(moduleId);
    
    currentModuleId = moduleId;
    
    // Update module panel
    document.getElementById('moduleName').textContent = module.name;
    document.getElementById('moduleDescription').textContent = module.description;
    
    // Build parameter form
    const parameterForm = document.getElementById('parameterForm');
    parameterForm.innerHTML = '';
    
    if (module.parameters && module.parameters.length > 0) {
      module.parameters.forEach(param => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `param-${param.name}`);
        label.textContent = `${param.description}${param.required ? ' *' : ''}`;
        
        let input;
        
        // Create appropriate input based on parameter type
        switch (param.type) {
          case 'boolean':
            input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `param-${param.name}`;
            input.name = param.name;
            if (param.defaultValue === true) {
              input.checked = true;
            }
            break;
            
          case 'number':
            input = document.createElement('input');
            input.type = 'number';
            input.id = `param-${param.name}`;
            input.name = param.name;
            if (param.defaultValue !== null) {
              input.value = param.defaultValue;
            }
            break;
            
          case 'array':
            input = document.createElement('textarea');
            input.id = `param-${param.name}`;
            input.name = param.name;
            input.placeholder = 'Enter comma-separated values';
            if (param.defaultValue && Array.isArray(param.defaultValue)) {
              input.value = param.defaultValue.join(', ');
            }
            break;
            
          default: // string and others
            input = document.createElement('input');
            input.type = 'text';
            input.id = `param-${param.name}`;
            input.name = param.name;
            if (param.defaultValue !== null) {
              input.value = param.defaultValue;
            }
            break;
        }
        
        if (param.required) {
          input.required = true;
        }
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        parameterForm.appendChild(formGroup);
      });
    } else {
      parameterForm.innerHTML = '<p>This module has no parameters.</p>';
    }
    
    // Clear previous results
    document.getElementById('executionResults').textContent = '';
    document.getElementById('executionError').textContent = '';
    document.getElementById('executionError').classList.add('hidden');
    
    // Show the module panel
    document.getElementById('modulePanel').classList.remove('hidden');
  } catch (error) {
    console.error('Error opening module:', error);
  }
}

// Execute the current module
async function executeCurrentModule() {
  if (!currentModuleId) return;
  
  try {
    // Collect parameters
    const parameters = {};
    const parameterForm = document.getElementById('parameterForm');
    
    // Get all inputs in the parameter form
    const inputs = parameterForm.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      let value;
      
      // Handle different input types
      if (input.type === 'checkbox') {
        value = input.checked;
      } else if (input.type === 'number') {
        value = parseFloat(input.value);
      } else if (input.tagName === 'TEXTAREA' && input.name) {
        // Handle arrays
        value = input.value.split(',').map(item => item.trim());
      } else {
        value = input.value;
      }
      
      if (input.name) {
        parameters[input.name] = value;
      }
    });
    
    // Show loading state
    document.getElementById('executeModuleBtn').disabled = true;
    document.getElementById('executeModuleBtn').textContent = 'Executing...';
    document.getElementById('executionResults').textContent = 'Executing module...';
    document.getElementById('executionError').classList.add('hidden');
    
    // Execute the module
    const result = await executeModule(currentModuleId, parameters);
    
    // Update UI with results
    document.getElementById('executeModuleBtn').disabled = false;
    document.getElementById('executeModuleBtn').textContent = 'Execute';
    
    if (result.success) {
      document.getElementById('executionResults').textContent = result.result;
      document.getElementById('executionError').classList.add('hidden');
    } else {
      document.getElementById('executionResults').textContent = '';
      document.getElementById('executionError').textContent = result.error;
      document.getElementById('executionError').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error executing module:', error);
    document.getElementById('executeModuleBtn').disabled = false;
    document.getElementById('executeModuleBtn').textContent = 'Execute';
    document.getElementById('executionResults').textContent = '';
    document.getElementById('executionError').textContent = `Error: ${error.message}`;
    document.getElementById('executionError').classList.remove('hidden');
  }
}

function loadAdminData() {
  // This would be implemented to load admin-specific data
  console.log("Admin panel data would be loaded here");
}
EOF

# Create modules JavaScript file for frontend
cat > public/js/modules.js << 'EOF'
// Module management functions for admin

/**
 * Load all modules for admin panel
 */
async function loadAdminModules() {
  try {
    const modules = await fetchAllModules();
    
    const moduleTableBody = document.getElementById('moduleTableBody');
    if (!moduleTableBody) return;
    
    moduleTableBody.innerHTML = '';
    
    if (modules.length === 0) {
      moduleTableBody.innerHTML = '<tr><td colspan="5">No modules found</td></tr>';
      return;
    }
    
    modules.forEach(module => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${module.id}</td>
        <td>${module.name}</td>
        <td>${module.scriptName}</td>
        <td><span class="status-badge ${module.isActive ? 'active' : 'inactive'}">${module.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-small edit-module" data-id="${module.id}">Edit</button>
          <button class="btn btn-small toggle-module" data-id="${module.id}" data-active="${module.isActive}">
            ${module.isActive ? 'Disable' : 'Enable'}
          </button>
        </td>
      `;
      
      moduleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        openEditModuleForm(moduleId);
      });
    });
    
    document.querySelectorAll('.toggle-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        const isActive = button.getAttribute('data-active') === 'true';
        toggleModuleStatus(moduleId, !isActive);
      });
    });
  } catch (error) {
    console.error('Error loading admin modules:', error);
  }
}

/**
 * Open form to edit a module
 * @param {string} moduleId - Module ID
 */
async function openEditModuleForm(moduleId) {
  try {
    const module = await fetchModuleDetails(moduleId);
    
    // Implementation would open a form or modal to edit the module
    console.log(`Edit module: ${moduleId}`, module);
  } catch (error) {
    console.error(`Error fetching module ${moduleId}:`, error);
  }
}

/**
 * Toggle a module's active status
 * @param {string} moduleId - Module ID
 * @param {boolean} isActive - New active status
 */
async function toggleModuleStatus(moduleId, isActive) {
  try {
    await updateModule(moduleId, { isActive });
    
    // Refresh the module list
    loadAdminModules();
  } catch (error) {
    console.error(`Error updating module ${moduleId}:`, error);
  }
}
EOF

# Create admin JavaScript file for frontend
cat > public/js/admin.js << 'EOF'
// Admin functions for the application

/**
 * Load all admin data
 */
function loadAdminData() {
  loadAdminModules();
  loadAdminRoles();
  loadAdminUsers();
}

/**
 * Load roles for admin panel
 */
async function loadAdminRoles() {
  try {
    const roles = await fetchRoles();
    
    const roleTableBody = document.getElementById('roleTableBody');
    if (!roleTableBody) return;
    
    roleTableBody.innerHTML = '';
    
    if (roles.length === 0) {
      roleTableBody.innerHTML = '<tr><td colspan="5">No roles found</td></tr>';
      return;
    }
    
    roles.forEach(role => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${role.name}</td>
        <td>${role.level}</td>
        <td>${role.description}</td>
        <td>${role.permissions ? role.permissions.length : 0}</td>
        <td>
          <button class="btn btn-small edit-role" data-name="${role.name}">Edit</button>
          ${role.name !== 'admin' && role.name !== 'manager' && role.name !== 'user' ?
            `<button class="btn btn-small delete-role" data-name="${role.name}">Delete</button>` :
            ''}
        </td>
      `;
      
      roleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        openEditRoleForm(roleName);
      });
    });
    
    document.querySelectorAll('.delete-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        confirmDeleteRole(roleName);
      });
    });
  } catch (error) {
    console.error('Error loading admin roles:', error);
  }
}

/**
 * Load users for admin panel
 */
async function loadAdminUsers() {
  try {
    // This would fetch users from the API
    console.log('Loading admin users...');
    
    // Placeholder implementation
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
      userTableBody.innerHTML = '<tr><td colspan="5">User management implementation placeholder</td></tr>';
    }
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
}

/**
 * Open form to edit a role
 * @param {string} roleName - Role name
 */
function openEditRoleForm(roleName) {
  // Implementation would open a form or modal to edit the role
  console.log(`Edit role: ${roleName}`);
}

/**
 * Confirm and delete a role
 * @param {string} roleName - Role name
 */
function confirmDeleteRole(roleName) {
  if (confirm(`Are you sure you want to delete the role: ${roleName}?`)) {
    // Delete the role
    console.log(`Delete role: ${roleName}`);
  }
}
EOF

# Create main CSS file
cat > public/css/style.css << 'EOF'
/* Global Styles */
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --light-color: #ecf0f1;
  --dark-color: #2c3e50;
  --success-color: #2ecc71;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
  --gray-color: #95a5a6;
  --text-color: #333;
  --shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  --border-radius: 4px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f8f9fa;
}

a {
  color: var(--secondary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1, h2, h3, h4 {
  margin-bottom: 0.5rem;
  color: var(--dark-color);
}

.hidden {
  display: none !important;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #2980b9;
}

.btn-primary {
  background-color: var(--primary-color);
}

.btn-primary:hover {
  background-color: #1a2530;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.5rem;
  margin-bottom: 1rem;
  color: var(--danger-color);
  background-color: rgba(231, 76, 60, 0.1);
  border-left: 3px solid var(--danger-color);
  border-radius: var(--border-radius);
}

/* Layout */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--primary-color);
  color: white;
  box-shadow: var(--shadow);
}

.logo {
  display: flex;
  align-items: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.logo i {
  margin-right: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 1rem;
}

.user-info #userRole {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
}

.main-content {
  flex: 1;
  padding: 2rem;
}

.footer {
  text-align: center;
  padding: 1rem;
  background-color: var(--dark-color);
  color: white;
}

/* Auth */
.auth-container {
  max-width: 400px;
  margin: 2rem auto;
}

.auth-form {
  background-color: white;
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
}

/* Dashboard */
.dashboard-container {
  margin: 0 auto;
  max-width: 1200px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-gap: 1.5rem;
  margin: 2rem 0;
}

.module-card {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.module-card i {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--secondary-color);
}

.module-card h3 {
  margin-bottom: 0.5rem;
}

.module-card p {
  font-size: 0.875rem;
  color: var(--gray-color);
}

/* Module Panel */
.module-panel {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  margin: 2rem 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--light-color);
}

.panel-content {
  padding: 1.5rem;
  border-bottom: 1px solid #ddd;
}

.panel-results {
  padding: 1.5rem;
  background-color: #f8f9fa;
}

.panel-results pre {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  border-radius: var(--border-radius);
  overflow: auto;
  max-height: 300px;
  margin-top: 1rem;
}

.parameter-form {
  margin: 1.5rem 0;
}

.panel-actions {
  margin-top: 1.5rem;
  text-align: right;
}

/* Admin Panel */
.admin-container {
  margin: 2rem auto;
  max-width: 1200px;
}

.admin-tabs {
  display: flex;
  margin-bottom: 1rem;
  border-bottom: 1px solid #ddd;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--gray-color);
}

.tab-btn:hover {
  color: var(--dark-color);
}

.tab-btn.active {
  color: var(--secondary-color);
  border-bottom: 2px solid var(--secondary-color);
}

.tab-pane {
  display: none;
  padding: 1rem 0;
}

.tab-pane.active {
  display: block;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
}

.data-table th {
  background-color: var(--light-color);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  font-weight: bold;
}

.status-badge.active {
  background-color: rgba(46, 204, 113, 0.2);
  color: var(--success-color);
}

.status-badge.inactive {
  background-color: rgba(149, 165, 166, 0.2);
  color: var(--gray-color);
}
EOF

# Create HTML template
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Web Application</title>
  <link rel="stylesheet" href="/css/style.css">
  <!-- Font Awesome for icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <i class="fas fa-shield-alt"></i>
        <span>Secure Web App</span>
      </div>
      <div class="user-info" id="userInfo">
        <span id="username"></span>
        <span id="userRole"></span>
        <button id="logoutBtn" class="btn btn-small">Logout</button>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="main-content">
      <!-- Login Form (initially visible) -->
      <div id="loginContainer" class="auth-container">
        <div class="auth-form">
          <h2>Login</h2>
          <div id="loginError" class="error-message"></div>
          <form id="loginForm">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
          </form>
        </div>
      </div>
      
      <!-- Module Dashboard (hidden until login) -->
      <div id="dashboardContainer" class="dashboard-container hidden">
        <h2>Modules</h2>
        <div class="module-grid" id="moduleGrid"></div>
        
        <!-- Module Execution Panel -->
        <div id="modulePanel" class="module-panel hidden">
          <div class="panel-header">
            <h3 id="moduleName"></h3>
            <button id="closeModuleBtn" class="btn btn-small">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="panel-content">
            <p id="moduleDescription"></p>
            
            <div id="parameterForm" class="parameter-form"></div>
            
            <div class="panel-actions">
              <button id="executeModuleBtn" class="btn btn-primary">Execute</button>
            </div>
          </div>
          
          <div class="panel-results">
            <h4>Results:</h4>
            <div id="executionError" class="error-message hidden"></div>
            <pre id="executionResults"></pre>
          </div>
        </div>
      </div>
      
      <!-- Admin Panel (hidden until admin login) -->
      <div id="adminContainer" class="admin-container hidden">
        <div class="admin-tabs">
          <button class="tab-btn active" data-tab="modules">Modules</button>
          <button class="tab-btn" data-tab="roles">Roles</button>
          <button class="tab-btn" data-tab="users">Users</button>
          <button class="tab-btn" data-tab="config">Configuration</button>
        </div>
        
        <div class="tab-content">
          <!-- Modules Tab -->
          <div id="modulesTab" class="tab-pane active">
            <h3>Manage Modules</h3>
            <button id="addModuleBtn" class="btn btn-primary">Add New Module</button>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>Module ID</th>
                  <th>Name</th>
                  <th>Script</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="moduleTableBody"></tbody>
            </table>
          </div>
          
          <!-- Roles Tab -->
          <div id="rolesTab" class="tab-pane">
            <h3>Manage Roles</h3>
            <button id="addRoleBtn" class="btn btn-primary">Add New Role</button>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Description</th>
                  <th>Modules</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="roleTableBody"></tbody>
            </table>
          </div>
          
          <!-- Users Tab -->
          <div id="usersTab" class="tab-pane">
            <h3>Manage Users</h3>
            <button id="addUserBtn" class="btn btn-primary">Add New User</button>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="userTableBody"></tbody>
            </table>
          </div>
          
          <!-- Configuration Tab -->
          <div id="configTab" class="tab-pane">
            <h3>System Configuration</h3>
            
            <div class="config-section">
              <h4>Authentication Mode</h4>
              <div class="config-toggle">
                <label>
                  <input type="radio" name="authMode" value="local" checked>
                  Local Authentication
                </label>
                <label>
                  <input type="radio" name="authMode" value="ad">
                  Active Directory
                </label>
              </div>
            </div>
            
            <div id="adConfig" class="config-section hidden">
              <h4>Active Directory Settings</h4>
              <form id="adConfigForm">
                <div class="form-group">
                  <label for="adUrl">AD Server URL</label>
                  <input type="text" id="adUrl" name="adUrl" placeholder="ldap://your-ad-server.com">
                </div>
                <div class="form-group">
                  <label for="adBaseDN">Base DN</label>
                  <input type="text" id="adBaseDN" name="adBaseDN" placeholder="OU=Users,DC=example,DC=com">
                </div>
                <div class="form-group">
                  <label for="adUsername">Service Account Username</label>
                  <input type="text" id="adUsername" name="adUsername" placeholder="service_account@example.com">
                </div>
                <div class="form-group">
                  <label for="adPassword">Service Account Password</label>
                  <input type="password" id="adPassword" name="adPassword">
                </div>
                <button type="submit" class="btn btn-primary">Save AD Settings</button>
              </form>
            </div>
            
            <div class="config-section">
              <h4>Security Settings</h4>
              <form id="securityConfigForm">
                <div class="form-group">
                  <label for="maxScriptRuntime">Max Script Runtime (ms)</label>
                  <input type="number" id="maxScriptRuntime" name="maxScriptRuntime" min="1000" max="60000" value="30000">
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="enableWAF" name="enableWAF">
                    Enable Web Application Firewall
                  </label>
                </div>
                <button type="submit" class="btn btn-primary">Save Security Settings</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="footer">
      <p>&copy; 2023 Secure Web Application | <a href="#">Documentation</a></p>
    </footer>
  </div>
  
  <!-- Scripts -->
  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script src="/js/modules.js"></script>
  <script src="/js/admin.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
EOF

echo "Frontend files created successfully!"

# Update the master script to include this script
cat > create-startup-scripts.sh << 'EOF'
#!/bin/bash
# create-startup-scripts.sh
# Create scripts to initialize the database with an admin user

echo "Creating startup scripts..."

mkdir -p scripts

# Create a script to initialize the admin user
cat > scripts/init-admin.js << 'EOF_INNER'
// scripts/init-admin.js
// Script to initialize the admin user in the database
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// MongoDB connection
mongoose.connect(config.db.uri, config.db.options)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Import User model
const User = require('../src/models/user');

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin-password', salt);
    
    // Create the admin user
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin',
      authType: 'local'
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully');
  } catch (err) {
    console.error('Error creating admin user:', err.message);
  } finally {
    // Close the connection
    mongoose.disconnect();
  }
}

// Run the function
createAdminUser();
EOF_INNER

# Create a script to create test modules
cat > scripts/init-modules.js << 'EOF_INNER'
// scripts/init-modules.js
// Script to initialize test modules in the database
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB connection
mongoose.connect(config.db.uri, config.db.options)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Import Module model
const Module = require('../src/models/module');
const Role = require('../src/models/role');

// Create test modules
async function createTestModules() {
  try {
    // Define test modules
    const modules = [
      {
        moduleId: 'system_info',
        name: 'System Information',
        description: 'Display system information including CPU, memory, and disk usage',
        tooltip: 'View detailed system information',
        icon: 'server',
        scriptName: 'system-info.sh',
        parameterDefinitions: [
          {
            name: 'format',
            description: 'Output format',
            type: 'string',
            required: false,
            defaultValue: 'text',
            validationPattern: '^(text|json|csv),
            validationMessage: 'Format must be one of: text, json, csv'
          },
          {
            name: 'detail',
            description: 'Detail level',
            type: 'string',
            required: false,
            defaultValue: 'normal',
            validationPattern: '^(minimal|normal|detailed),
            validationMessage: 'Detail must be one of: minimal, normal, detailed'
          }
        ],
        isActive: true
      },
      {
        moduleId: 'user_list',
        name: 'User List',
        description: 'List all system users',
        tooltip: 'View all system users',
        icon: 'users',
        scriptName: 'user-list.sh',
        parameterDefinitions: [
          {
            name: 'sortBy',
            description: 'Sort by field',
            type: 'string',
            required: false,
            defaultValue: 'name',
            validationPattern: '^(name|uid|gid),
            validationMessage: 'Sort field must be one of: name, uid, gid'
          }
        ],
        isActive: true
      },
      {
        moduleId: 'disk_usage',
        name: 'Disk Usage',
        description: 'Show disk usage of directories',
        tooltip: 'View disk usage information',
        icon: 'hdd',
        scriptName: 'disk-usage.sh',
        parameterDefinitions: [
          {
            name: 'path',
            description: 'Directory path',
            type: 'string',
            required: false,
            defaultValue: '.'
          },
          {
            name: 'min-size',
            description: 'Minimum size in MB',
            type: 'number',
            required: false,
            defaultValue: 0
          },
          {
            name: 'format',
            description: 'Output format',
            type: 'string',
            required: false,
            defaultValue: 'text',
            validationPattern: '^(text|json),
            validationMessage: 'Format must be one of: text, json'
          }
        ],
        isActive: true
      }
    ];
    
    // Insert modules
    for (const module of modules) {
      const existingModule = await Module.findOne({ moduleId: module.moduleId });
      
      if (existingModule) {
        console.log(`Module ${module.moduleId} already exists`);
        continue;
      }
      
      await Module.create(module);
      console.log(`Module ${module.moduleId} created`);
    }
    
    // Assign modules to roles
    const adminRole = await Role.findOne({ name: 'admin' });
    if (adminRole) {
      const moduleIds = modules.map(m => m.moduleId);
      
      // Add all modules to admin role
      for (const moduleId of moduleIds) {
        const hasModule = adminRole.permissions.some(p => p.moduleId === moduleId);
        
        if (!hasModule) {
          adminRole.permissions.push({
            moduleId,
            description: `Access to ${moduleId} module`
          });
        }
      }
      
      await adminRole.save();
      console.log('Modules assigned to admin role');
    }
    
    // Assign some modules to user role
    const userRole = await Role.findOne({ name: 'user' });
    if (userRole) {
      const userModuleIds = ['system_info', 'disk_usage'];
      
      for (const moduleId of userModuleIds) {
        const hasModule = userRole.permissions.some(p => p.moduleId === moduleId);
        
        if (!hasModule) {
          userRole.permissions.push({
            moduleId,
            description: `Access to ${moduleId} module`
          });
        }
      }
      
      await userRole.save();
      console.log('Modules assigned to user role');
    }
    
  } catch (err) {
    console.error('Error creating test modules:', err.message);
  } finally {
    // Close the connection
    mongoose.disconnect();
  }
}

// Run the function
createTestModules();
EOF_INNER

# Add the initialization commands to package.json
cat > add-init-scripts.js << 'EOF_INNER'
const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read the file
let packageJson;
try {
  const data = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(data);
} catch (err) {
  console.error('Error reading package.json:', err.message);
  process.exit(1);
}

// Add initialization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts.init = 'node scripts/init-admin.js && node scripts/init-modules.js';
packageJson.scripts.postinstall = 'chmod +x scripts/*.sh';

// Write the file back
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Added initialization scripts to package.json');
} catch (err) {
  console.error('Error writing package.json:', err.message);
  process.exit(1);
}
EOF_INNER

chmod +x create-startup-scripts.sh
echo "Startup scripts created successfully!"
EOF

echo "Frontend files and startup scripts created successfully!"
