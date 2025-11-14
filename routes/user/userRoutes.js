// routes/user/userRoutes.js
const express = require("express");
const { 
  getAllSocieties, 
  GetActiveSocieties, 
  getSocietyById, 
  submitMembership,
  getUserMembershipRequests,
  updateUserProfile,
  toggleLike,
  addComment
} = require("../../controllers/user/userController.js");
const { uploadPayment } = require("../../middleware/uploadPayment.js");
const authMiddleware = require("../../middleware/authMiddleware.js");
const router = express.Router();

// Route to get all societies
router.get("/societies", getAllSocieties);
router.get("/active/societies", GetActiveSocieties);
router.get("/societies/:id", getSocietyById);
router.post("/membership/submit", authMiddleware, uploadPayment, submitMembership);
router.post("/membership/requests", authMiddleware, getUserMembershipRequests);
router.put("/update-profile", authMiddleware, updateUserProfile);
router.post("/like/toggle", authMiddleware, toggleLike);
router.post("/comment/add", authMiddleware, addComment);





module.exports = router;