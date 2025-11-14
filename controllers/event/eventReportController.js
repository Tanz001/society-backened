const pool = require("../../database/db.js");

/* ============================================================
   UPLOAD EVENT REPORT (Society Owner)
   ============================================================ */
const uploadEventReport = async (req, res) => {
  try {
    const { event_req_id, report_title, report_description } = req.body;
    const uploaded_by = req.user?.id;

    if (!event_req_id || !report_title) {
      return res.status(400).json({
        success: false,
        message: "Event request ID and report title are required"
      });
    }

    if (!uploaded_by) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Report file is required"
      });
    }

    // Check if event request exists and is in Active status (10)
    const [eventRows] = await pool.query(
      "SELECT req_id, status_id, society_id FROM event_req WHERE req_id = ?",
      [event_req_id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event request not found"
      });
    }

    const event = eventRows[0];

    // Verify user is the society owner
    const [societyRows] = await pool.query(
      "SELECT user_id FROM societies WHERE society_id = ?",
      [event.society_id]
    );

    if (societyRows.length === 0 || societyRows[0].user_id !== uploaded_by) {
      return res.status(403).json({
        success: false,
        message: "Only the society owner can upload reports for this event"
      });
    }

    // Check if event is Active (status 10)
    if (event.status_id !== 10) {
      return res.status(400).json({
        success: false,
        message: "Reports can only be uploaded for Active events (approved by VC)"
      });
    }

    // Get file path (relative to assets folder)
    // Convert Windows path to forward slashes and ensure it starts with 'assets/'
    let filePath = req.file.path.replace(/\\/g, '/');
    // Extract path from assets folder onwards
    const assetsIndex = filePath.indexOf('assets/');
    if (assetsIndex !== -1) {
      filePath = filePath.substring(assetsIndex);
    } else {
      // If assets not found, assume it's already relative
      filePath = 'assets/' + filePath.split('/').pop();
    }

    // Insert report into database
    const [result] = await pool.query(
      `INSERT INTO event_reports 
       (event_req_id, uploaded_by, report_title, report_description, report_file) 
       VALUES (?, ?, ?, ?, ?)`,
      [event_req_id, uploaded_by, report_title, report_description || null, filePath]
    );

    // Update event status to Complete (11)
    await pool.query(
      "UPDATE event_req SET status_id = 11, updated_at = NOW() WHERE req_id = ?",
      [event_req_id]
    );

    // Insert into events table if not already present
    await pool.query(
      `INSERT INTO events (society_id, title, description, event_date)
       SELECT 
         er.society_id,
         er.title,
         er.description,
         er.event_date
       FROM event_req er
       WHERE er.req_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM events e 
           WHERE e.society_id = er.society_id 
             AND e.title = er.title 
             AND e.event_date = er.event_date
         )`,
      [event_req_id]
    );

    // Record history entry for completion
    await pool.query(
      "INSERT INTO event_status_history (event_req_id, status_id, changed_by, remarks, changed_at) VALUES (?, ?, ?, ?, NOW())",
      [
        event_req_id,
        11,
        uploaded_by,
        "Event report uploaded by society owner"
      ]
    );

    res.status(201).json({
      success: true,
      message: "Event report uploaded successfully",
      data: {
        report_id: result.insertId,
        event_req_id: parseInt(event_req_id),
        report_title,
        report_file: filePath
      }
    });

  } catch (error) {
    console.error("Error uploading event report:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading event report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   GET EVENT REPORTS BY EVENT REQUEST ID
   ============================================================ */
const getEventReportsByEventId = async (req, res) => {
  try {
    const { event_req_id } = req.params;

    const [reports] = await pool.query(
      `SELECT 
        er.report_id,
        er.event_req_id,
        er.report_title,
        er.report_description,
        er.report_file,
        er.submitted_at,
        er.updated_at,
        s.firstName,
        s.lastName,
        s.email,
        s.RollNO,
        ev.title AS event_title,
        ev.event_date,
        soc.name AS society_name
       FROM event_reports er
       LEFT JOIN students s ON er.uploaded_by = s.id
       LEFT JOIN event_req ev ON er.event_req_id = ev.req_id
       LEFT JOIN societies soc ON ev.society_id = soc.society_id
       WHERE er.event_req_id = ?
       ORDER BY er.submitted_at DESC`,
      [event_req_id]
    );

    res.json({
      success: true,
      message: "Event reports retrieved successfully",
      data: reports
    });

  } catch (error) {
    console.error("Error fetching event reports:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event reports",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   GET ALL EVENT REPORTS (For VC)
   ============================================================ */
const getAllEventReports = async (req, res) => {
  try {
    const [reports] = await pool.query(
      `SELECT 
        er.report_id,
        er.event_req_id,
        er.report_title,
        er.report_description,
        er.report_file,
        er.submitted_at,
        er.updated_at,
        s.firstName,
        s.lastName,
        s.email,
        s.RollNO,
        ev.title AS event_title,
        ev.event_date,
        ev.event_time,
        ev.venue,
        soc.name AS society_name,
        ss.status_name AS event_status
       FROM event_reports er
       LEFT JOIN students s ON er.uploaded_by = s.id
       LEFT JOIN event_req ev ON er.event_req_id = ev.req_id
       LEFT JOIN societies soc ON ev.society_id = soc.society_id
       LEFT JOIN society_statuses ss ON ev.status_id = ss.status_id
       ORDER BY er.submitted_at DESC`
    );

    res.json({
      success: true,
      message: "All event reports retrieved successfully",
      data: reports
    });

  } catch (error) {
    console.error("Error fetching all event reports:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event reports",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   GET EVENT REPORT BY ID
   ============================================================ */
const getEventReportById = async (req, res) => {
  try {
    const { report_id } = req.params;

    const [reports] = await pool.query(
      `SELECT 
        er.report_id,
        er.event_req_id,
        er.report_title,
        er.report_description,
        er.report_file,
        er.submitted_at,
        er.updated_at,
        s.firstName,
        s.lastName,
        s.email,
        s.RollNO,
        ev.title AS event_title,
        ev.description AS event_description,
        ev.event_date,
        ev.event_time,
        ev.venue,
        soc.name AS society_name,
        ss.status_name AS event_status
       FROM event_reports er
       LEFT JOIN students s ON er.uploaded_by = s.id
       LEFT JOIN event_req ev ON er.event_req_id = ev.req_id
       LEFT JOIN societies soc ON ev.society_id = soc.society_id
       LEFT JOIN society_statuses ss ON ev.status_id = ss.status_id
       WHERE er.report_id = ?`,
      [report_id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event report not found"
      });
    }

    res.json({
      success: true,
      message: "Event report retrieved successfully",
      data: reports[0]
    });

  } catch (error) {
    console.error("Error fetching event report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadEventReport,
  getEventReportsByEventId,
  getAllEventReports,
  getEventReportById
};

