cat > add-debug-route.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Path to authRoutes.js
const routesPath = path.join(__dirname, 'src/routes/authRoutes.js');

try {
  // Read the file
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // Find the position to insert the debug route (before the module.exports line)
  const position = content.lastIndexOf('module.exports');
  
  // Debug route to add
  const debugRoute = `
/**
 * @route POST /api/auth/debug
 * @desc Debug login request
 * @access Public
 */
router.post('/debug', (req, res) => {
  console.log('DEBUG LOGIN REQUEST:');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  res.json({
    message: 'Debug info logged to server console',
    receivedBody: req.body
  });
});

`;
  
  // Insert the debug route
  const updatedContent = content.substring(0, position) + debugRoute + content.substring(position);
  
  // Write the updated file
  fs.writeFileSync(routesPath, updatedContent);
  
  console.log('Added debug route to authRoutes.js');
} catch (err) {
  console.error('Error adding debug route:', err.message);
}

// Now create a test HTML file to use the debug route
const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Login Form Debug</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .container { max-width: 600px; margin: 0 auto; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; }
    input { width: 100%; padding: 8px; font-size: 16px; }
    button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
    pre { background: #f5f5f5; padding: 15px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login Form Debugger</h1>
    
    <div class="debug-panel">
      <h2>Debug Info</h2>
      <pre id="requestInfo">Click "Test Standard Request" or "Test Raw Request" to see debug info</pre>
    </div>
    
    <div class="form">
      <h2>Test Form</h2>
      <div class="form-group">
        <label for="username">Username:</label>
        <input type="text" id="username" value="admin">
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" value="admin-password">
      </div>
      <div class="actions">
        <button id="testStandard">Test Standard Request</button>
        <button id="testRaw">Test Raw Request</button>
        <button id="realLogin">Try Real Login</button>
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById('testStandard').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Make a standard fetch request with JSON content type
        const response = await fetch('/api/auth/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        document.getElementById('requestInfo').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('testRaw').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Make a raw fetch request to mimic a form submission
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('/api/auth/debug', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        document.getElementById('requestInfo').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('realLogin').addEventListener('click', async () => {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        // Try a real login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          document.getElementById('requestInfo').textContent = 'LOGIN SUCCESS!\n\n' + JSON.stringify(data, null, 2);
        } else {
          document.getElementById('requestInfo').textContent = 'LOGIN FAILED:\n\n' + JSON.stringify(data, null, 2);
        }
      } catch (error) {
        document.getElementById('requestInfo').textContent = 'Error: ' + error.message;
      }
    });
  </script>
</body>
</html>`;

try {
  fs.writeFileSync(path.join(__dirname, 'public/debug-login.html'), testHtml);
  console.log('Created debug login form at public/debug-login.html');
} catch (err) {
  console.error('Error creating debug HTML:', err.message);
}

// Create a direct fix for the main login form
const fixScript = `
const fs = require('fs');
const path = require('path');

// Path to auth.js
const authJsPath = path.join(__dirname, 'public/js/auth.js');

try {
  // Read the file
  let content = fs.readFileSync(authJsPath, 'utf8');
  
  // Find and fix the login function
  const fixedContent = content.replace(
    /async function login\\(([^)]*)\\)\\s*{([\\s\\S]*?)}/m,
    \`async function login(username, password) {
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
}\`
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
    /async function handleLogin\\(e\\)\\s*{([\\s\\S]*?)}/m,
    \`async function handleLogin(e) {
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
}\`
  );
  
  // Write the updated file
  fs.writeFileSync(mainJsPath, fixedContent);
  
  console.log('Fixed handleLogin function in main.js');
} catch (err) {
  console.error('Error fixing main.js:', err.message);
}
`;

fs.writeFileSync('fix-login-forms.js', fixScript);
console.log('Created fix-login-forms.js to automatically fix the login issues');
EOF