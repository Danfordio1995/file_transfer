// Save as scripts/move-inline-scripts.js
const fs = require('fs');
const path = require('path');

// Function to extract inline scripts from a specific HTML file
function extractInlineScriptsFromFile(htmlFilePath, outputDir) {
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Read the HTML file
  if (!fs.existsSync(htmlFilePath)) {
    console.log(`File not found: ${htmlFilePath}`);
    return false;
  }
  
  let html = fs.readFileSync(htmlFilePath, 'utf8');
  const filename = path.basename(htmlFilePath, '.html');
  
  // Simple regex to find script tags with content
  const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
  let scriptMatch;
  let scriptCount = 0;
  let modified = false;
  
  // Replace each inline script with a reference to an external file
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    scriptCount++;
    const scriptContent = scriptMatch[1].trim();
    
    if (scriptContent) {
      // Create a new JavaScript file
      const jsFilename = `${filename}-${scriptCount}.js`;
      const jsFilePath = path.join(outputDir, jsFilename);
      
      // Write the script content to the file
      fs.writeFileSync(jsFilePath, scriptContent);
      console.log(`Created ${jsFilename}`);
      
      // Replace the inline script with a reference to the external file
      html = html.replace(
        scriptMatch[0],
        `<script src="/js/${jsFilename}"></script>`
      );
      
      modified = true;
    }
  }
  
  // Save the modified HTML if changes were made
  if (modified) {
    fs.writeFileSync(htmlFilePath, html);
    console.log(`Updated ${htmlFilePath} with external script references`);
    return true;
  }
  
  return false;
}

// Process the HTML files
function processHtmlFiles() {
  const jsDir = path.join(__dirname, 'public', 'js');
  
  // Process the login page
  const loginHtmlPath = path.join(__dirname, 'public', 'simple-login.html');
  extractInlineScriptsFromFile(loginHtmlPath, jsDir);
  
  // Process the dashboard page
  const dashboardHtmlPath = path.join(__dirname, 'public', 'simple-dashboard.html');
  extractInlineScriptsFromFile(dashboardHtmlPath, jsDir);
  
  console.log('Done processing HTML files');
}

processHtmlFiles();