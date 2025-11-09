// middleware/uploadPost.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Root folder for all posts
const ROOT_DIR = path.join(process.cwd(), "assets", "posts");

// Ensure base folder exists
if (!fs.existsSync(ROOT_DIR)) {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
  console.log("📁 Created base folder: assets/posts/");
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      console.log("📥 Processing file upload destination...");
      console.log("Request body:", req.body);
      
      // Try reading society_name from request body
      const societyName = req.body.society_name;

      // Default folder if society_name missing
      const folderName = societyName
        ? societyName.replace(/\s+/g, "_")
        : "general";

      const societyFolder = path.join(ROOT_DIR, folderName);

      // Ensure folder exists
      if (!fs.existsSync(societyFolder)) {
        fs.mkdirSync(societyFolder, { recursive: true });
        console.log(`📁 Created folder for society: ${societyFolder}`);
      }

      cb(null, societyFolder);
    } catch (err) {
      console.error("❌ Error in destination():", err);
      cb(err, null);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    console.log(`📄 Generated filename: ${uniqueName}`);
    cb(null, uniqueName);
  },
});

// Allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, videos, and PDFs allowed."));
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Safe wrapper for multer
const uploadMiddleware = (req, res, next) => {
  console.log("📥 Upload Middleware - Incoming Request...");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);

  upload.array("media", 10)(req, res, (err) => {
    if (err) {
      console.error("❌ Upload error:", err.message);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    console.log("✅ Files uploaded successfully:", req.files?.length || 0);
    console.log("📂 Uploaded files:", req.files?.map(f => f.path) || []);
    next();
  });
};

module.exports = { uploadMiddleware };