/**
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
