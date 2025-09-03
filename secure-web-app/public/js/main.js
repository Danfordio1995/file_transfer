// Main application initialization
// Initialize authentication system
function initializeAuth() {
  // Check token expiration
  const token = getAuthToken();
  if (token) {
    try {
      const payload = parseJwt(token);
      const expirationDate = new Date(payload.exp * 1000);
      
      if (expirationDate <= new Date()) {
        clearAuthData();
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      clearAuthData();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the authentication system
  initializeAuth();
  
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
  console.log("Login form submitted");
  console.log("Username:", document.getElementById("username").value);
  console.log("Password:", document.getElementById("password").value);

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
