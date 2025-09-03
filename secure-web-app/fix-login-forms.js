
const fs = require('fs');
const path = require('path');

// Path to auth.js
const authJsPath = path.join(__dirname, 'public/js/auth.js');

try {
  // Read the file
  let content = fs.readFileSync(authJsPath, 'utf8');
  
  // Find and fix the login function
  const fixedContent = content.replace(
    /async function login\(([^)]*)\)\s*{([\s\S]*?)}/m,
    `async function login(username, password) {
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
}`
  );
  
  // Write the updated file
  fs.writeFileSync(authJsPath, fixedContent);
  
  console.log('Fixed login function in auth.js');
} catch (err) {
  console.error('Error fixing auth.js:', err.message);
}

// Also fix handleLogin in main.js
const mainJsPath = path.join(__dirname, 'public/js/main.js');

try {
  // Read the file
  let content = fs.readFileSync(mainJsPath, 'utf8');
  
  // Find and fix the handleLogin function
  const fixedContent = content.replace(
    /async function handleLogin\(e\)\s*{([\s\S]*?)}/m,
    `async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginError = document.getElementById('loginError');
  
  console.log('Login attempt:', { username, password });
  
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
}`
  );
  
  // Write the updated file
  fs.writeFileSync(mainJsPath, fixedContent);
  
  console.log('Fixed handleLogin function in main.js');
} catch (err) {
  console.error('Error fixing main.js:', err.message);
}
