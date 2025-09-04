// Save as fix-csp-simple.js
const fs = require('fs');
const path = require('path');

// Update index.js with proper helmet configuration
function updateIndexJs() {
  const indexJsPath = path.join(__dirname, 'src', 'index.js');
  
  if (!fs.existsSync(indexJsPath)) {
    console.error(`Error: Cannot find ${indexJsPath}`);
    return false;
  }
  
  let content = fs.readFileSync(indexJsPath, 'utf8');
  
  // Remove any reference to cspMiddleware that might have been added
  content = content.replace(/const cspMiddleware = require\([^)]+\);/, '');
  content = content.replace(/app\.use\(cspMiddleware\);/, '');
  
  // Replace the basic helmet configuration
  if (content.includes('app.use(helmet());')) {
    const updatedContent = content.replace(
      'app.use(helmet());',
      `app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],   // Allow inline styles
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
    
    fs.writeFileSync(indexJsPath, updatedContent);
    console.log('✅ Updated Helmet configuration in src/index.js');
    return true;
  } else {
    console.log('⚠️ Could not find basic Helmet configuration in src/index.js');
    console.log('You may need to manually update your CSP configuration.');
    return false;
  }
}

// Execute the update
updateIndexJs();