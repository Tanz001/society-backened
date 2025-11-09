// controllers/admin/adminControllers.js
const pool = require("../../database/db.js");
const bcrypt = require("bcryptjs");

// Get society by ID for admin review
const getSocietyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid society ID is required"
      });
    }

    console.log(`Admin requesting society with ID: ${id}`);

    // Get society details with status information
    const [societyRows] = await pool.query(`
      SELECT s.*, ss.status_name, ss.description as status_description
      FROM societies s 
      LEFT JOIN society_statuses ss ON s.status_id = ss.status_id 
      WHERE s.society_id = ?
    `, [id]);

    if (societyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Society not found"
      });
    }

    const society = societyRows[0];

    // Get achievements for this society
    const [achievementRows] = await pool.query(
      'SELECT * FROM achievements WHERE society_id = ?',
      [id]
    );

    // Get events for this society
    const [eventRows] = await pool.query(
      'SELECT * FROM events WHERE society_id = ? ORDER BY event_date ASC',
      [id]
    );

    // Get student information who created this society
    const [studentRows] = await pool.query(
      'SELECT firstName, lastName, email, rollNo, university, major FROM students WHERE id = ?',
      [society.user_id]
    );

    // Get status history for this society
    const [historyRows] = await pool.query(`
      SELECT ssh.*, ss.status_name, st.firstName, st.lastName
      FROM society_status_history ssh
      LEFT JOIN society_statuses ss ON ssh.status_id = ss.status_id
      LEFT JOIN students st ON ssh.changed_by = st.id
      WHERE ssh.society_id = ?
      ORDER BY ssh.changed_at DESC
    `, [id]);

    const processedSociety = {
      society_id: society.society_id,
      name: society.name,
      description: society.description,
      category: society.category,
      location: society.location,
      advisor: society.advisor,
      purpose: society.purpose,
      logo_path: society.society_logo,
      cover_image_path: society.cover_photo,
      status_id: society.status_id,
      status_name: society.status_name,
      status_description: society.status_description,
      note: society.note,
      created_at: society.created_at ? new Date(society.created_at).toISOString().split('T')[0] : null,
      updated_at: society.updated_at ? new Date(society.updated_at).toISOString().split('T')[0] : null,
      achievements: achievementRows,
      events: eventRows,
      student_info: studentRows[0] || null,
      status_history: historyRows
    };

    res.status(200).json({
      success: true,
      message: "Society details retrieved successfully",
      data: processedSociety
    });

  } catch (error) {
    console.error("Error fetching society by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching society details",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



// Update society status with notes and history tracking
const updateSocietyStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status_id, note, changed_by } = req.body;
  
      // Validate input
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid society ID is required"
        });
      }

      if (!status_id || isNaN(status_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid status ID is required"
        });
      }

      if (!changed_by || isNaN(changed_by)) {
        return res.status(400).json({
          success: false,
          message: "Valid changed_by user ID is required"
        });
      }
  
      console.log(`Updating society ${id} to status ${status_id} by user ${changed_by}`);
  
      // Start transaction
      await pool.query('START TRANSACTION');
  
      try {
        // First, check if society exists and get current status
        const [societyRows] = await pool.query(
          "SELECT society_id, status_id, user_id FROM societies WHERE society_id = ?",
          [id]
        );
  
        if (societyRows.length === 0) {
          await pool.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: "Society not found"
          });
        }
  
        const currentStatus = societyRows[0].status_id;
        const societyUserId = societyRows[0].user_id;

        // Validate that the status exists in the database
        const [statusCheck] = await pool.query(
          "SELECT status_id FROM society_statuses WHERE status_id = ?",
          [status_id]
        );

        if (statusCheck.length === 0) {
          await pool.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: "Invalid status ID. Status does not exist."
          });
        }

        // Note: Admin endpoint allows flexible status changes for administrative purposes
        // Role-specific endpoints (board, registrar, vc) still enforce workflow validation
  
        // Update society status and note
        const [updateResult] = await pool.query(
          "UPDATE societies SET status_id = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE society_id = ?",
          [status_id, note || null, id]
        );
  
        if (updateResult.affectedRows === 0) {
          await pool.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: "Failed to update society"
          });
        }

        // Add entry to status history
        await pool.query(
          "INSERT INTO society_status_history (society_id, status_id, changed_by, remarks, changed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
          [id, status_id, changed_by, note || null]
        );

        // If status is "Approved by VC" (status_id = 6), mark user as society owner
        if (status_id === 6) {
          await pool.query(
            "UPDATE students SET society_owner = 1 WHERE id = ?",
            [societyUserId]
          );
        }
  
        // Commit transaction
        await pool.query('COMMIT');

        // Get status name for response
        const [statusRows] = await pool.query(
          "SELECT status_name FROM society_statuses WHERE status_id = ?",
          [status_id]
        );
  
        res.json({
          success: true,
          message: "Society status updated successfully",
          data: {
            society_id: parseInt(id),
            status_id: status_id,
            status_name: statusRows[0]?.status_name || 'Unknown',
            note: note || null
          }
        });
  
      } catch (transactionError) {
        await pool.query('ROLLBACK');
        throw transactionError;
      }
  
    } catch (error) {
      console.error("Error updating society status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while updating society status",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
};

// Society Board: Approve or Reject (status 1 -> 2 or 3)
const boardUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note, changed_by } = req.body; // action: 'approve' or 'reject'
    
    const status_id = action === 'approve' ? 2 : 3; // 2: Approved by Society Board, 3: Rejected by Society Board
    
    await updateSocietyStatusInternal(id, status_id, note, changed_by, res, 'Society Board');
  } catch (error) {
    console.error("Error in board status update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Registrar: Approve or Reject (status 2 -> 4 or 5)
const registrarUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note, changed_by } = req.body; // action: 'approve' or 'reject'
    
    const status_id = action === 'approve' ? 4 : 5; // 4: Approved by Registrar, 5: Rejected by Registrar
    
    await updateSocietyStatusInternal(id, status_id, note, changed_by, res, 'Registrar');
  } catch (error) {
    console.error("Error in registrar status update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Vice Chancellor: Approve or Reject (status 4 -> 6 or 7)
const vcUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note, changed_by } = req.body; // action: 'approve' or 'reject'
    
    const status_id = action === 'approve' ? 6 : 7; // 6: Approved by VC, 7: Rejected by VC
    
    await updateSocietyStatusInternal(id, status_id, note, changed_by, res, 'Vice Chancellor');
  } catch (error) {
    console.error("Error in VC status update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Internal helper function for status updates
const updateSocietyStatusInternal = async (id, status_id, note, changed_by, res, role) => {
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Valid society ID is required"
    });
  }

  if (!changed_by || isNaN(changed_by)) {
    return res.status(400).json({
      success: false,
      message: "Valid changed_by user ID is required"
    });
  }

  await pool.query('START TRANSACTION');

  try {
    // Check if society exists and get current status
    const [societyRows] = await pool.query(
      "SELECT society_id, status_id, user_id FROM societies WHERE society_id = ?",
      [id]
    );

    if (societyRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Society not found"
      });
    }

    const currentStatus = societyRows[0].status_id;
    const societyUserId = societyRows[0].user_id;

    // Validate status transition
    if (!isValidStatusTransition(currentStatus, status_id)) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Invalid status transition for ${role}`
      });
    }

    // Update society status and note
    await pool.query(
      "UPDATE societies SET status_id = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE society_id = ?",
      [status_id, note || null, id]
    );

    // Add entry to status history
    await pool.query(
      "INSERT INTO society_status_history (society_id, status_id, changed_by, remarks, changed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [id, status_id, changed_by, note || null]
    );

    // If status is "Approved by VC" (status_id = 6), mark user as society owner
    if (status_id === 6) {
      await pool.query(
        "UPDATE students SET society_owner = 1 WHERE id = ?",
        [societyUserId]
      );
    }

    await pool.query('COMMIT');

    // Get status name for response
    const [statusRows] = await pool.query(
      "SELECT status_name FROM society_statuses WHERE status_id = ?",
      [status_id]
    );

    res.json({
      success: true,
      message: `Society status updated successfully by ${role}`,
      data: {
        society_id: parseInt(id),
        status_id: status_id,
        status_name: statusRows[0]?.status_name || 'Unknown',
        note: note || null
      }
    });

  } catch (transactionError) {
    await pool.query('ROLLBACK');
    throw transactionError;
  }
};

// Validation function for status transitions
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    1: [2, 3], // Pending -> Approved by Board or Rejected by Board
    2: [4, 5], // Approved by Board -> Approved by Registrar or Rejected by Registrar
    4: [6, 7], // Approved by Registrar -> Approved by VC or Rejected by VC
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Get all status options
const getAllStatuses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM society_statuses ORDER BY status_id");
    
    res.json({
      success: true,
      statuses: rows
    });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statuses"
    });
  }
};

// Get society status history
const getSocietyStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid society ID is required"
      });
    }

    const [rows] = await pool.query(`
      SELECT ssh.*, ss.status_name, st.firstName, st.lastName, st.email
      FROM society_status_history ssh
      LEFT JOIN society_statuses ss ON ssh.status_id = ss.status_id
      LEFT JOIN students st ON ssh.changed_by = st.id
      WHERE ssh.society_id = ?
      ORDER BY ssh.changed_at DESC
    `, [id]);
    
    res.json({
      success: true,
      history: rows
    });
  } catch (error) {
    console.error("Error fetching society status history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching status history"
    });
  }
};
const getSocietiesByRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required in request body"
      });
    }

    let statusIds = [];

    // Determine which statuses each role can access
    switch (role.toLowerCase()) {
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
          message: "Invalid role provided. Use 'society_board', 'registrar', or 'vc'."
        });
    }

    const placeholders = statusIds.map(() => '?').join(',');
    const sql = `
      SELECT s.*, ss.status_name, ss.description AS status_description,
             st.firstName, st.lastName, st.email, st.rollNo
      FROM societies s
      LEFT JOIN society_statuses ss ON s.status_id = ss.status_id
      LEFT JOIN students st ON s.user_id = st.id
      WHERE s.status_id IN (${placeholders})
      ORDER BY s.created_at DESC
    `;

    const [rows] = await pool.query(sql, statusIds);

    const societies = rows.map(soc => ({
      society_id: soc.society_id,
      name: soc.name,
      description: soc.description,
      category: soc.category,
      location: soc.location,
      advisor: soc.advisor,
      purpose: soc.purpose,
      society_logo: soc.society_logo,
      cover_photo: soc.cover_photo,
      status_id: soc.status_id,
      status_name: soc.status_name,
      status_description: soc.status_description,
      note: soc.note,
      created_at: soc.created_at ? new Date(soc.created_at).toISOString().split('T')[0] : null,
      updated_at: soc.updated_at ? new Date(soc.updated_at).toISOString().split('T')[0] : null,
      student_info: {
        firstName: soc.firstName,
        lastName: soc.lastName,
        email: soc.email,
        rollNo: soc.rollNo
      }
    }));

    return res.json({
      success: true,
      message: `Societies retrieved successfully for role: ${role}`,
      societies
    });

  } catch (error) {
    console.error("Error fetching societies by role:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching societies by role"
    });
  }
};

// Get all societies for admin (no role filter)
const getAllSocietiesAdmin = async (req, res) => {
  try {
    // Determine the primary key column name for societies table
    let societyIdCol = 'id';
    try {
      const [pkCols] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'societies' 
        AND TABLE_SCHEMA = DATABASE()
        AND COLUMN_KEY = 'PRI'
        LIMIT 1
      `);
      if (pkCols.length > 0) {
        societyIdCol = pkCols[0].COLUMN_NAME;
      }
    } catch (e) {
      // If we can't determine, assume it's either id or society_id
      // Try to use id first, code will handle errors
    }
    
    const sql = `
      SELECT s.*, ss.status_name, ss.description AS status_description,
             st.firstName, st.lastName, st.email, st.rollNo
      FROM societies s
      LEFT JOIN society_statuses ss ON s.status_id = ss.status_id
      LEFT JOIN students st ON s.user_id = st.id
      ORDER BY s.created_at DESC
    `;

    const [rows] = await pool.query(sql);

    // Get achievements and events for each society
    const societies = await Promise.all(rows.map(async (soc) => {
      // Use the actual primary key value (could be id or society_id)
      const societyId = soc[societyIdCol] || soc.id || soc.society_id;
      
      const [achievementRows] = await pool.query(
        'SELECT * FROM achievements WHERE society_id = ?',
        [societyId]
      );
      
      const [eventRows] = await pool.query(
        'SELECT * FROM events WHERE society_id = ? ORDER BY event_date ASC',
        [societyId]
      );

      return {
        society_id: societyId,
        name: soc.name,
        description: soc.description,
        category: soc.category,
        location: soc.location,
        advisor: soc.advisor,
        purpose: soc.purpose,
        society_logo: soc.society_logo || soc.logo_path,
        cover_photo: soc.cover_photo || soc.cover_image_path,
        status_id: soc.status_id,
        status_name: soc.status_name,
        status_description: soc.status_description,
        note: soc.note,
        created_at: soc.created_at ? new Date(soc.created_at).toISOString().split('T')[0] : null,
        updated_at: soc.updated_at ? new Date(soc.updated_at).toISOString().split('T')[0] : null,
        student_info: {
          firstName: soc.firstName,
          lastName: soc.lastName,
          email: soc.email,
          rollNo: soc.rollNo
        },
        achievements: achievementRows.map(a => a.achievement),
        events: eventRows
      };
    }));

    return res.json({
      success: true,
      message: "Societies retrieved successfully",
      societies
    });

  } catch (error) {
    console.error("Error fetching all societies:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching all societies"
    });
  }
};

