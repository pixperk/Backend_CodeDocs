const multer = require('multer');
const path = require('path');


// Set up storage for user profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Set up Multer for user profile pictures
const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

 if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  },
}).single('profilePicture');

module.exports = uploadProfilePicture;
