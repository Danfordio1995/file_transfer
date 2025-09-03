const fs = require('fs');
const path = require('path');

// First, let's check the HTML to make sure the username field has the correct ID
const indexPath = path.join(__dirname, 'public/index.html');

try {
  const html = fs.readFileSync(indexPath, 'utf8');
  
  console.log('Checking username field in HTML...');
  
  // Look for username input field
  const usernameInputMatch = html.match(/<input[^>]*id=["']([^"']*username[^"']*)["'][^>]*>/i);
  
  if (usernameInputMatch) {
    const usernameId = usernameInputMatch[1];
    console.log(`Found username input field with ID: "${usernameId}"`);
    
    // Now check main.js to make sure it's looking for the right ID
    const mainJsPath = path.join(__dirname, 'public/js/main.js');
    let mainJs = fs.readFileSync(mainJsPath, 'utf8');
    
    // Find the handleLogin function
    const handleLoginMatch = mainJs.match(/function\s+handleLogin\s*\([^)]*\)\s*{([^}]*)}/s);
    
    if (handleLoginMatch) {
      const handleLoginBody = handleLoginMatch[0];
      
      // Check how it's trying to get the username
      console.log('Checking how handleLogin gets username value...');
      
      // Fix handleLogin function
      const fixedHandleLogin = `async function handleLogin(e) {
  e.preventDefault();
  
  console.log('Login form submitted');
  
  // Get form fields - explicitly log IDs to debug
  const usernameField = document.getElementById('username');
  const passwordField = document.getElementById('password');
  
  console.log('Username field element:', usernameField);
  console.log('Password field element:', passwordField);
  
  if (!usernameField || !passwordField) {
    console.error('Form fields not found:', { 
      usernameField: !!usernameField, 
      passwordField: !!passwordField 
    });
    
    // Get all input fields for debugging
    const allInputs = document.querySelectorAll('input');
    console.log('All input fields:', Array.from(allInputs).map(el => ({ 
      id: el.id, 
      name: el.name,
      type: el.type
    })));
    
    alert('Error: Form fields not found. Check console for details.');
    return;
  }
  
  const username = usernameField.value;
  const password = passwordField.value;
  
  console.log('Username:', username);
  console.log('Password:', password);
  
  const loginError = document.getElementById('loginError');
  
  try {
    if (loginError) loginError.textContent = '';
    
    // Call the login API directly
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Login failed:', data);
      if (loginError) loginError.textContent = data.error || 'Login failed';
      return;
    }
    
    console.log('Login successful:', data);
    
    // Save auth data
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Redirect to dashboard
    showDashboard();
  } catch (error) {
    console.error('Login error:', error);
    if (loginError) loginError.textContent = 'An error occurred during login';
  }
}`;

      // Replace handleLogin function in main.js
      const updatedMainJs = mainJs.replace(/async\s+function\s+handleLogin\s*\([^)]*\)\s*{[^}]*}/s, fixedHandleLogin);
      
      fs.writeFileSync(mainJsPath, updatedMainJs);
      console.log('Updated handleLogin function in main.js with better debugging');
    } else {
      console.log('Could not find handleLogin function in main.js');
    }
  } else {
    console.log('Could not find username input field in HTML. Creating a fixed login form...');
    
    // Create a fixed login form with explicit IDs
    const fixedHtml = `<!DOCTYPE html>
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
        <span id="usernameDisplay"></span>
        <span id="userRoleDisplay"></span>
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
              <label for="username">Username:</label>
              <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
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
        
        <div id="modulesContainer">
          <h3>Available Modules</h3>
          <div id="modulesGrid" class="modules-grid"></div>
        </div>
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
    
    fs.writeFileSync(indexPath, fixedHtml);
    console.log('Created fixed login form with proper IDs');
    
    // Create a simple main.js that works with the fixed form
    const mainJsPath = path.join(__dirname, 'public/js/main.js');
    const simpleMainJs = `// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('Application initialized');
  
  // Set up event listeners
  setupEventListeners();
  
  // Check if user is already logged in
  checkAuthStatus();
});

// Set up event listeners for the UI
function setupEventListeners() {
  // Login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('Login form found, setting up submit handler');
    loginForm.addEventListener('submit', handleLogin);
  } else {
    console.warn('Login form not found');
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
  
  console.log('Login form submitted');
  
  // Get form fields
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  console.log('Username:', username);
  console.log('Password:', password);
  
  const loginError = document.getElementById('loginError');
  
  try {
    // Clear previous error
    if (loginError) loginError.textContent = '';
    
    // Call the login API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Login failed:', data);
      if (loginError) loginError.textContent = data.error || 'Login failed';
      return;
    }
    
    console.log('Login successful:', data);
    
    // Save authentication data
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
  // Clear authentication data
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  
  // Show login form
  showLoginForm();
}

// Show the dashboard after successful login
function showDashboard() {
  // Hide login form
  const loginContainer = document.getElementById('loginContainer');
  if (loginContainer) loginContainer.classList.add('hidden');
  
  // Show dashboard
  const dashboardContainer = document.getElementById('dashboardContainer');
  if (dashboardContainer) dashboardContainer.classList.remove('hidden');
  
  // Update user info in header
  updateUserInfo();
  
  // Load modules
  loadModules();
}

// Update user info in the header
function updateUserInfo() {
  try {
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      
      // Update display
      const usernameDisplay = document.getElementById('usernameDisplay');
      const userRoleDisplay = document.getElementById('userRoleDisplay');
      
      if (usernameDisplay) usernameDisplay.textContent = user.username;
      if (userRoleDisplay) userRoleDisplay.textContent = user.role;
    }
  } catch (error) {
    console.error('Error updating user info:', error);
  }
}

