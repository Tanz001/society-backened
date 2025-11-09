// routes/auth/authRoutes.js
const express = require("express");
const { registerStudent, loginStudent, registerSociety } = require("../../controllers/auth/authController.js");
const uploadImages = require("../../middleware/uploadImages");
const debugMiddleware = require("../../middleware/debugMiddleware");
const authMiddleware = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/student/register", registerStudent);
router.post("/student/login", loginStudent);
router.post("/society/register", authMiddleware, debugMiddleware, uploadImages, registerSociety);

module.exports = router;
