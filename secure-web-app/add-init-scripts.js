const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read the file
let packageJson;
try {
  const data = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(data);
} catch (err) {
  console.error('Error reading package.json:', err.message);
  process.exit(1);
}

// Add initialization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts.init = 'node scripts/init-admin.js && node scripts/init-modules.js';
packageJson.scripts.postinstall = 'chmod +x scripts/*.sh';

// Write the file back
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Added initialization scripts to package.json');
} catch (err) {
  console.error('Error writing package.json:', err.message);
  process.exit(1);
}
