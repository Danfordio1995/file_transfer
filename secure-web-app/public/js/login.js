// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
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
});
