// src/utils/logger.js
const winston = require('winston');
const path = require('path');
const config = require('../../config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = config.nodeEnv || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: [${info.service}] ${info.message}`
  )
);

// Define format for file output (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: [${info.service}] ${info.message}`
  )
);

// Create a logger factory
function createLogger(service) {
  return winston.createLogger({
    level: level(),
    levels,
    defaultMeta: { service },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
      }),
      
      // File transport for errors
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
}

module.exports = { createLogger };
