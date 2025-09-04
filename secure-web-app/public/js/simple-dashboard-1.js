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