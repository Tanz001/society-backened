const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define upload path: assets/payments
const uploadDir = path.join(process.cwd(), "assets/payments");

// Create folder if not exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const rollNo = req.body.rollno || "unknown";
    const societyId = req.body.society_id || "unknown";
    const fileName = `${rollNo}-${societyId}${ext}`;
    cb(null, fileName);
  },
});

// Allow only images and pdfs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, .png, and .pdf files are allowed!"));
  }
};

const uploadPayment = multer({ storage, fileFilter });

// Export the middleware function for single file upload
module.exports = { uploadPayment: uploadPayment.single('payment_receipt') };
