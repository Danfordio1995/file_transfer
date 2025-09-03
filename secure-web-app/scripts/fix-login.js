cat > fix-login.js << 'EOF'
const fs = require('fs');

// Read the main.js file
const mainJsPath = 'public/js/main.js';
let content = fs.readFileSync(mainJsPath, 'utf8');

// Add debugging console.log statements to the handleLogin function
const updated = content.replace(
  /async function handleLogin\(e\) {/,
  'async function handleLogin(e) {\n  console.log("Login form submitted");\n  console.log("Username:", document.getElementById("username").value);\n  console.log("Password:", document.getElementById("password").value);\n'
);

// Write the updated file
fs.writeFileSync(mainJsPath, updated);
console.log('Added debugging to handleLogin function');
EOF