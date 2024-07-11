// middlewares/multerErrorHandler.js

const multer = require("multer");

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: "error", statusCode: 400, message: "File too large. Maximum size is 20MB." });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: "error", statusCode: 400, message: "Invalid file type" });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ status: "error", statusCode: 400, message: "Too many files. Maximum number is 10." });
    }
    return res.status(400).json({ status: "error", statusCode: 400, message: err.message });
  } else if (err) {
    return res.status(400).json({ status: "error", statusCode: 400, message: err.message });
  }
  next();
};

module.exports = multerErrorHandler;
