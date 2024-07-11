const multer = require('multer');
const path = require('path');
const fs = require('fs');

const blogFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/blog-files');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadBlogFiles = multer({
  storage: blogFileStorage,
  limits: { fileSize: 1024 * 1024 * 20 }, // 20MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx|mp4/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Invalid file type!');
    }
  },
}).array('blogFiles', 10); // Ensure the field name matches




module.exports = {uploadBlogFiles}