const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securewebapp';

console.log('Connecting to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  fixEverything();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function fixEverything() {
  try {
    // Define schemas directly (to avoid circular dependencies)
    const userSchema = new mongoose.Schema({
      username: String,
      password: String,
      email: String,
      role: String,
      authType: String,
      isActive: Boolean
    });

    const roleSchema = new mongoose.Schema({
      name: String,
      description: String,
      level: Number,
      permissions: [{ 
        moduleId: String, 
        description: String 
      }]
    });

    const moduleSchema = new mongoose.Schema({
      moduleId: String,
      name: String,
      description: String,
      tooltip: String,
      icon: String,
      scriptName: String,
      isActive: Boolean,
      parameterDefinitions: [{
        name: String,
        description: String,
        type: String,
        required: Boolean,
        defaultValue: mongoose.Schema.Types.Mixed,
        validationPattern: String,
        validationMessage: String
      }]
    });

    // Create models
    const User = mongoose.model('User', userSchema);
    const Role = mongoose.model('Role', roleSchema);
    const Module = mongoose.model('Module', moduleSchema);

    // 1. Check and create modules
    console.log('\nChecking modules...');
    const existingModules = await Module.find({});
    
    if (existingModules.length === 0) {
      console.log('No modules found. Creating default modules...');
      
      const defaultModules = [
        {
          moduleId: 'system_info',
          name: 'System Information',
          description: 'Display system information including CPU, memory, and disk usage',
          tooltip: 'View detailed system information',
          icon: 'server',
          scriptName: 'system-info.sh',
          isActive: true,
          parameterDefinitions: [
            {
              name: 'format',
              description: 'Output format',
              type: 'string',
              required: false,
              defaultValue: 'text',
              validationPattern: '^(text|json|csv)$',
              validationMessage: 'Format must be one of: text, json, csv'
            }
          ]
        },
        {
          moduleId: 'user_list',
          name: 'User List',
          description: 'List all system users',
          tooltip: 'View all system users',
          icon: 'users',
          scriptName: 'user-list.sh',
          isActive: true,
          parameterDefinitions: [
            {
              name: 'sortBy',
              description: 'Sort by field',
              type: 'string',
              required: false,
              defaultValue: 'name',
              validationPattern: '^(name|uid|gid)$',
              validationMessage: 'Sort field must be one of: name, uid, gid'
            }
          ]
        }
      ];
      
      for (const module of defaultModules) {
        await Module.findOneAndUpdate(
          { moduleId: module.moduleId },
          module,
          { upsert: true, new: true }
        );
      }
      
      console.log(`Created ${defaultModules.length} default modules`);
    } else {
      console.log(`Found ${existingModules.length} existing modules`);
    }
    
    // 2. Check and update roles
    console.log('\nChecking roles...');
    const roles = await Role.find({});
    
    // Make sure we have roles
    if (roles.length === 0) {
      console.log('No roles found. Creating default roles...');
      
      const defaultRoles = [
        {
          name: 'admin',
          description: 'Administrator with full access',
          level: 0,
          permissions: []
        },
        {
          name: 'manager',
          description: 'Manager with elevated privileges',
          level: 5,
          permissions: []
        },
        {
          name: 'user',
          description: 'Standard user',
          level: 10,
          permissions: []
        }
      ];
      
      for (const role of defaultRoles) {
        await Role.findOneAndUpdate(
          { name: role.name },
          role,
          { upsert: true, new: true }
        );
      }
      
      console.log(`Created ${defaultRoles.length} default roles`);
    } else {
      console.log(`Found ${roles.length} existing roles`);
    }
    
    // 3. Update role permissions
    console.log('\nUpdating role permissions...');
    
    // Get up-to-date data
    const modules = await Module.find({ isActive: true });
    const adminRole = await Role.findOne({ name: 'admin' });
    
    // Update admin permissions
    if (adminRole) {
      // Clear existing permissions
      adminRole.permissions = [];
      
      // Add all modules
      for (const module of modules) {
        adminRole.permissions.push({
          moduleId: module.moduleId,
          description: `Access to ${module.name}`
        });
      }
      
      await adminRole.save();
      console.log(`Updated admin role with ${modules.length} permissions`);
    }
    
    // Update user permissions
    const userRole = await Role.findOne({ name: 'user' });
    if (userRole) {
      // Clear existing permissions
      userRole.permissions = [];
      
      // Add system_info module
      const systemInfoModule = modules.find(m => m.moduleId === 'system_info');
      if (systemInfoModule) {
        userRole.permissions.push({
          moduleId: 'system_info',
          description: `Access to system information`
        });
        console.log('Updated user role with system_info permission');
      }
      
      await userRole.save();
    }
    
    // 4. Check admin user
    console.log('\nChecking admin user...');
    
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('Admin user not found!');
    } else {
      console.log(`Found admin user with role: ${adminUser.role}`);
      
      // Make sure admin user has admin role
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('Updated admin user role to admin');
      }
    }
    
    // 5. Create new dashboard page
    console.log('\nCreating new dashboard page...');
    
    const newDashboardPath = path.join(__dirname, '..', 'public', 'new-dashboard.html');
    const dashboardContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Web App - Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    header { background: #2c3e50; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
    .container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .user-info { display: flex; align-items: center; }
    .username { margin-right: 1rem; font-weight: bold; }
    .role { background: rgba(255,255,255,0.2); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 1rem; }
    button { background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); grid-gap: 1.5rem; margin-top: 2rem; }
    .module { background: white; padding: 1.5rem; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .module h3 { margin-top: 0; color: #2c3e50; }
    .module p { color: #7f8c8d; margin-bottom: 1.5rem; }
    .module button { background: #3498db; }
    .module button:hover { background: #2980b9; }
    h1, h2 { color: #2c3e50; }
    .debug-panel { background: #f9f9f9; padding: 1rem; border: 1px solid #ddd; margin-top: 2rem; border-radius: 5px; }
    .debug-panel h3 { margin-top: 0; }
    .debug-panel pre { background: #2c3e50; color: white; padding: 1rem; border-radius: 5px; overflow: auto; }
    .error { color: #e74c3c; }
    .loading { color: #3498db; font-style: italic; }
  </style>
</head>
<body>
  <header>
    <h1>Secure Web App</h1>
    <div class="user-info">
      <span id="username" class="username">Loading...</span>
      <span id="role" class="role">Loading...</span>
      <button id="logout">Logout</button>
    </div>
  </header>
  
  <div class="container">
    <h2>Dashboard</h2>
    <p>Welcome to the Secure Web Application. Your available modules are shown below.</p>
    
    <div id="modules" class="modules">
      <div class="loading">Loading modules...</div>
    </div>
    
    <!-- Debug information panel -->
    <div class="debug-panel">
      <h3>Debug Information</h3>
      <div id="debug"></div>
    </div>
  </div>

  <script>
    // Helper to add debug information
    function addDebugInfo(message, data = null) {
      const debug = document.getElementById('debug');
      const msgEl = document.createElement('p');
      msgEl.textContent = message;
      debug.appendChild(msgEl);
      
      if (data) {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(data, null, 2);
        debug.appendChild(pre);
      }
    }
    
    // Check authentication
    function checkAuth() {
      const token = localStorage.getItem('auth_token');
      addDebugInfo('Auth token present:', !!token);
      
      if (!token) {
        window.location.href = '/simple-login.html';
        return false;
      }
      
      const userJson = localStorage.getItem('auth_user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          document.getElementById('username').textContent = user.username;
          document.getElementById('role').textContent = user.role;
          
          addDebugInfo('User information:', user);
          return true;
        } catch (err) {
          addDebugInfo('Error parsing user data:', err);
          return false;
        }
      }
      
      return false;
    }
    
    // Load modules
    function loadModules() {
      const token = localStorage.getItem('auth_token');
      addDebugInfo('Fetching modules...');
      
      fetch('/api/modules', {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      })
      .then(response => {
        addDebugInfo(\`API Response Status: \${response.status}\`);
        
        if (!response.ok) {
          throw new Error(\`Failed to load modules: \${response.status}\`);
        }
        return response.json();
      })
      .then(data => {
        addDebugInfo('Modules API response:', data);
        const modules = data.modules || [];
        const modulesContainer = document.getElementById('modules');
        
        if (modules.length === 0) {
          modulesContainer.innerHTML = '<p class="error">No modules available for your role.</p>';
          return;
        }
        
        modulesContainer.innerHTML = '';
        
        modules.forEach(module => {
          const moduleEl = document.createElement('div');
          moduleEl.className = 'module';
          moduleEl.innerHTML = \`
            <h3>\${module.name}</h3>
            <p>\${module.description || 'No description available'}</p>
            <button class="execute-btn" data-id="\${module.id}">Execute Module</button>
          \`;
          
          modulesContainer.appendChild(moduleEl);
        });
        
        // Add event listeners to execute buttons
        document.querySelectorAll('.execute-btn').forEach(button => {
          button.addEventListener('click', function(e) {
            const moduleId = this.getAttribute('data-id');
            alert(\`Module \${moduleId} would be executed here.\`);
          });
        });
      })
      .catch(error => {
        console.error('Error loading modules:', error);
        addDebugInfo('Error loading modules:', error);
        
        const modulesContainer = document.getElementById('modules');
        modulesContainer.innerHTML = \`<p class="error">Error loading modules: \${error.message}</p>\`;
      });
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      addDebugInfo('Page loaded');
      
      if (checkAuth()) {
        loadModules();
      }
      
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
    
    fs.writeFileSync(newDashboardPath, dashboardContent);
    console.log('Created new dashboard page at public/new-dashboard.html');
    
    console.log('\nFix completed successfully!');
    console.log('\nInstructions:');
    console.log('1. Restart your server');
    console.log('2. Login as admin at: http://localhost:3000/simple-login.html');
    console.log('3. After login, manually navigate to: http://localhost:3000/new-dashboard.html');
    console.log('4. You should now see your modules with debugging information');
    
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  }
}