// Delete a society
const deleteSociety = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid society ID is required"
      });
    }

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      // Check if society exists
      const [societyRows] = await pool.query(
        "SELECT society_id FROM societies WHERE society_id = ?",
        [id]
      );

      if (societyRows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: "Society not found"
        });
      }

      // Delete related records first (due to foreign key constraints)
      await pool.query("DELETE FROM achievements WHERE society_id = ?", [id]);
      await pool.query("DELETE FROM events WHERE society_id = ?", [id]);
      await pool.query("DELETE FROM society_status_history WHERE society_id = ?", [id]);
      await pool.query("DELETE FROM event_req WHERE society_id = ?", [id]);
      
      // Delete the society
      await pool.query("DELETE FROM societies WHERE society_id = ?", [id]);

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: "Society deleted successfully"
      });

    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error("Error deleting society:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting society",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all events for admin
const getAllEventsAdmin = async (req, res) => {
  try {
    console.log("Fetching all events for admin...");
    
    // Query events table - using event_id as primary key (not id)
    let rows = [];
    try {
      const sql = `
        SELECT 
          event_id,
          society_id,
          title,
          description,
          event_date
        FROM events
        ORDER BY event_date DESC
      `;
      const [result] = await pool.query(sql);
      rows = result;
      console.log(`Found ${rows.length} events in database`);
    } catch (simpleError) {
      console.error("Error querying events table:", simpleError.message);
      // Check if events table exists
      if (simpleError.code === 'ER_NO_SUCH_TABLE' || simpleError.message.includes("doesn't exist")) {
        console.log("Events table does not exist, returning empty array");
        return res.json({
          success: true,
          message: "Events retrieved successfully",
          events: []
        });
      }
      throw simpleError;
    }

    // Build events array with society names
    const events = [];
    for (const event of rows) {
      let eventObj = {
        id: event.event_id, // Use event_id as id
        req_id: null,
        society_id: event.society_id,
        society_name: 'Unknown Society',
        title: event.title || '',
        description: event.description || '',
        event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : null,
        event_time: null,
        venue: null,
        status_id: null,
        status_name: 'Pending',
        created_at: null // events table doesn't have created_at
      };

      // Get society name
      if (event.society_id) {
        try {
          // Try with id first (most common)
          let [socRows] = await pool.query(
            'SELECT name FROM societies WHERE id = ? LIMIT 1',
            [event.society_id]
          );
          
          // If that doesn't work, try with society_id
          if (socRows.length === 0) {
            [socRows] = await pool.query(
              'SELECT name FROM societies WHERE society_id = ? LIMIT 1',
              [event.society_id]
            );
          }
          
          if (socRows.length > 0) {
            eventObj.society_name = socRows[0].name;
          }
        } catch (e) {
          console.log("Could not fetch society name for society_id " + event.society_id + ":", e.message);
        }
      }

      events.push(eventObj);
    }

    console.log(`Returning ${events.length} events`);
    return res.json({
      success: true,
      message: "Events retrieved successfully",
      events
    });

  } catch (error) {
    console.error("Error fetching all events - Full error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error fetching all events",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all students for admin
const getAllStudentsAdmin = async (req, res) => {
  try {
    console.log("Fetching all students for admin...");
    
    // Query students table - using createdAt (not created_at) and no updated_at
    const sql = `
      SELECT 
        id,
        firstName,
        lastName,
        email,
        phone,
        RollNO,
        university,
        major,
        degree,
        semester,
        admin,
        society_owner,
        role,
        createdAt
      FROM students
      ORDER BY createdAt DESC
    `;

    let rows = [];
    try {
      const [result] = await pool.query(sql);
      rows = result;
      console.log(`Found ${rows.length} students in database`);
    } catch (error) {
      console.error("Error with students query:", error.message);
      throw error;
    }

    // Map students to response format
    const students = rows.map(student => ({
      id: student.id,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      phone: student.phone || '',
      rollNo: student.RollNO || '',
      university: student.university || '',
      major: student.major || '',
      degree: student.degree || '',
      semester: student.semester || '',
      admin: student.admin !== undefined && student.admin !== null ? (student.admin ? 1 : 0) : 0,
      society_owner: student.society_owner !== undefined && student.society_owner !== null ? (student.society_owner ? 1 : 0) : 0,
      role: student.role || 'student',
      created_at: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : null,
      updated_at: null // students table doesn't have updated_at
    }));

    console.log(`Returning ${students.length} students`);
    return res.json({
      success: true,
      message: "Students retrieved successfully",
      students
    });

  } catch (error) {
    console.error("Error fetching all students - Full error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error fetching all students",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete a student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid student ID is required"
      });
    }

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      // Check if student exists
      const [studentRows] = await pool.query(
        "SELECT id, admin FROM students WHERE id = ?",
        [id]
      );

      if (studentRows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Prevent deletion of admin accounts
      if (studentRows[0].admin === 1) {
        await pool.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: "Cannot delete admin accounts"
        });
      }

      // Get all societies owned by this student
      const [societies] = await pool.query(
        "SELECT society_id FROM societies WHERE user_id = ?",
        [id]
      );

      // Delete societies and their related data
      for (const society of societies) {
        const societyId = society.society_id;
        await pool.query("DELETE FROM achievements WHERE society_id = ?", [societyId]);
        await pool.query("DELETE FROM events WHERE society_id = ?", [societyId]);
        await pool.query("DELETE FROM society_status_history WHERE society_id = ?", [societyId]);
        await pool.query("DELETE FROM event_req WHERE society_id = ?", [societyId]);
        await pool.query("DELETE FROM societies WHERE society_id = ?", [societyId]);
      }

      // Delete student memberships (if there's a memberships table)
      // await pool.query("DELETE FROM memberships WHERE student_id = ?", [id]);

      // Delete the student
      await pool.query("DELETE FROM students WHERE id = ?", [id]);

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: "Student deleted successfully"
      });

    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting student",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create advisor account (same as student registration but with role='advisor')
const createAdvisor = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      rollNo, 
      university, 
      major, 
      degree, 
      semester, 
      password 
    } = req.body;
    
    console.log("Advisor registration attempt:", { firstName, lastName, email, rollNo, university });
    
    // Basic validation
    if (!firstName || !lastName || !email || !phone || !rollNo || 
        !university || !major || !degree || !semester || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Hash password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Try to add 'advisor' to the role ENUM if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE students 
        MODIFY COLUMN role ENUM('student','society_board','registrar','vc','admin','advisor') 
        DEFAULT 'student'
      `);
      console.log("Successfully added 'advisor' to role ENUM");
    } catch (alterError) {
      // If the enum already has advisor or if the alter fails, that's okay
      // We'll try to insert with 'advisor' and if it fails, use 'society_board'
      console.log("Note: Could not modify role ENUM (may already include advisor):", alterError.message);
    }
    
    // Try to insert with 'advisor' role first
    let result;
    let advisorRole = 'advisor';
    try {
      [result] = await pool.query(
        `INSERT INTO students (
          firstName, lastName, email, phone, RollNO, university, major, degree, semester, password, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, phone, rollNo, university, major, degree, semester, hashedPassword, 'advisor']
      );
    } catch (insertError) {
      // If 'advisor' is not in the enum, use 'society_board' as fallback
      if (insertError.code === 'ER_DATA_TOO_LONG' || insertError.message.includes('advisor')) {
        console.log("'advisor' not in ENUM, using 'society_board' instead");
        advisorRole = 'society_board';
        [result] = await pool.query(
          `INSERT INTO students (
            firstName, lastName, email, phone, RollNO, university, major, degree, semester, password, role
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [firstName, lastName, email, phone, rollNo, university, major, degree, semester, hashedPassword, 'society_board']
        );
      } else {
        throw insertError;
      }
    }

    console.log("Advisor registered successfully:", { firstName, lastName, email, rollNo });

    res.status(201).json({
      success: true,
      message: "Advisor registered successfully",
      data: { 
        id: result.insertId,
        firstName, 
        lastName, 
        email, 
        rollNo, 
        university, 
        major,
        phone,
        degree,
        semester,
        role: advisorRole
      }
    });

  } catch (error) {
    console.error("Error registering advisor:", error);
    
    // Handle duplicate email or rollNo
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: "Email or Roll Number already exists"
      });
    }

    // Handle case where role column doesn't exist
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('role')) {
      // Try to add the role column
      try {
        await pool.query("ALTER TABLE students ADD COLUMN role VARCHAR(50) DEFAULT 'student'");
        // Retry the insert with a new query
        try {
          const [retryResult] = await pool.query(
            `INSERT INTO students (
              firstName, lastName, email, phone, RollNO, university, major, degree, semester, password, role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, phone, rollNo, university, major, degree, semester, hashedPassword, 'society_board']
          );
          
          return res.status(201).json({
            success: true,
            message: "Advisor registered successfully",
            data: { 
              id: retryResult.insertId,
              firstName, 
              lastName, 
              email, 
              rollNo, 
              university, 
              major,
              phone,
              degree,
              semester,
              role: 'advisor'
            }
          });
        } catch (retryError) {
          return res.status(500).json({
            success: false,
            message: "Error registering advisor after adding role column",
            error: process.env.NODE_ENV === 'development' ? retryError.message : undefined
          });
        }
      } catch (alterError) {
        return res.status(500).json({
          success: false,
          message: "Database error: role column could not be added",
          error: process.env.NODE_ENV === 'development' ? alterError.message : undefined
        });
      }
    }

    if (error.code === 'ER_BAD_NULL_ERROR') {
      return res.status(400).json({
        success: false,
        message: "Some required fields are missing or invalid"
      });
    }

    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({
        success: false,
        message: "Some fields exceed the maximum allowed length"
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while registering advisor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSocietyById,
  updateSocietyStatus,
  boardUpdateStatus,
  registrarUpdateStatus,
  vcUpdateStatus,
  getAllStatuses,
  getSocietyStatusHistory,
  getSocietiesByRole,
  getAllSocietiesAdmin,
  deleteSociety,
  getAllEventsAdmin,
  getAllStudentsAdmin,
  deleteStudent,
  createAdvisor
}; 