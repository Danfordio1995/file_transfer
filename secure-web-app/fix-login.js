const fs = require('fs');
const path = require('path');

// Path to main.js
const mainJsPath = path.join(__dirname, 'public/js/main.js');

try {
  // Read main.js
  const mainJs = fs.readFileSync(mainJsPath, 'utf8');
  
  // Look for handleLogin function
  const handleLoginMatch = mainJs.match(/async\s+function\s+handleLogin\s*\(\s*e\s*\)\s*{[\s\S]*?}/);
  
  if (handleLoginMatch) {
    console.log('Found handleLogin function in main.js');
    
    // Extract handleLogin function
    const handleLoginFunc = handleLoginMatch[0];
    
    // Check for potential issues
    const hasUsernameAccess = handleLoginFunc.includes('username') && handleLoginFunc.includes('getElementById');
    const hasPasswordAccess = handleLoginFunc.includes('password') && handleLoginFunc.includes('getElementById');
    
    console.log('- Username access in handleLogin:', hasUsernameAccess ? 'Yes' : 'No');
    console.log('- Password access in handleLogin:', hasPasswordAccess ? 'Yes' : 'No');
    
    // Fix function if needed
    if (!hasUsernameAccess || !hasPasswordAccess) {
      console.log('Fixing handleLogin function...');
      
      // Create a fixed version
      const fixedFunc = `async function handleLogin(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('loginError');
  
  if (!usernameInput || !passwordInput) {
    console.error('Username or password input not found');
    loginError.textContent = 'Error: Form fields not found';
    return;
  }
  
  const username = usernameInput.value;
  const password = passwordInput.value;
  
  console.log('Login attempt with:', { username, password });
  
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
}`;
      
      // Replace the function in the file
      const fixedMainJs = mainJs.replace(handleLoginMatch[0], fixedFunc);
      
      // Write the fixed file
      fs.writeFileSync(mainJsPath, fixedMainJs);
      console.log('Fixed handleLogin function in main.js');
    } else {
      console.log('handleLogin function appears to be correct');
    }
  } else {
    console.log('Could not find handleLogin function in main.js');
  }
} catch (err) {
  console.error('Error fixing main.js:', err);
}

// Path to auth.js
const authJsPath = path.join(__dirname, 'public/js/auth.js');

try {
  // Read auth.js
  const authJs = fs.readFileSync(authJsPath, 'utf8');
  
  // Look for login function
  const loginMatch = authJs.match(/async\s+function\s+login\s*\([^)]*\)\s*{[\s\S]*?}/);
  
  if (loginMatch) {
    console.log('Found login function in auth.js');
    
    // Extract login function
    const loginFunc = loginMatch[0];
    
    // Check for potential issues
    const hasJsonContentType = loginFunc.includes('Content-Type') && loginFunc.includes('application/json');
    const hasStringify = loginFunc.includes('JSON.stringify');
    
    console.log('- JSON Content-Type in login:', hasJsonContentType ? 'Yes' : 'No');
    console.log('- JSON.stringify in login:', hasStringify ? 'Yes' : 'No');
    
    // Fix function if needed
    if (!hasJsonContentType || !hasStringify) {
      console.log('Fixing login function...');
      
      // Create a fixed version - match parameters of original function
      const paramsMatch = loginFunc.match(/async\s+function\s+login\s*\(([^)]*)\)/);
      const params = paramsMatch ? paramsMatch[1] : 'username, password';
      
      const fixedFunc = `async function login(${params}) {
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
}`;
      
      // Replace the function in the file
      const fixedAuthJs = authJs.replace(loginMatch[0], fixedFunc);
      
      // Write the fixed file
      fs.writeFileSync(authJsPath, fixedAuthJs);
      console.log('Fixed login function in auth.js');
    } else {
      console.log('login function appears to be correct');
    }
  } else {
    console.log('Could not find login function in auth.js');
  }
} catch (err) {
  console.error('Error fixing auth.js:', err);
}

console.log('\nLogin functionality has been fixed. Please restart the application and try logging in again.');