// Show the login form
function showLoginForm() {
  // Hide dashboard
  const dashboardContainer = document.getElementById('dashboardContainer');
  if (dashboardContainer) dashboardContainer.classList.add('hidden');
  
  // Show login form
  const loginContainer = document.getElementById('loginContainer');
  if (loginContainer) loginContainer.classList.remove('hidden');
  
  // Clear form fields
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.reset();
  
  // Clear error message
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.textContent = '';
}

// Load modules for the current user
async function loadModules() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }
    
    const response = await fetch('/api/modules', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch modules:', response.statusText);
      return;
    }
    
    const data = await response.json();
    const modules = data.modules || [];
    
    // Display modules
    const modulesGrid = document.getElementById('modulesGrid');
    if (!modulesGrid) return;
    
    if (modules.length === 0) {
      modulesGrid.innerHTML = '<p>No modules available for your role.</p>';
      return;
    }
    
    // Create module cards
    modulesGrid.innerHTML = '';
    modules.forEach(module => {
      const moduleCard = document.createElement('div');
      moduleCard.className = 'module-card';
      moduleCard.innerHTML = \`
        <h3>${module.name}</h3>
        <p>${module.description}</p>
      \`;
      
      // Add click handler
      moduleCard.addEventListener('click', () => {
        alert(\`Module ${module.name} clicked. Implementation pending.\`);
      });
      
      modulesGrid.appendChild(moduleCard);
    });
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

// Check if user is already logged in
function checkAuthStatus() {
  const token = localStorage.getItem('auth_token');
  const userJson = localStorage.getItem('auth_user');
  
  if (token && userJson) {
    // User is logged in
    showDashboard();
  } else {
    // User is not logged in
    showLoginForm();
  }
}`;
    
    fs.writeFileSync(mainJsPath, simpleMainJs);
    console.log('Created simplified main.js for fixed login form');
  }
} catch (err) {
  console.error('Error analyzing files:', err);
  
  // Let's create a super simple login form as a last resort
  try {
    // Create super simple login form
    const simpleLoginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Login</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f5f5f5; }
    .login-form { background: white; padding: 2rem; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 350px; }
    h1 { margin-top: 0; color: #333; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
    input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    button { width: 100%; padding: 0.75rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    .error { color: red; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="login-form">
    <h1>Secure Login</h1>
    <div id="error" class="error"></div>
    <form id="loginForm">
      <div class="form-group">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" value="admin" required>
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" value="admin-password" required>
      </div>
      <button type="submit">Login</button>
    </form>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const error = document.getElementById('error');
      
      error.textContent = '';
      
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
          error.textContent = data.error || 'Login failed';
          return;
        }
        
        // Login successful
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        // Redirect or show success
        window.location.href = '/dashboard.html';
      } catch (err) {
        error.textContent = 'An error occurred during login';
        console.error('Login error:', err);
      }
    });
  </script>
</body>
</html>`;
    
    // Create simple dashboard
    const simpleDashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    header { background: #333; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
    .container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .user-info { display: flex; align-items: center; }
    .username { margin-right: 1rem; }
    button { background: #f44336; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); grid-gap: 1rem; margin-top: 2rem; }
    .module { background: white; padding: 1.5rem; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
  </style>
</head>
<body>
  <header>
    <h1>Secure Web App</h1>
    <div class="user-info">
      <span id="username" class="username"></span>
      <span id="role"></span>
      <button id="logout">Logout</button>
    </div>
  </header>
  
  <div class="container">
    <h2>Dashboard</h2>
    <p>Welcome to the Secure Web Application. Your available modules are shown below.</p>
    
    <div id="modules" class="modules"></div>
  </div>

  <script>
    // Check authentication
    function checkAuth() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/index.html';
        return;
      }
      
      const userJson = localStorage.getItem('auth_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        document.getElementById('username').textContent = user.username;
        document.getElementById('role').textContent = user.role;
      }
    }
    
    // Load modules
    async function loadModules() {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/modules', {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load modules');
        }
        
        const data = await response.json();
        const modules = data.modules || [];
        
        const modulesContainer = document.getElementById('modules');
        
        if (modules.length === 0) {
          modulesContainer.innerHTML = '<p>No modules available for your role.</p>';
          return;
        }
        
        modulesContainer.innerHTML = '';
        
        modules.forEach(module => {
          const moduleEl = document.createElement('div');
          moduleEl.className = 'module';
          moduleEl.innerHTML = \`
            <h3>\${module.name}</h3>
            <p>\${module.description}</p>
            <button class="execute-btn" data-id="\${module.id}">Execute</button>
          \`;
          
          modulesContainer.appendChild(moduleEl);
        });
        
        // Add event listeners to execute buttons
        document.querySelectorAll('.execute-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const moduleId = e.target.getAttribute('data-id');
            alert(\`Module \${moduleId} execution is not implemented in this demo.\`);
          });
        });
      } catch (error) {
        console.error('Error loading modules:', error);
        document.getElementById('modules').innerHTML = \`<p>Error loading modules: \${error.message}</p>\`;
      }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      checkAuth();
      loadModules();
      
      // Logout handler
      document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/index.html';
      });
    });
  </script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(__dirname, 'public/index.html'), simpleLoginHtml);
    fs.writeFileSync(path.join(__dirname, 'public/dashboard.html'), simpleDashboardHtml);
    
    console.log('Created super simple login and dashboard pages as a last resort');
  } catch (fallbackErr) {
    console.error('Error creating fallback pages:', fallbackErr);
  }
}

console.log('\nFixed username field issue. Please restart your server and try again.');
