// routes/admin/adminRoutes.js
const express = require("express");
const { 
  getSocietiesByRole,
  getSocietyById,
  updateSocietyStatus,
  boardUpdateStatus,
  boardSecretaryUpdateStatus,
  boardPresidentUpdateStatus,
  registrarUpdateStatus,
  vcUpdateStatus,
  getAllStatuses,
  getAllowedStatuses,
  getSocietyStatusHistory,
  getAllSocietiesAdmin,
  deleteSociety,
  getAllEventsAdmin,
  getAllStudentsAdmin,
  deleteStudent,
  createAdvisor
} = require("../../controllers/admin/adminControllers.js");
const {
  getAllEventRequests,
  getEventRequestById,
  approveEventRequest,
  boardReviewEvent,
  boardSecretaryReviewEvent,
  boardPresidentReviewEvent,
  registrarReviewEvent,
  vcReviewEvent
} = require("../../controllers/event/eventRequestController.js");
const authMiddleware = require("../../middleware/authMiddleware");
const router = express.Router();

// All admin routes are protected with authentication
router.use(authMiddleware);

// ============ SOCIETY VIEWING ROUTES ============
// Get all societies for admin (no role filter)
router.get("/societies", getAllSocietiesAdmin);                // GET /admin/societies

// Universal fetch and role-targeted lists
router.post("/societies-by-role", getSocietiesByRole);        // POST /admin/societies-by-role
 
// Get specific society details (with status history)
router.get("/societies/:id", getSocietyById);                 // GET /admin/societies/:id

// Delete a society
router.delete("/societies/:id", deleteSociety);               // DELETE /admin/societies/:id

// ============ STATUS MANAGEMENT ROUTES ============
// General status update (for admin use)
router.put("/societies/:id/status", updateSocietyStatus);     // PUT /admin/societies/:id/status

// Board Secretary: Approve or Reject (status 1 -> 2 or 3)
// Body: { action: 'approve'/'reject', note: 'optional note', changed_by: user_id }
router.put("/board-secretary/societies/:id/review", boardSecretaryUpdateStatus); // PUT /admin/board-secretary/societies/:id/review

// Board President: Approve or Reject (status 2 -> 4 or 5)
// Body: { action: 'approve'/'reject', note: 'optional note', changed_by: user_id }
router.put("/board-president/societies/:id/review", boardPresidentUpdateStatus); // PUT /admin/board-president/societies/:id/review

// Legacy: Society Board (same as Board Secretary)
router.put("/board/societies/:id/review", boardUpdateStatus); // PUT /admin/board/societies/:id/review

// Registrar: Approve or Reject (status 4 -> 6 or 7)
// Body: { action: 'approve'/'reject', note: 'optional note', changed_by: user_id }
router.put("/registrar/societies/:id/review", registrarUpdateStatus); // PUT /admin/registrar/societies/:id/review

// Vice Chancellor: Approve or Reject (status 6 -> 8 or 9, then auto-set to 10 if approved)
// Body: { action: 'approve'/'reject', note: 'optional note', changed_by: user_id }
router.put("/vc/societies/:id/review", vcUpdateStatus);       // PUT /admin/vc/societies/:id/review

// ============ UTILITY ROUTES ============
// Get all available statuses
router.get("/statuses", getAllStatuses);                      // GET /admin/statuses

// Get allowed statuses for a role and current status
// Query params: ?role=board_secretary&current_status_id=1
router.get("/allowed-statuses", getAllowedStatuses);          // GET /admin/allowed-statuses

// Get status history for a specific society
router.get("/societies/:id/history", getSocietyStatusHistory); // GET /admin/societies/:id/history

// ============ EVENT REQUEST ROUTES ============
// Get all event requests (admin view)
router.post("/event-requests", getAllEventRequests);             // GET /admin/event-requests

// Get event request by ID
router.get("/event-requests/:id", getEventRequestById);         // GET /admin/event-requests/:id

 

// Approve event request and add to events table
// Body: { changed_by: user_id, note: string }
router.put("/event-requests/:id/approve", approveEventRequest);    // PUT /admin/event-requests/:id/approve

// Staged review endpoints for events (Board Secretary -> Board President -> Registrar -> VC)
// Body: { action: 'approve'|'reject', note?: string, changed_by: user_id }
router.put("/board-secretary/event-requests/:id/review", boardSecretaryReviewEvent);
router.put("/board-president/event-requests/:id/review", boardPresidentReviewEvent);
router.put("/board/event-requests/:id/review", boardReviewEvent); // Legacy
router.put("/registrar/event-requests/:id/review", registrarReviewEvent);
router.put("/vc/event-requests/:id/review", vcReviewEvent);

// ============ EVENT MANAGEMENT ROUTES ============
// Get all events for admin
router.get("/events", getAllEventsAdmin);                     // GET /admin/events

// ============ EVENT REPORT ROUTES ============
const {
  uploadEventReport,
  getEventReportsByEventId,
  getAllEventReports,
  getEventReportById
} = require("../../controllers/event/eventReportController.js");

// Get all event reports (for VC)
router.get("/event-reports", getAllEventReports);             // GET /admin/event-reports

// Get event reports by event request ID
router.get("/event-reports/event/:event_req_id", getEventReportsByEventId); // GET /admin/event-reports/event/:event_req_id

// Get event report by ID
router.get("/event-reports/:report_id", getEventReportById);  // GET /admin/event-reports/:report_id

// ============ STUDENT MANAGEMENT ROUTES ============
// Get all students for admin
router.get("/students", getAllStudentsAdmin);                 // GET /admin/students

// Delete a student
router.delete("/students/:id", deleteStudent);                // DELETE /admin/students/:id

// Create advisor account
router.post("/create-advisor", createAdvisor);                // POST /admin/create-advisor

module.exports = router;
