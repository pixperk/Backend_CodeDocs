const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error stack trace for debugging
  
    // Set default error message and status code
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
  
    // Respond to the client
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
    });
  };
  
  module.exports = errorHandler;
  