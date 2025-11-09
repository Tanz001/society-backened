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
          er.event_date AS date,
          er.event_time AS time,
          er.venue AS location,
          er.status_id,
          ss.status_name,
          s.name AS society_name
        FROM event_req er
        LEFT JOIN society_statuses ss ON er.status_id = ss.status_id
        LEFT JOIN societies s ON er.society_id = s.society_id
      `;
  
      // ✅ Role-based status filter
      let statusIds = [];
      switch (role?.toLowerCase()) {
        case "society_board":
          statusIds = [1, 2, 3];
          break;
        case "registrar":
          statusIds = [2, 4, 5];
          break;
        case "vc":
          statusIds = [4, 6, 7];
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid or missing role. Provide a valid role in body or user object.",
          });
      }
  
      // ✅ Add WHERE clause dynamically
      const placeholders = statusIds.map(() => "?").join(",");
      query += ` WHERE er.status_id IN (${placeholders}) ORDER BY er.created_at DESC`;
  
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
  
    try {
      if (!submitted_by) {
        return res.status(400).json({ success: false, message: "submitted_by is required" });
      }
  
      const [result] = await pool.query(
        `
        INSERT INTO event_req 
        (society_id, submitted_by, title, description, event_date, event_time, venue, status_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `,
        [society_id, submitted_by, title, description, event_date, event_time, venue]
      );
  
      res.status(201).json({ success: true, message: "Event request created successfully", result });
    } catch (error) {
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
        er.created_at,
        ss.status_name
      FROM event_req er
      JOIN society_statuses ss ON er.status_id = ss.status_id
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
   ROLE-BASED REVIEWS (Board → Registrar → VC)
   ============================================================ */
const boardReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;
  const newStatus = action === "approve" ? 2 : 3; // 2 = Board Approved, 3 = Rejected
  await updateEventStatusFlow(id, newStatus, note, changed_by, "Board", res);
};

const registrarReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;
  const newStatus = action === "approve" ? 4 : 5; // 4 = Registrar Approved, 5 = Rejected
  await updateEventStatusFlow(id, newStatus, note, changed_by, "Registrar", res);
};

const vcReviewEvent = async (req, res) => {
  const { id } = req.params;
  const { action, note, changed_by } = req.body;

  if (action === "approve") {
    return await approveEventRequest(req, res);
  }

  const newStatus = 7; // VC Rejected
  await updateEventStatusFlow(id, newStatus, note, changed_by, "VC", res);
};

/* ============================================================
   Helper Function for Role-based Reviews
   ============================================================ */
const updateEventStatusFlow = async (id, newStatus, note, changed_by, role, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.query("START TRANSACTION");

    const [exists] = await connection.query("SELECT req_id FROM event_req WHERE req_id = ?", [id]);
    if (exists.length === 0) {
      await connection.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Event request not found" });
    }

    await connection.query(
      "UPDATE event_req SET status_id = ?, note = ?, updated_at = NOW() WHERE req_id = ?",
      [newStatus, note || null, id]
    );

    await connection.query("COMMIT");

    const statusText = [2, 4, 6].includes(newStatus) ? "approved" : "rejected";
    res.status(200).json({
      success: true,
      message: `${role} has ${statusText} the event request successfully.`,
      data: { req_id: parseInt(id), status_id: newStatus, note: note || null },
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
  boardReviewEvent,
  registrarReviewEvent,
  vcReviewEvent,
  approveEventRequest,
};
