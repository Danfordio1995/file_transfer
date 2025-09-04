// Save as scripts/fix-admin-interface.js
const fs = require('fs');
const path = require('path');

// Paths to relevant files
const publicDir = path.join(__dirname, '..', 'public');
const jsDir = path.join(publicDir, 'js');

// Create admin.js file with explicit module rendering code
function createAdminJs() {
  const content = `// Fixed admin.js
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
 * Load modules for admin panel
 */
async function loadAdminModules() {
  try {
    console.log('Loading admin modules...');
    const modules = await fetchAllModules();
    console.log('Fetched modules:', modules);
    
    const moduleTableBody = document.getElementById('moduleTableBody');
    if (!moduleTableBody) {
      console.error('moduleTableBody element not found');
      return;
    }
    
    moduleTableBody.innerHTML = '';
    
    if (!modules || modules.length === 0) {
      moduleTableBody.innerHTML = '<tr><td colspan="5">No modules found</td></tr>';
      return;
    }
    
    // Force render each module in the table
    modules.forEach(module => {
      console.log('Rendering module:', module);
      const row = document.createElement('tr');
      
      row.innerHTML = \`
        <td>\${module.id || ''}</td>
        <td>\${module.name || ''}</td>
        <td>\${module.scriptName || ''}</td>
        <td><span class="status-badge \${module.isActive ? 'active' : 'inactive'}">\${module.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-small edit-module" data-id="\${module.id || ''}">Edit</button>
          <button class="btn btn-small toggle-module" data-id="\${module.id || ''}" data-active="\${module.isActive || false}">
            \${module.isActive ? 'Disable' : 'Enable'}
          </button>
        </td>
      \`;
      
      moduleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        alert('Edit module: ' + moduleId);
      });
    });
    
    document.querySelectorAll('.toggle-module').forEach(button => {
      button.addEventListener('click', () => {
        const moduleId = button.getAttribute('data-id');
        const isActive = button.getAttribute('data-active') === 'true';
        alert('Toggle module ' + moduleId + ' to ' + (!isActive ? 'active' : 'inactive'));
      });
    });
  } catch (error) {
    console.error('Error loading admin modules:', error);
  }
}

/**
 * Load roles for admin panel
 */
async function loadAdminRoles() {
  try {
    console.log('Loading admin roles...');
    const roles = await fetchRoles();
    
    const roleTableBody = document.getElementById('roleTableBody');
    if (!roleTableBody) {
      console.error('roleTableBody element not found');
      return;
    }
    
    roleTableBody.innerHTML = '';
    
    if (!roles || roles.length === 0) {
      roleTableBody.innerHTML = '<tr><td colspan="5">No roles found</td></tr>';
      return;
    }
    
    roles.forEach(role => {
      const row = document.createElement('tr');
      
      row.innerHTML = \`
        <td>\${role.name || ''}</td>
        <td>\${role.level || ''}</td>
        <td>\${role.description || ''}</td>
        <td>\${role.permissions ? role.permissions.length : 0}</td>
        <td>
          <button class="btn btn-small edit-role" data-name="\${role.name}">Edit</button>
          \${role.name !== 'admin' && role.name !== 'manager' && role.name !== 'user' ?
            \`<button class="btn btn-small delete-role" data-name="\${role.name}">Delete</button>\` :
            ''}
        </td>
      \`;
      
      roleTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        alert('Edit role: ' + roleName);
      });
    });
    
    document.querySelectorAll('.delete-role').forEach(button => {
      button.addEventListener('click', () => {
        const roleName = button.getAttribute('data-name');
        alert('Delete role: ' + roleName);
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
    console.log('Loading admin users...');
    
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
      userTableBody.innerHTML = '<tr><td colspan="5">User management implementation placeholder</td></tr>';
    }
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
}

// API Helper: Fetch all modules
async function fetchAllModules() {
  try {
    console.log('Fetching all modules from API...');
    const response = await apiRequest('/modules', 'GET');
    console.log('API response:', response);
    return response.modules || [];
  } catch (error) {
    console.error('Error fetching all modules:', error);
    return [];
  }
}
`;

  fs.writeFileSync(path.join(jsDir, 'admin-fixed.js'), content);
  console.log('Created new admin-fixed.js file');
  
  return true;
}

// Create fix-db-module-issues.js file
function createDbFixScript() {
  const content = `// Fix database module issues
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  fixDbModules();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function fixDbModules() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Ensure modules have all required fields
    console.log('Updating modules to ensure all fields are present...');
    
    const modules = await db.collection('modules').find({}).toArray();
    
    for (const module of modules) {
      // Ensure all required fields are present
      const updates = {};
      
      if (!module.name) updates.name = module.moduleId;
      if (!module.description) updates.description = \`Module for \${module.moduleId}\`;
      if (!module.scriptName) updates.scriptName = \`\${module.moduleId}.sh\`;
      if (module.isActive === undefined) updates.isActive = true;
      if (!module.icon) updates.icon = 'module';
      if (!module.createdAt) updates.createdAt = new Date();
      if (!module.updatedAt) updates.updatedAt = new Date();
      
      if (Object.keys(updates).length > 0) {
        await db.collection('modules').updateOne(
          { _id: module._id },
          { $set: updates }
        );
        
        console.log(\`Updated module \${module.moduleId} with missing fields\`);
      }
    }
    
    // 2. Update admin role to have permissions for ALL modules
    console.log('Ensuring admin role has permissions for all modules...');
    
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    
    if (adminRole) {
      const permissions = [];
      
      for (const module of modules) {
        permissions.push({
          moduleId: module.moduleId,
          description: \`Access to \${module.name}\`,
          createdAt: new Date()
        });
      }
      
      await db.collection('roles').updateOne(
        { name: 'admin' },
        { 
          $set: { 
            permissions,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(\`Updated admin role with permissions for \${modules.length} modules\`);
    }
    
    console.log('Database fix completed');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}
`;

  fs.writeFileSync(path.join(__dirname, 'fix-db-module-issues.js'), content);
  console.log('Created fix-db-module-issues.js script');
  
  return true;
}

