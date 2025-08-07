import { ValidationError } from '../utils/validator.js';
import { HttpError } from '../utils/httpClient.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      field: err.field,
      errors: err.errors || []
    });
  }

  // HTTP errors from external APIs
  if (err instanceof HttpError) {
    return res.status(502).json({
      error: 'External API Error',
      message: 'Failed to communicate with external service',
      details: err.message
    });
  }

  // MongoDB/Database errors
  if (err.name === 'MongoError' || err.name === 'CastError') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'Database operation failed'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: 'Server Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;