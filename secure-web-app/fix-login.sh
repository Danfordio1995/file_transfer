#!/bin/bash

# Create a very simple login form
cat > public/simple-login.html << 'HTML_EOF'
<!DOCTYPE html>
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
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      var username = document.getElementById('username').value;
      var password = document.getElementById('password').value;
      var error = document.getElementById('error');
      
      error.textContent = '';
      
      // Make a fetch request to the login API
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.error) {
          error.textContent = data.error;
          return;
        }
        
        // Login successful
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        window.location.href = '/simple-dashboard.html';
      })
      .catch(function(err) {
        error.textContent = 'An error occurred during login';
        console.error('Login error:', err);
      });
    });
  </script>
</body>
</html>
HTML_EOF

# Create a simple dashboard
cat > public/simple-dashboard.html << 'HTML_EOF'
<!DOCTYPE html>
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
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
    }
    
    // Load modules
    function loadModules() {
      var token = localStorage.getItem('auth_token');
      
      fetch('/api/modules', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load modules');
        }
        return response.json();
      })
      .then(function(data) {
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
      checkAuth();
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
</html>
HTML_EOF

# Create a redirect from the root to the simple login
cat > public/index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=/simple-login.html">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="/simple-login.html">login page</a>...</p>
</body>
</html>
HTML_EOF

echo "Created simplified login and dashboard pages."
echo "Please restart your server and try logging in at http://localhost:3000/"
