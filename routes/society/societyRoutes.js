// routes/society/societyRoutes.js
const express = require("express");
const { 
  getSocietyMembershipRequests, 
  getSocietyDataByUser, 
  approveMembershipRequest,
  upsertMembershipSettings,
  RejectMembershipRequest,
  getMembershipSettingsBySociety, 
  createPost,
  getSocietyPosts,
  getSocietyEvents
} = require("../../controllers/society/societyController.js");
const {
  createEventRequest,
  getEventRequestsBySociety
} = require("../../controllers/event/eventRequestController.js");
const authMiddleware = require("../../middleware/authMiddleware.js");
const { uploadMiddleware } = require("../../middleware/uploadPost.js");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Society routes
router.post("/membership/requests", getSocietyMembershipRequests);
router.post("/society/data", getSocietyDataByUser);
router.post("/membership/approve", approveMembershipRequest);   
router.post("/membership/settings", upsertMembershipSettings);   
router.post("/membership/reject", RejectMembershipRequest);   
router.post("/membership/form", getMembershipSettingsBySociety);   

// Post creation route with file upload
router.post("/create", uploadMiddleware, createPost);

// Get all posts for a society
router.post("/posts", getSocietyPosts);

// Get all events for a society
router.post("/events", getSocietyEvents);

// Event Request routes
// Create event request
router.post("/event-request/create", createEventRequest);

// Get event requests by society
router.post("/event-request/list", getEventRequestsBySociety);

module.exports = router;