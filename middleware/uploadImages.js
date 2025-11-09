const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const baseDir = "assets";
      const imagesDir = path.join(baseDir, "images");

      // Use society name if available, else fallback
      let societyName = req.body?.name
        ? req.body.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
        : "society_" + Date.now();

      const societyPath = path.join(imagesDir, societyName);

      // Store path for later if needed
      if (!req.societyData) req.societyData = {};
      req.societyData.uploadPath = societyPath;

      // Ensure folders exist
      await fs.mkdir(imagesDir, { recursive: true });
      await fs.mkdir(societyPath, { recursive: true });

      cb(null, societyPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const filename = file.fieldname === "societyLogo" ? "logo" : "cover";
    cb(null, `${filename}${path.extname(file.originalname)}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
    return cb(new Error("Only image files (jpg, jpeg, png) are allowed!"), false);
  }
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
}).fields([
  { name: "societyLogo", maxCount: 1 },
  { name: "coverPhoto", maxCount: 1 },
]);

// Middleware
const uploadImages = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "File upload error", error: err.message });
    } else if (err) {
      return res.status(400).json({ message: "Error uploading files", error: err.message });
    }

    // ✅ Now multer already gave us fields in req.body + req.files
    if (req.files?.societyLogo) {
      req.body.societyLogo = req.files.societyLogo[0].path;
    }
    if (req.files?.coverPhoto) {
      req.body.coverPhoto = req.files.coverPhoto[0].path;
    }

    next();
  });
};

module.exports = uploadImages;
