const fs = require('fs');
const path = require('path');

// Create the external JavaScript file
function createLoginJsFile() {
  const loginJsContent = `// Login page functionality
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
`;

  // Ensure the directory exists
  const jsDir = path.join(__dirname, 'public', 'js');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }

  // Write the login.js file
  fs.writeFileSync(path.join(jsDir, 'login.js'), loginJsContent);
  console.log('Created public/js/login.js file');
}

// Update the simple-login.html file
function updateLoginHtmlFile() {
  const loginHtmlPath = path.join(__dirname, 'public', 'simple-login.html');
  
  // Check if the file exists
  if (!fs.existsSync(loginHtmlPath)) {
    console.error('Error: simple-login.html file not found!');
    return false;
  }
  
  let htmlContent = fs.readFileSync(loginHtmlPath, 'utf8');
  
  // Replace the inline script with a reference to the external file
  const updatedHtml = htmlContent.replace(
    /<script>[\s\S]*?<\/script>/,
    '<script src="/js/login.js"></script>'
  );
  
  // Write the updated file
  fs.writeFileSync(loginHtmlPath, updatedHtml);
  console.log('Updated simple-login.html file');
  
  return true;
}

// Create or update middleware to set correct CSP headers
function updateCspMiddleware() {
  const indexJsPath = path.join(__dirname, 'src', 'index.js');
  
  // Check if the file exists
  if (!fs.existsSync(indexJsPath)) {
    console.error('Error: src/index.js file not found!');
    return false;
  }
  
  let indexContent = fs.readFileSync(indexJsPath, 'utf8');
  
  // Check if helmet is already used and modify its configuration
  if (indexContent.includes('helmet(')) {
    // If helmet is already used without configuration, replace it with configured version
    if (indexContent.includes('app.use(helmet());')) {
      indexContent = indexContent.replace(
        'app.use(helmet());',
        `app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  }
}));`
      );
    } else {
      console.log('Helmet already configured. Please ensure it allows scripts from "self".');
    }
  } else {
    console.log('Helmet middleware not found. Please add the necessary CSP configuration.');
    return false;
  }
  
  // Write the updated file
  fs.writeFileSync(indexJsPath, indexContent);
  console.log('Updated src/index.js with proper CSP configuration');
  
  return true;
}

// Ensure proper CSP configuration in Express app
function createCspFixForExpressApp() {
  // Create a helper script for users to manually apply if needed
  const helperScript = `
// This script shows how to properly configure your Express app to handle CSP
// You may need to integrate this into your existing app manually

const express = require('express');
const helmet = require('helmet');

// Your Express app
const app = express();

// Configure CSP properly
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // Only allow scripts from same origin
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  }
}));

// Rest of your app configuration
// ...

module.exports = app;
`;

  fs.writeFileSync(path.join(__dirname, 'scripts', 'configure-csp.js'), helperScript);
  console.log('Created helper script at scripts/configure-csp.js');
}

// Execute all the fixes
function applyAllFixes() {
  console.log('Applying fixes for CSP error...');
  
  // Create login.js file
  createLoginJsFile();
  
  // Update simple-login.html
  const htmlUpdated = updateLoginHtmlFile();
  
  // Update CSP middleware
  const cspUpdated = updateCspMiddleware();
  
  // Create helper script
  createCspFixForExpressApp();
  
  console.log('\nSummary of changes:');
  console.log('- Created public/js/login.js with login functionality');
  console.log(`- Updated simple-login.html: ${htmlUpdated ? '✅ Success' : '❌ Failed'}`);
  console.log(`- Updated CSP configuration: ${cspUpdated ? '✅ Success' : '❌ Partial/Failed'}`);
  console.log('- Created helper script for manual CSP configuration');
  
  console.log('\nTo fix the CSP issue:');
  console.log('1. Make sure the login script is properly loaded');
  console.log('2. If CSP errors persist, check that your helmet configuration is correct');
  console.log('3. You may need to restart your server for the changes to take effect');
  
  if (!htmlUpdated || !cspUpdated) {
    console.log('\nNOTE: Some changes could not be applied automatically.');
    console.log('Please check the logs above for details and make the necessary manual adjustments.');
  }
}

// Run the script
applyAllFixes();