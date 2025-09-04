// Save as scripts/add-csp-middleware.js
const fs = require('fs');
const path = require('path');

// First, create the middleware file
function createCspMiddleware() {
  const middlewareDir = path.join(__dirname, 'src', 'middleware');
  
  // Ensure middleware directory exists
  if (!fs.existsSync(middlewareDir)) {
    fs.mkdirSync(middlewareDir, { recursive: true });
  }
  
  const middlewareContent = `/**
 * Custom middleware to set Content Security Policy headers
 */
function cspMiddleware(req, res, next) {
  // Set a more permissive CSP policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';"
  );
  next();
}

module.exports = cspMiddleware;
`;
  
  fs.writeFileSync(path.join(middlewareDir, 'cspMiddleware.js'), middlewareContent);
  console.log('✅ Created cspMiddleware.js');
}

// Now update index.js to use this middleware
function updateIndexJs() {
  const indexJsPath = path.join(__dirname, 'src', 'index.js');
  
  if (!fs.existsSync(indexJsPath)) {
    console.error(`Error: Cannot find ${indexJsPath}`);
    return false;
  }
  
  let content = fs.readFileSync(indexJsPath, 'utf8');
  
  // Add middleware import
  if (!content.includes('cspMiddleware')) {
    const importStatement = "const cspMiddleware = require('./middleware/cspMiddleware');\n";
    
    // Find a good spot to insert the import (after other imports)
    let lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(') || lines[i].includes('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
    } else {
      // Just add at the beginning if we can't find imports
      lines.unshift(importStatement);
    }
    
    content = lines.join('\n');
  }
  
  // Add middleware use
  if (!content.includes('app.use(cspMiddleware)')) {
    // Find a good spot to insert middleware (before routes)
    content = content.replace(
      // Insert before static files middleware
      'app.use(express.static(',
      'app.use(cspMiddleware);\n\n// Serve static files\napp.use(express.static('
    );
  }
  
  // Disable or replace helmet CSP
  if (content.includes('app.use(helmet())')) {
    content = content.replace(
      'app.use(helmet());',
      `app.use(helmet({
  contentSecurityPolicy: false, // Disable Helmet's CSP in favor of our custom middleware
}));`
    );
  }
  
  fs.writeFileSync(indexJsPath, content);
  console.log('✅ Updated src/index.js to use custom CSP middleware');
  return true;
}

// Execute the updates
createCspMiddleware();
updateIndexJs();