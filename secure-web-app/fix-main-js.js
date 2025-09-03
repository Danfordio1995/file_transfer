const fs = require('fs');
const path = require('path');

// Path to main.js
const mainJsPath = path.join(__dirname, 'public/js/main.js');

try {
  // Read the file
  let content = fs.readFileSync(mainJsPath, 'utf8');
  
  // Find the line with the reference error
  const lines = content.split('\n');
  
  console.log('Checking main.js around line 4:');
  for (let i = 0; i < 10 && i < lines.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
  
  // Check if initAuth is called without being defined in this file
  if (content.includes('initAuth()') && !content.includes('function initAuth')) {
    console.log('Found initAuth call but no initAuth definition');
    
    // Two possible fixes:
    // 1. Import initAuth from auth.js (but this requires module syntax or global variables)
    // 2. Define initAuth in main.js directly
    
    // Let's fix by defining initAuth in main.js
    const fixedContent = content.replace(
      'document.addEventListener(\'DOMContentLoaded\', () => {',
      `// Initialize authentication system
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

document.addEventListener('DOMContentLoaded', () => {`
    ).replace(
      'initAuth();',
      'initializeAuth();'
    );
    
    fs.writeFileSync(mainJsPath, fixedContent);
    console.log('Fixed initAuth reference in main.js');
  } else {
    console.log('Could not automatically identify the issue with initAuth. Creating a simplified main.js');
    
    // Create a new simplified main.js
    const newMainJs = `// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
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
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (!usernameInput || !passwordInput) {
    console.error('Login form elements not found');
    return;
  }
  
  const username = usernameInput.value;
  const password = passwordInput.value;
  
  const loginError = document.getElementById('loginError');
  
  try {
    if (loginError) loginError.textContent = '';
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (loginError) loginError.textContent = data.error || 'Login failed';
      return;
    }
    
    // Save auth token and user data
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Show dashboard
    showDashboard();
  } catch (error) {
    console.error('Login error:', error);
    if (loginError) loginError.textContent = 'An error occurred during login';
  }
}

// Handle logout
function handleLogout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  showLoginForm();
}

// Show the dashboard after successful login
function showDashboard() {
  const loginContainer = document.getElementById('loginContainer');
  const dashboardContainer = document.getElementById('dashboardContainer');
  
  if (loginContainer) loginContainer.classList.add('hidden');
  if (dashboardContainer) dashboardContainer.classList.remove('hidden');
  
  // Get user info
  try {
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      
      // Update user info in header
      const username = document.getElementById('username');
      const userRole = document.getElementById('userRole');
      
      if (username) username.textContent = user.username;
      if (userRole) userRole.textContent = user.role;
      
      // Show admin panel if user is admin
      if (user.role === 'admin') {
        const adminContainer = document.getElementById('adminContainer');
        if (adminContainer) adminContainer.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  
  // Load modules - this would be implemented to fetch available modules for the user
  console.log('Loading modules...');
}

// Show the login form
function showLoginForm() {
  const loginContainer = document.getElementById('loginContainer');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const adminContainer = document.getElementById('adminContainer');
  
  if (dashboardContainer) dashboardContainer.classList.add('hidden');
  if (adminContainer) adminContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.remove('hidden');
  
  // Clear form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.reset();
  
  // Clear error
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.textContent = '';
}

// Check if user is already logged in
function checkAuthStatus() {
  const token = localStorage.getItem('auth_token');
  const userJson = localStorage.getItem('auth_user');
  
  if (token && userJson) {
    try {
      // Validate token - would check expiration if needed
      const user = JSON.parse(userJson);
      
      if (user) {
        showDashboard();
        return;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }
  
  showLoginForm();
}`;
    
    fs.writeFileSync(mainJsPath, newMainJs);
    console.log('Created new simplified main.js');
  }
} catch (err) {
  console.error('Error fixing main.js:', err.message);
}

// Also create a minimal index.html in case it's needed
try {
  const indexPath = path.join(__dirname, 'public/index.html');
  
  // Only create if it doesn't exist or if it's empty
  const stat = fs.statSync(indexPath);
  if (stat.size === 0) {
    const minimalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Web Application</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="app-container">
    <header class="header">
      <div class="logo">
        <span>Secure Web App</span>
      </div>
      <div class="user-info" id="userInfo">
        <span id="username"></span>
        <span id="userRole"></span>
        <button id="logoutBtn" class="btn btn-small">Logout</button>
      </div>
    </header>
    
    <main class="main-content">
      <!-- Login Form -->
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
      
      <!-- Dashboard (hidden until login) -->
      <div id="dashboardContainer" class="dashboard-container hidden">
        <h2>Dashboard</h2>
        <p>Welcome to the Secure Web Application!</p>
      </div>
    </main>
    
    <footer class="footer">
      <p>&copy; 2023 Secure Web Application</p>
    </footer>
  </div>
  
  <!-- Scripts -->
  <script src="/js/main.js"></script>
</body>
</html>`;
    
    fs.writeFileSync(indexPath, minimalHtml);
    console.log('Created minimal index.html');
  }
} catch (err) {
  // Ignore errors if the file exists
}

console.log('\nFixed JavaScript errors. Please restart your server and try again.');
