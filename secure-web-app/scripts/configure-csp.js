
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
