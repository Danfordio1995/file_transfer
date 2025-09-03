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
