const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define upload path: assets/reports
const uploadDir = path.join(process.cwd(), "assets", "reports");

// Create folder if not exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created reports folder: assets/reports/");
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const eventReqId = req.body.event_req_id || "unknown";
    const timestamp = Date.now();
    const fileName = `event-${eventReqId}-${timestamp}${ext}`;
    cb(null, fileName);
  },
});

// Allow only PDFs, Word docs, and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf, .doc, .docx, .jpg, .jpeg, and .png files are allowed!"));
  }
};

const uploadReport = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Export the middleware function for single file upload
module.exports = uploadReport.single('report_file');

