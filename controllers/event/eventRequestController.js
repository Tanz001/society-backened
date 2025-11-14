const pool = require("../../database/db.js");

/* ============================================================
   GET ALL EVENT REQUESTS (Role-Based Visibility)
   ============================================================ */
   const getAllEventRequests = async (req, res) => {
    try {
      const role =
        (req.user && req.user.role) ||
        req.body.role; // ✅ only read from body if user.role not found
  
      console.log("🎭 Received role:", role);
  
      let query = `
        SELECT 
          er.req_id,
          er.title,
          er.description,
          er.event_date AS event_date,
          er.event_time AS event_time,
          er.venue AS venue,
          er.status_id,
          er.note,
          er.created_at,
          ss.status_name,
          s.name AS society_name,
          st.firstName,
          st.lastName,
          st.RollNO
        FROM event_req er
        LEFT JOIN society_statuses ss ON er.status_id = ss.status_id
        LEFT JOIN societies s ON er.society_id = s.society_id
        LEFT JOIN students st ON er.submitted_by = st.id
      `;
  
      // ✅ Role-based status filter
      // Each role sees:
      // 1. Their pending status (what they need to review)
      // 2. Higher approved statuses (to track what happened after their approval)
      // They do NOT see rejected statuses from lower levels
      let statusIds = [];
      switch (role?.toLowerCase()) {
        case "board_secretary":
          // See: Pending (1) to review, and all subsequent statuses (approved or rejected) to track outcome
          statusIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
          break;
        case "board_president":
          // See: Approved by Secretary (2) to review, and all subsequent statuses (approved or rejected) to track outcome
          statusIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
          break;
        case "society_board":
          // Legacy support - same as board_secretary
          statusIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
          break;
        case "registrar":
          // See: Approved by President (4) to review, and all subsequent statuses (approved or rejected) to track outcome
          statusIds = [4, 5, 6, 7, 8, 9, 10, 11];
          break;
        case "vc":
          // See: Approved by Registrar (6) to review, and all subsequent statuses (approved or rejected) to track outcome
          statusIds = [6, 7, 8, 9, 10, 11];
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid or missing role. Provide a valid role in body or user object.",
          });
      }
  
      // ✅ Add WHERE clause dynamically
      const placeholders = statusIds.map(() => "?").join(",");
      query += ` WHERE er.status_id IN (${placeholders}) 
                 ORDER BY 
                   CASE 
                     WHEN er.status_id = 1 THEN 1  -- Pending first for board_secretary
                     WHEN er.status_id = 2 THEN 2   -- Approved by Secretary first for board_president
                     WHEN er.status_id = 4 THEN 3   -- Approved by President first for registrar
                     WHEN er.status_id = 6 THEN 4   -- Approved by Registrar first for vc
                     ELSE 5                         -- Other statuses
                   END,
                   er.created_at DESC`;
  
      const [rows] = await pool.query(query, statusIds);
  
      res.status(200).json({
        success: true,
        message: `Event requests fetched successfully for role: ${role}`,
        data: rows,
      });
    } catch (error) {
      console.error("❌ Error fetching event requests:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching event requests",
        error: error.message,
      });
    }
  };
  
/* ============================================================
   GET EVENT REQUEST BY ID
   ============================================================ */
const getEventRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        er.*,
        ss.status_name,
        s.name AS society_name,
        CONCAT(st.firstName, ' ', st.lastName) AS president_name,
        st.email AS president_email
      FROM event_req er
      LEFT JOIN society_statuses ss ON er.status_id = ss.status_id
      LEFT JOIN societies s ON er.society_id = s.society_id
      LEFT JOIN students st ON er.submitted_by = st.id
      WHERE er.req_id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event request fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching event request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event request",
      error: error.message,
    });
  }
};