// Create a dashboard HTML page that works with the existing API
function createDirectDashboard() {
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Direct Module Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    header { background-color: #2c3e50; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .user-info { display: flex; align-items: center; }
    .username { font-weight: bold; margin-right: 1rem; }
    .role { background-color: rgba(255,255,255,0.2); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 1rem; }
    button { background-color: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); grid-gap: 1.5rem; margin-top: 2rem; }
    .module { background: white; padding: 1.5rem; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .module h3 { margin-top: 0; color: #2c3e50; }
    .module p { color: #7f8c8d; }
    .module button { background-color: #3498db; margin-top: 1rem; }
    .module button:hover { background-color: #2980b9; }
    h1, h2 { color: #2c3e50; }
    .error { color: #e74c3c; padding: 1rem; background-color: rgba(231, 76, 60, 0.1); border-radius: 4px; }
    .modules-debug { margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; }
    .modules-debug pre { background-color: #2c3e50; color: white; padding: 1rem; border-radius: 4px; overflow: auto; }
  </style>
</head>
<body>
  <header>
    <h1>Module Dashboard</h1>
    <div class="user-info">
      <span id="username" class="username">Loading...</span>
      <span id="role" class="role">Loading...</span>
      <button id="logout">Logout</button>
    </div>
  </header>
  
  <div class="container">
    <h2>Available Modules</h2>
    <p>Here are the modules available to you:</p>
    
    <div id="modules" class="module-grid">
      <div>Loading modules...</div>
    </div>
    
    <!-- Debug Information Section -->
    <div class="modules-debug">
      <h3>Modules Debug Information</h3>
      <div id="debug-info"></div>
    </div>
  </div>
  
  <script>
    // Load user data
    function loadUserData() {
      const userJson = localStorage.getItem('auth_user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          document.getElementById('username').textContent = user.username;
          document.getElementById('role').textContent = user.role;
          
          // Log for debugging
          console.log('User:', user);
          addDebugInfo('User data:', user);
        } catch (err) {
          console.error('Error parsing user data:', err);
          addDebugInfo('Error parsing user data:', err);
        }
      } else {
        // No user data found, redirect to login
        window.location.href = '/simple-login.html';
      }
    }
    
    // Add debug info
    function addDebugInfo(title, data = null) {
      const debugInfoDiv = document.getElementById('debug-info');
      
      const titleEl = document.createElement('h4');
      titleEl.textContent = title;
      debugInfoDiv.appendChild(titleEl);
      
      if (data) {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(data, null, 2);
        debugInfoDiv.appendChild(pre);
      }
    }
    
    // Load modules
    function loadModules() {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        window.location.href = '/simple-login.html';
        return;
      }
      
      fetch('/api/modules', {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      })
      .then(response => {
        console.log('Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Modules API response:', data);
        addDebugInfo('API Response:', data);
        
        const modulesContainer = document.getElementById('modules');
        const modules = data.modules || [];
        
        if (modules.length === 0) {
          modulesContainer.innerHTML = '<div class="error">No modules available for your role.</div>';
          return;
        }
        
        // Clear the container
        modulesContainer.innerHTML = '';
        
        // Add each module
        modules.forEach(module => {
          const moduleEl = document.createElement('div');
          moduleEl.className = 'module';
          
          moduleEl.innerHTML = \`
            <h3>\${module.name}</h3>
            <p>\${module.description || 'No description available'}</p>
            <button class="execute-btn" data-id="\${module.id}">Execute</button>
          \`;
          
          modulesContainer.appendChild(moduleEl);
        });
        
        // Add event listeners
        document.querySelectorAll('.execute-btn').forEach(button => {
          button.addEventListener('click', function() {
            const moduleId = this.getAttribute('data-id');
            alert(\`Executing module: \${moduleId}\`);
          });
        });
      })
      .catch(err => {
        console.error('Error loading modules:', err);
        addDebugInfo('Error loading modules:', err);
        
        const modulesContainer = document.getElementById('modules');
        modulesContainer.innerHTML = \`<div class="error">Error loading modules: \${err.message}</div>\`;
      });
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      loadUserData();
      loadModules();
      
      // Logout handler
      document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/simple-login.html';
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'direct-dashboard.html'), content);
  console.log('Created direct-dashboard.html');
  
  return true;
}

// Run all fixes
try {
  console.log('Applying fixes to help with the admin interface...');
  
  // Create fixed admin.js
  createAdminJs();
  
  // Create direct dashboard
  createDirectDashboard();
  
  // Create database fix script
  createDbFixScript();
  
  console.log('\nFixes applied successfully!');
  console.log('\nNext steps:');
  console.log('1. Run the database fix script: node scripts/fix-db-module-issues.js');
  console.log('2. Restart your server');
  console.log('3. Visit http://localhost:3000/direct-dashboard.html to see a working dashboard');
  console.log('4. Include admin-fixed.js in your admin page');
  
} catch (err) {
  console.error('Error applying fixes:', err);
}