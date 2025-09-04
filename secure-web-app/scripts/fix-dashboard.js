// Save this as scripts/fix-dashboard.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Connect to MongoDB
mongoose.connect(config.db.uri, config.db.options)
  .then(() => {
    console.log('Connected to MongoDB');
    fixDashboardIssues();
  })
  .catch(err => {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

async function fixDashboardIssues() {
  try {
    // 1. Fix the roles and permissions
    console.log('Fixing roles and permissions...');
    
    // Load models
    const Role = require('../src/models/role');
    const Module = require('../src/models/module');
    
    // Get all modules
    const modules = await Module.find({});
    console.log(`Found ${modules.length} modules: ${modules.map(m => m.moduleId).join(', ')}`);
    
    if (modules.length === 0) {
      console.log('No modules found. Initializing default modules...');
      await Module.initDefaultModules();
      console.log('Default modules initialized');
    }
    
    // Get all roles
    const roles = await Role.find({});
    
    // Update admin role
    const adminRole = roles.find(r => r.name === 'admin');
    if (adminRole) {
      // Clear existing permissions
      adminRole.permissions = [];
      
      // Add permissions for all modules
      for (const module of modules) {
        adminRole.permissions.push({
          moduleId: module.moduleId,
          description: `Access to ${module.name}`
        });
      }
      
      await adminRole.save();
      console.log(`Admin role updated with permissions for ${modules.length} modules`);
    } else {
      console.log('Admin role not found');
    }
    
    // Update user role
    const userRole = roles.find(r => r.name === 'user');
    if (userRole) {
      // Clear existing permissions
      userRole.permissions = [];
      
      // Add permissions for system_info module
      const systemInfoModule = modules.find(m => m.moduleId === 'system_info');
      if (systemInfoModule) {
        userRole.permissions.push({
          moduleId: 'system_info',
          description: `Access to ${systemInfoModule.name}`
        });
      }
      
      await userRole.save();
      console.log('User role updated with permission for system_info module');
    } else {
      console.log('User role not found');
    }
    
    // 2. Check simple-dashboard.html for issues
    console.log('\nChecking dashboard HTML file...');
    
    const dashboardPath = path.join(__dirname, '../public/simple-dashboard.html');
    if (fs.existsSync(dashboardPath)) {
      let dashboardHtml = fs.readFileSync(dashboardPath, 'utf8');
      
      // Look for JavaScript that loads modules
      const fetchModulesCode = dashboardHtml.match(/fetch\(['"]\/api\/modules['"][^)]*\)/);
      if (fetchModulesCode) {
        console.log('Found fetch call in dashboard HTML');
      } else {
        console.log('No fetch call for modules found in dashboard HTML');
      }
      
      // Check for any issues in the modules container
      const modulesContainer = dashboardHtml.match(/id=['"]modules['"]/);
      if (modulesContainer) {
        console.log('Found modules container in dashboard HTML');
      } else {
        console.log('No modules container found in dashboard HTML');
      }
    } else {
      console.log('Dashboard HTML file not found');
    }
    
    // 3. Create a fixed dashboard.js file
    console.log('\nCreating fixed dashboard.js file...');
    
    const jsDir = path.join(__dirname, '../public/js');
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    const dashboardJsContent = `// Fixed dashboard JavaScript

// Check authentication
function checkAuth() {
  var token = localStorage.getItem('auth_token');
  if (!token) {
    window.location.href = '/simple-login.html';
    return;
  }
  
  var userJson = localStorage.getItem('auth_user');
  if (userJson) {
    try {
      var user = JSON.parse(userJson);
      document.getElementById('username').textContent = user.username;
      document.getElementById('role').textContent = user.role;
      
      console.log('User authenticated:', user);
    } catch (err) {
      console.error('Error parsing user data:', err);
    }
  }
}

// Load modules
function loadModules() {
  var token = localStorage.getItem('auth_token');
  console.log('Loading modules with token:', token ? 'Present' : 'Missing');
  
  fetch('/api/modules', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(function(response) {
    console.log('API response status:', response.status);
    if (!response.ok) {
      throw new Error('Failed to load modules: ' + response.status);
    }
    return response.json();
  })
  .then(function(data) {
    console.log('Modules data:', data);
    var modules = data.modules || [];
    var modulesContainer = document.getElementById('modules');
    
    if (modules.length === 0) {
      modulesContainer.innerHTML = '<p>No modules available for your role.</p>';
      return;
    }
    
    modulesContainer.innerHTML = '';
    
    for (var i = 0; i < modules.length; i++) {
      var module = modules[i];
      var moduleEl = document.createElement('div');
      moduleEl.className = 'module';
      moduleEl.innerHTML = '<h3>' + module.name + '</h3>' +
                           '<p>' + module.description + '</p>' +
                           '<button class="execute-btn" data-id="' + module.id + '">Execute</button>';
      
      modulesContainer.appendChild(moduleEl);
    }
    
    // Add event listeners to execute buttons
    var buttons = document.querySelectorAll('.execute-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        var moduleId = e.target.getAttribute('data-id');
        alert('Module ' + moduleId + ' execution is not implemented in this demo.');
      });
    }
  })
  .catch(function(error) {
    console.error('Error loading modules:', error);
    document.getElementById('modules').innerHTML = '<p>Error loading modules: ' + error.message + '</p>';
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard loaded');
  checkAuth();
  loadModules();
  
  // Logout handler
  document.getElementById('logout').addEventListener('click', function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/simple-login.html';
  });
});
`;
    
    fs.writeFileSync(path.join(jsDir, 'dashboard.js'), dashboardJsContent);
    console.log('Created fixed dashboard.js file');
    
    // 4. Update simple-dashboard.html to use the new JS file
    console.log('\nUpdating simple-dashboard.html...');
    
    if (fs.existsSync(dashboardPath)) {
      let dashboardHtml = fs.readFileSync(dashboardPath, 'utf8');
      
      // Replace existing script with reference to external file
      const updatedHtml = dashboardHtml.replace(
        /<script>[\s\S]*?<\/script>/,
        '<script src="/js/dashboard.js"></script>'
      );
      
      fs.writeFileSync(dashboardPath, updatedHtml);
      console.log('Updated simple-dashboard.html to use external JavaScript file');
    }
    
    console.log('\nFixes applied successfully!');
    console.log('Please restart your server and try again.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}