/* ============================================================
   CREATE EVENT REQUEST (Society)
   ============================================================ */
   const createEventRequest = async (req, res) => {
    const { society_id, submitted_by, title, description, event_date, event_time, venue } = req.body;
    const connection = await pool.getConnection();
  
    try {
      if (!submitted_by) {
        connection.release();
        return res.status(400).json({ success: false, message: "submitted_by is required" });
      }

      await connection.query("START TRANSACTION");
  
      const [result] = await connection.query(
        `
        INSERT INTO event_req 
        (society_id, submitted_by, title, description, event_date, event_time, venue, status_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `,
        [society_id, submitted_by, title, description, event_date, event_time, venue]
      );

      const eventReqId = result.insertId;

      // Add initial status history entry (Pending)
      await connection.query(
        "INSERT INTO event_status_history (event_req_id, status_id, changed_by, remarks, changed_at) VALUES (?, 1, ?, 'Event request submitted', NOW())",
        [eventReqId, submitted_by]
      );
  
      await connection.query("COMMIT");
      connection.release();

      res.status(201).json({ success: true, message: "Event request created successfully", result });
    } catch (error) {
      await connection.query("ROLLBACK");
      connection.release();
      console.error("Error creating event request:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
/* ============================================================
   GET EVENT REQUESTS BY SOCIETY (Society)
   ============================================================ */
const getEventRequestsBySociety = async (req, res) => {
  try {
    const { society_id } = req.body;

    if (!society_id || isNaN(society_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid society_id is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        er.req_id, 
        er.title, 
        er.description, 
        er.event_date, 
        er.event_time, 
        er.venue, 
        er.status_id,
        er.note,
        er.created_at,
        er.updated_at,
        ss.status_name,
        ss.description as status_description
      FROM event_req er
      LEFT JOIN society_statuses ss ON er.status_id = ss.status_id
      WHERE er.society_id = ?
      ORDER BY er.created_at DESC
      `,
      [society_id]
    );

    res.status(200).json({
      success: true,
      message: "Event requests fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching event requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event requests",
      error: error.message,
    });
  }
};

/* ============================================================
   GET EVENT REQUEST STATUS HISTORY (For Society Owner)
   ============================================================ */
const getEventRequestStatusHistory = async (req, res) => {
  try {
    const { event_req_id } = req.params;

    if (!event_req_id || isNaN(event_req_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid event request ID is required"
      });
    }

    // Verify the user is the society owner
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Check if user is the society owner
    const [eventRows] = await pool.query(
      `SELECT er.society_id, s.user_id 
       FROM event_req er
       JOIN societies s ON er.society_id = s.society_id
       WHERE er.req_id = ?`,
      [event_req_id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event request not found"
      });
    }

    if (eventRows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the society owner can view status history"
      });
    }

    // Get status history
    const [historyRows] = await pool.query(
      `SELECT 
        esh.history_id,
        esh.event_req_id,
        esh.status_id,
        esh.remarks,
        esh.changed_at,
        ss.status_name,
        ss.description as status_description,
        st.firstName,
        st.lastName,
        st.email,
        st.RollNO,
        r.role_name,
        r.display_name as role_display_name
       FROM event_status_history esh
       LEFT JOIN society_statuses ss ON esh.status_id = ss.status_id
       LEFT JOIN students st ON esh.changed_by = st.id
       LEFT JOIN roles r ON st.role_id = r.role_id
       WHERE esh.event_req_id = ?
       ORDER BY esh.changed_at ASC`,
      [event_req_id]
    );

    res.status(200).json({
      success: true,
      message: "Event request status history retrieved successfully",
      data: historyRows
    });

  } catch (error) {
    console.error("Error fetching event request status history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event request status history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   APPROVE EVENT REQUEST (VC Final Approval)
   ============================================================ */
const approveEventRequest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { changed_by } = req.body;

    if (!id || isNaN(id))
      return res.status(400).json({ success: false, message: "Valid event request ID is required" });
    if (!changed_by || isNaN(changed_by))
      return res.status(400).json({ success: false, message: "Valid changed_by user ID is required" });

    await connection.query("START TRANSACTION");

    const [requestRows] = await connection.query("SELECT * FROM event_req WHERE req_id = ?", [id]);
    if (requestRows.length === 0) {
      await connection.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Event request not found" });
    }

    const request = requestRows[0];

    // Add to events table
    const [insertResult] = await connection.query(
      `
      INSERT INTO events (req_id, society_id, title, description, event_date, event_time, venue, created_at, status_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `,
      [
        request.req_id,
        request.society_id,
        request.title,
        request.description,
        request.event_date,
        request.event_time,
        request.venue,
        6, // VC Approved
      ]
    );

    await connection.query("UPDATE event_req SET status_id = 6, updated_at = NOW() WHERE req_id = ?", [id]);

    // Record history entry
    await connection.query(
      "INSERT INTO event_status_history (event_req_id, status_id, changed_by, remarks, changed_at) VALUES (?, ?, ?, ?, NOW())",
      [id, 6, changed_by, "Event request approved (legacy VC flow)"]
    );
    await connection.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "VC approved the event request and it has been added to events table.",
      data: { event_id: insertResult.insertId },
    });
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error("❌ Error approving event request:", error);
    res.status(500).json({ success: false, message: "Error approving event request", error: error.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   ROLE-BASED REVIEWS (Board Secretary → Board President → Registrar → VC)
   ============================================================ */
const boardSecretaryReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;
  const newStatus = action === "approve" ? 2 : 3; // 2 = Approved by Board Secretary, 3 = Rejected by Board Secretary
  await updateEventStatusFlow(id, newStatus, note, changed_by, "Board Secretary", res, 1);
};

const boardPresidentReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;
  const newStatus = action === "approve" ? 4 : 5; // 4 = Approved by Board President, 5 = Rejected by Board President
  await updateEventStatusFlow(id, newStatus, note, changed_by, "Board President", res, 2);
};

// Legacy: Board (same as Board Secretary)
const boardReviewEvent = async (req, res) => {
  return boardSecretaryReviewEvent(req, res);
};

const registrarReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;
  const newStatus = action === "approve" ? 6 : 7; // 6 = Approved by Registrar, 7 = Rejected by Registrar
  await updateEventStatusFlow(id, newStatus, note, changed_by, "Registrar", res, 4);
};

const vcReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;

  if (action === "approve") {
    // VC approval sets status to 8, then auto-sets to 10 (Active)
    const newStatus = 8; // 8 = Approved by VC
    await updateEventStatusFlow(id, newStatus, note, changed_by, "VC", res, 6, true);
  } else {
    const newStatus = 9; // 9 = Rejected by VC
    await updateEventStatusFlow(id, newStatus, note, changed_by, "VC", res, 6);
  }
};

/* ============================================================
   Helper Function for Role-based Reviews
   ============================================================ */
const updateEventStatusFlow = async (id, newStatus, note, changed_by, role, res, expectedCurrentStatus, setActiveAfterVC = false) => {
  const connection = await pool.getConnection();
  try {
    await connection.query("START TRANSACTION");

    const [exists] = await connection.query("SELECT req_id, status_id FROM event_req WHERE req_id = ?", [id]);
    if (exists.length === 0) {
      await connection.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Event request not found" });
    }

    const currentStatus = exists[0].status_id;

    // Validate that current status matches expected status for this role
    if (expectedCurrentStatus && currentStatus !== expectedCurrentStatus) {
      await connection.query("ROLLBACK");
      const [currentStatusRow] = await connection.query(
        "SELECT status_name FROM society_statuses WHERE status_id = ?",
        [currentStatus]
      );
      return res.status(400).json({
        success: false,
        message: `Invalid status. Event request is currently "${currentStatusRow[0]?.status_name || 'Unknown'}" and cannot be reviewed by ${role}.`
      });
    }

    let finalStatusId = newStatus;

    await connection.query(
      "UPDATE event_req SET status_id = ?, note = ?, updated_at = NOW() WHERE req_id = ?",
      [newStatus, note || null, id]
    );

    // Add entry to event status history
    await connection.query(
      "INSERT INTO event_status_history (event_req_id, status_id, changed_by, remarks, changed_at) VALUES (?, ?, ?, ?, NOW())",
      [id, newStatus, changed_by, note || null]
    );

    // If VC approved (status_id = 8), automatically set to Active (10)
    if (setActiveAfterVC && newStatus === 8) {
      await connection.query(
        "UPDATE event_req SET status_id = 10, updated_at = NOW() WHERE req_id = ?",
        [id]
      );
      finalStatusId = 10;
      
      // Add Active status to history
      await connection.query(
        "INSERT INTO event_status_history (event_req_id, status_id, changed_by, remarks, changed_at) VALUES (?, 10, ?, 'Automatically set to Active after VC approval', NOW())",
        [id, changed_by]
      );
    }

    await connection.query("COMMIT");

    const statusText = [2, 4, 6, 8, 10].includes(finalStatusId) ? "approved" : "rejected";
    res.status(200).json({
      success: true,
      message: `${role} has ${statusText} the event request successfully.`,
      data: { req_id: parseInt(id), status_id: finalStatusId, note: note || null },
    });
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error(`❌ Error in ${role} review:`, error);
    res.status(500).json({ success: false, message: `Error during ${role} review`, error: error.message });
  } finally {
    connection.release();
  }
};

/* ============================================================
   EXPORT MODULES
   ============================================================ */
module.exports = {
  getAllEventRequests,
  getEventRequestById,
  createEventRequest,
  getEventRequestsBySociety,
  getEventRequestStatusHistory,
  boardReviewEvent,
  boardSecretaryReviewEvent,
  boardPresidentReviewEvent,
  registrarReviewEvent,
  vcReviewEvent,
  approveEventRequest,
};
