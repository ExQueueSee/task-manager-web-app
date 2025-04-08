const multer = require('multer');

// Configure file storage in memory
const storage = multer.memoryStorage();

// Create file filter - 10MB limit and common file types
const fileFilter = (req, file, cb) => {
  // Check file type if needed
  cb(null, true);
};

// Configure multer with 10MB size limit
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB in bytes
  },
  fileFilter: fileFilter
});

module.exports = upload;